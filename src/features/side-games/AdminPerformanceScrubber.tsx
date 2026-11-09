import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrubberSidePreview } from '@/features/matches/ScrubberSidePreview';
import { ScrubberSlidingText } from '@/features/matches/ScrubberSlidingText';
import { scrubberChrome } from '@/features/matches/scrubberChrome';
import type { ScrubDirection } from '@/features/matches/scrubberSlide';

export type AdminPerformanceView = 'round' | 'side-games';

const VIEWS: AdminPerformanceView[] = ['round', 'side-games'];

type Props = {
  mode: AdminPerformanceView;
  onChange: (mode: AdminPerformanceView) => void;
};

function labelFor(mode: AdminPerformanceView): string {
  return mode === 'round' ? 'Round' : 'Tournament';
}

/**
 * Admin Performance scrubber: Super Six round admin ↔ Tournament activate.
 * Same slide/shoot chrome as Super Six / Euros Matches↔Table scrubbers.
 */
export function AdminPerformanceScrubber({ mode, onChange }: Props) {
  const [direction, setDirection] = useState<ScrubDirection | null>(null);
  const index = VIEWS.indexOf(mode);
  const canLeft = index > 0;
  const canRight = index >= 0 && index < VIEWS.length - 1;
  const label = labelFor(mode);
  const leftLabel = canLeft ? labelFor(VIEWS[index - 1]) : null;
  const rightLabel = canRight ? labelFor(VIEWS[index + 1]) : null;

  return (
    <View
      style={[scrubberChrome.row, styles.row]}
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} admin`}
    >
      <ScrubberSidePreview
        label={leftLabel}
        accessibilityLabel="Show Round admin"
        disabled={!canLeft}
        direction={direction}
        density="wide"
        onPress={() => {
          if (!canLeft) {
            return;
          }
          setDirection('left');
          onChange(VIEWS[index - 1]);
        }}
      />

      <View style={scrubberChrome.centerSlot}>
        <ScrubberSlidingText label={label} direction={direction} />
      </View>

      <ScrubberSidePreview
        label={rightLabel}
        accessibilityLabel="Show Tournament admin"
        disabled={!canRight}
        direction={direction}
        density="wide"
        onPress={() => {
          if (!canRight) {
            return;
          }
          setDirection('right');
          onChange(VIEWS[index + 1]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 0,
  },
});
