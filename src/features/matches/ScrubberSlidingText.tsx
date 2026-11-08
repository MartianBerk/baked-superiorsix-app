import { useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

import {
  SCRUB_SHOOT_PX,
  SCRUB_SLIDE_MS,
  SCRUB_SLIDE_PX,
  type ScrubDirection,
} from './scrubberSlide';

type Props = {
  label: string;
  /** Direction of the scrub that produced this label; null snaps with no motion. */
  direction: ScrubDirection | null;
  /** `center` = current header; `mini` = destination preview in a side slot. */
  size?: 'center' | 'mini';
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  numberOfLines?: number;
};

const SHOOT_EASING = Easing.out(Easing.cubic);

function travelPx(size: 'center' | 'mini'): number {
  return size === 'mini' ? SCRUB_SHOOT_PX : SCRUB_SLIDE_PX;
}

function enterOffset(direction: ScrubDirection, size: 'center' | 'mini'): number {
  const px = travelPx(size);
  return direction === 'right' ? px : -px;
}

function exitOffset(direction: ScrubDirection, size: 'center' | 'mini'): number {
  const px = travelPx(size);
  return direction === 'right' ? -px : px;
}

function shootTiming() {
  return { duration: SCRUB_SLIDE_MS, easing: SHOOT_EASING };
}

/**
 * Scrubber label that shoots with the scrub direction when its text changes.
 * Mini destinations travel a long hop at full opacity (no fade-in); centre
 * headers use a shorter hop inside the clipped centre slot.
 */
export function ScrubberSlidingText({
  label,
  direction,
  size = 'center',
  style,
  accessibilityLabel,
  numberOfLines = 1,
}: Props) {
  const [displayed, setDisplayed] = useState(label);
  const translateX = useSharedValue(0);
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      // Newly appearing side preview after a scrub — shoot in with the hop.
      if (direction != null) {
        translateX.value = enterOffset(direction, size);
        translateX.value = withTiming(0, shootTiming());
      }
      return;
    }

    if (label === displayed) {
      return;
    }

    if (direction == null) {
      setDisplayed(label);
      translateX.value = 0;
      return;
    }

    translateX.value = withTiming(
      exitOffset(direction, size),
      shootTiming(),
      (finished) => {
        if (!finished) {
          return;
        }
        runOnJS(setDisplayed)(label);
        translateX.value = enterOffset(direction, size);
        translateX.value = withTiming(0, shootTiming());
      },
    );
  }, [label, direction, displayed, size, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.Text
      style={[
        size === 'mini' ? styles.mini : styles.center,
        style,
        animatedStyle,
      ]}
      accessibilityLabel={accessibilityLabel ?? displayed}
      numberOfLines={numberOfLines}
      ellipsizeMode="tail"
    >
      {displayed}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  center: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  mini: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
