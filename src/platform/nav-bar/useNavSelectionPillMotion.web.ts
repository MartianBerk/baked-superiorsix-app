import { useEffect, useRef } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SLIDE_MS = 280;

/** Web: clean horizontal translate only (no squash). */
export function useNavSelectionPillMotion(targetX: number, enabled: boolean) {
  const pillX = useSharedValue(0);
  const ready = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!ready.current) {
      pillX.value = targetX;
      ready.current = true;
      return;
    }
    pillX.value = withTiming(targetX, {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetX, enabled, pillX]);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));
}
