import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";

interface SkeletonProps {
  style?: ViewStyle | ViewStyle[];
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

export default function Skeleton({
  style,
  width,
  height,
  borderRadius = 8,
}: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const customStyle: ViewStyle = {
    backgroundColor: "#E5E7EB",
    borderRadius,
  };

  if (width !== undefined) customStyle.width = width as any;
  if (height !== undefined) customStyle.height = height as any;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        customStyle,
        style,
        { opacity: pulseAnim },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
