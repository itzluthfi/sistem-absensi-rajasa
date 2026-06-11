import { useEffect, useRef, useState } from "react";
import { Animated, Text, TextStyle, StyleProp } from "react-native";

interface AnimatedCounterProps {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  isPercentage?: boolean;
}

export default function AnimatedCounter({
  value,
  style,
  duration = 800,
  isPercentage = false,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const prevValueRef = useRef(0);

  useEffect(() => {
    animatedValue.setValue(prevValueRef.current);
    Animated.timing(animatedValue, {
      toValue: value,
      duration: duration,
      useNativeDriver: false,
    }).start();

    prevValueRef.current = value;

    const listenerId = animatedValue.addListener(({ value: latest }) => {
      setDisplayValue(Math.round(latest));
    });

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [value, duration]);

  return (
    <Text style={style}>
      {displayValue}
      {isPercentage ? "%" : ""}
    </Text>
  );
}
