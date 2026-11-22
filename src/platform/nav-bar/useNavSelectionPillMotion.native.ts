import { useEffect, useRef } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const SLIDE_MS = 280;
const SQUASH_MS = 120;
const SETTLE_MS = 160;
/** Compress along travel (X). */
const SCALE_X_SQUASH = 0.78;
/** Stretch perpendicular (Y). */
const SCALE_Y_STRETCH = 1.14;

/**
 * iOS: slide + elastic squash/stretch (compress on travel axis, stretch on Y).
 */
export function useNavSelectionPillMotion(targetX: number, enabled: boolean) {
  const pillX = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const ready = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!ready.current) {
      pillX.value = targetX;
      scaleX.value = 1;
      scaleY.value = 1;
      ready.current = true;
      return;
    }

    const travel = Math.abs(targetX - pillX.value);
    const morph = travel > 2;

    pillX.value = withTiming(targetX, {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });

    if (morph) {
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
    }
  }, [targetX, enabled, pillX, scaleX, scaleY]);

  return useAnimatedStyle(() => ({
    transform: [
      { translateX: pillX.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));
}
