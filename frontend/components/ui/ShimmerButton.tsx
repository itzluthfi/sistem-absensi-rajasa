import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

interface ShimmerButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function ShimmerButton({
  onPress,
  children,
  style,
  textStyle,
  disabled,
  isLoading,
}: ShimmerButtonProps) {
  const shimmerAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (disabled || isLoading) return;

    const startShimmer = () => {
      shimmerAnim.setValue(-150);
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 250,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(1000),
        ])
      ).start();
    };

    startShimmer();
  }, [disabled, isLoading]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        disabled && styles.buttonDisabled,
        isLoading && styles.buttonLoading,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      <View style={styles.contentContainer}>
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {/* Shimmer sweeping shine overlay */}
            {!disabled && (
              <Animated.View
                style={[
                  styles.shimmerLine,
                  {
                    transform: [
                      { translateX: shimmerAnim },
                      { skewX: '-30deg' },
                    ],
                  },
                ]}
              />
            )}
            {typeof children === 'string' ? (
              <Text style={[styles.text, textStyle]}>{children}</Text>
            ) : (
              children
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3B82F6', // fallback
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    // Neon glow shadow for futuristic look
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLoading: {
    backgroundColor: '#2563EB',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shimmerLine: {
    position: 'absolute',
    width: 60,
    height: '250%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    top: '-75%',
    left: 0,
    // Add glow to shimmer
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});
