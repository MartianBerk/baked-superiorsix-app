import { useEffect, useRef } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ScrubDirection } from '@/features/matches/scrubberSlide';

const SQUASH_MS = 100;
const SETTLE_MS = 140;
const SCALE_X_SQUASH = 0.82;
const SCALE_Y_STRETCH = 1.1;

/**
 * iOS scrubber centre pill: nudge along scrub direction + light squash/stretch.
 */
export function useScrubberSelectionPillMotion(
  morphKey: string,
  direction: ScrubDirection | null,
  nudgePx: number,
) {
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const translateX = useSharedValue(0);
  const ready = useRef(false);

  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      return;
    }
    const nudge =
      direction === 'right' ? nudgePx : direction === 'left' ? -nudgePx : 0;

    translateX.value = withSequence(
      withTiming(nudge, {
        duration: SQUASH_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(0, {
        duration: SETTLE_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    scaleX.value = withSequence(
      withTiming(SCALE_X_SQUASH, {
        duration: SQUASH_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: SETTLE_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    scaleY.value = withSequence(
      withTiming(SCALE_Y_STRETCH, {
        duration: SQUASH_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: SETTLE_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [morphKey, direction, nudgePx, scaleX, scaleY, translateX]);

  return useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));
}
