import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrubberSidePreview } from '@/features/matches/ScrubberSidePreview';
import { ScrubberSlidingText } from '@/features/matches/ScrubberSlidingText';
import { scrubberChrome } from '@/features/matches/scrubberChrome';
import type { ScrubDirection } from '@/features/matches/scrubberSlide';

export type StatsViewMode = 'stats' | 'winners';

const VIEWS: StatsViewMode[] = ['stats', 'winners'];

type Props = {
  mode: StatsViewMode;
  onChange: (mode: StatsViewMode) => void;
};

function labelFor(mode: StatsViewMode): string {
  return mode === 'stats' ? 'Performance' : 'Winners';
}

/**
 * Under-header scrubber: toggles Performance ↔ Winners (not round history).
 * Side slots show the destination header in mini type instead of chevrons.
 */
export function StatsViewScrubber({ mode, onChange }: Props) {
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
      accessibilityLabel={`${label} view`}
    >
      <ScrubberSidePreview
        label={leftLabel}
        accessibilityLabel="Show Performance"
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
        accessibilityLabel="Show Winners"
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
