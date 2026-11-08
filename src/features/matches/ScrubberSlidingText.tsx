import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

import {
  SCRUB_LAND_MS,
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

/** Snappy shoot (minis). */
const SHOOT_EASING = Easing.out(Easing.cubic);
/** Soft centre settle — no overshoot / bounce. */
const LAND_EASING = Easing.bezier(0.22, 1, 0.36, 1);

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

function landTiming() {
  return { duration: SCRUB_LAND_MS, easing: LAND_EASING };
}

/**
 * Scrubber label that shoots with the scrub direction when its text changes.
 * Minis keep a long exit→enter hop; the centre header uses a single incoming
 * shoot so it lands once without a bounce / double settle.
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
  const displayedRef = useRef(label);
  const translateX = useSharedValue(0);
  const booted = useRef(false);

  const commitLabel = useCallback((next: string) => {
    displayedRef.current = next;
    setDisplayed(next);
  }, []);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      displayedRef.current = label;
      if (direction != null) {
        translateX.value = enterOffset(direction, size);
        translateX.value = withTiming(
          0,
          size === 'center' ? landTiming() : shootTiming(),
        );
      }
      return;
    }

    if (label === displayedRef.current) {
      return;
    }

    cancelAnimation(translateX);

    if (direction == null) {
      commitLabel(label);
      translateX.value = 0;
      return;
    }

    if (size === 'center') {
      // Incoming shoot only — avoids exit→teleport→enter double settle.
      translateX.value = enterOffset(direction, size);
      commitLabel(label);
      translateX.value = withTiming(0, landTiming());
      return;
    }

    // Mini: shoot out, then shoot across into the side slot.
    translateX.value = withTiming(
      exitOffset(direction, size),
      shootTiming(),
      (finished) => {
        if (!finished) {
          return;
        }
        translateX.value = enterOffset(direction, size);
        runOnJS(commitLabel)(label);
        translateX.value = withTiming(0, shootTiming());
      },
    );
  }, [label, direction, size, translateX, commitLabel]);

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
