import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  ScrubberSelectionPill,
  useScrubberSelectionPillMotion,
} from '@/platform/glass';

import type { ScrubberSideDensity } from './ScrubberSidePreview';
import { scrubberChrome } from './scrubberChrome';
import { SCRUBBER_PILL_BY_DENSITY } from './scrubberPill';
import type { ScrubDirection } from './scrubberSlide';

type Props = {
  children: ReactNode;
  /** Drives morph when the centre label changes. */
  morphKey: string;
  direction: ScrubDirection | null;
  /** Matches side preview density for proportional pill size. */
  density?: ScrubberSideDensity;
};

/**
 * Centre slot with an active selection pill behind the sliding label.
 * Pill size scales with `density` (compact gameweek → wide Performance).
 */
export function ScrubberActiveCenter({
  children,
  morphKey,
  direction,
  density = 'compact',
}: Props) {
  const metrics = SCRUBBER_PILL_BY_DENSITY[density];
  const [slotWidth, setSlotWidth] = useState(0);
  const pillStyle = useScrubberSelectionPillMotion(
    morphKey,
    direction,
    metrics.nudgePx,
  );

  const pillWidth =
    slotWidth > 0
      ? Math.min(
          metrics.maxWidth,
          Math.max(metrics.minWidth, slotWidth - 8),
        )
      : metrics.minWidth;

  return (
    <View
      style={scrubberChrome.centerSlot}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setSlotWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            width: pillWidth,
            height: metrics.height,
            borderRadius: metrics.radius,
          },
          pillStyle,
        ]}
      >
        <ScrubberSelectionPill borderRadius={metrics.radius} />
      </Animated.View>
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 0,
    overflow: 'hidden',
  },
  foreground: {
    zIndex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
