import { BrandLogo } from "@/components/ScreenHeader";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export function InnerCircleAnimation() {
  return (
    <View style={styles.container}>
      <BrandLogo height={36} />
    </View>
  );
}

export function SpinningTextCircle() {
  const rotation = useSharedValue(0);
  const duration = 40000;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(rotation.value, [0, 1], [0, 360]);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  return (
    <Animated.View style={[{ position: "absolute" }, animatedStyle]}>
      <Image
        source={require("@/assets/icons/company/carlooploop.svg")}
        style={{ width: "100%", aspectRatio: 1, maxWidth: 400 }}
        contentFit="contain"
      />
    </Animated.View>
  );
}

export function AnimatedEntryCard({ children, delay = 200 }) {
  const transition = useSharedValue(0);

  useEffect(() => {
    transition.value = 0;
    transition.value = withDelay(
      delay,
      withTiming(1, {
        duration: 3000,
        easing: Easing.bezier(0.2, 0.9, 0.4, 1),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { translateY: interpolate(transition.value, [0, 1], [500, 140]) },
        { rotateZ: `${interpolate(transition.value, [0, 1], [-10, 0])}deg` },
        { scale: interpolate(transition.value, [0, 1], [0.9, 1]) },
      ],
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    height: 100,
  },
});
