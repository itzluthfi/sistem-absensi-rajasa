import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FuturisticLoaderProps {
  size?: number;
  color?: string;
  glowColor?: string;
  text?: string;
}

export default function FuturisticLoader({
  size = 50,
  color = '#06B6D4', // Cyan
  glowColor = 'rgba(6, 182, 212, 0.4)',
  text,
}: FuturisticLoaderProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation (scale and opacity)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.loaderWrapper}>
        {/* Outer glowing pulsing circle */}
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: (size * 1.5) / 2,
              backgroundColor: glowColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Rotating ring */}
        <Animated.View
          style={[
            styles.rotatingRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Center icon */}
        <View
          style={[
            styles.centerIcon,
            {
              width: size * 0.7,
              height: size * 0.7,
              borderRadius: (size * 0.7) / 2,
            },
          ]}
        >
          <Ionicons name="finger-print-outline" size={size * 0.4} color={color} />
        </View>
      </View>

      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loaderWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    opacity: 0.15,
  },
  rotatingRing: {
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  centerIcon: {
    position: 'absolute',
    backgroundColor: '#0F172A', // Slate 900
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  text: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(6, 182, 212, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
