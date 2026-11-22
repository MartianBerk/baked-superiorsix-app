import { useAnimatedStyle } from 'react-native-reanimated';

import type { ScrubDirection } from '@/features/matches/scrubberSlide';

/**
 * Web: static lighter pill — no squash (centre stays put; text still slides).
 */
export function useScrubberSelectionPillMotion(
  _morphKey: string,
  _direction: ScrubDirection | null,
  _nudgePx: number,
) {
  return useAnimatedStyle(() => ({}));
}
