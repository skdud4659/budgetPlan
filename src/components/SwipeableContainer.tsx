import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface SwipeableContainerProps {
  children: ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: ViewStyle;
}

const SWIPE_THRESHOLD = 50;

export default function SwipeableContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  style,
}: SwipeableContainerProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX * 0.15;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(onSwipeLeft)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
