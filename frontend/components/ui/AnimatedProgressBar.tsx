import { useEffect, useRef } from "react";
import { Animated, View, StyleProp, ViewStyle, StyleSheet } from "react-native";

interface AnimatedProgressBarProps {
  value: number; // 0 to 100
  color: string;
  duration?: number;
  containerStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
}

export default function AnimatedProgressBar({
  value,
  color,
  duration = 800,
  containerStyle,
  fillStyle,
}: AnimatedProgressBarProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(Math.max(value, 0), 100),
      duration: duration,
      useNativeDriver: false,
    }).start();
  }, [value, duration]);

  const widthInterpolated = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          styles.fill,
          { width: widthInterpolated, backgroundColor: color },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
