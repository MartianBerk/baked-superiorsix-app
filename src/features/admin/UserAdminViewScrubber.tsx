import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ScrubberActiveCenter } from '@/features/matches/ScrubberActiveCenter';
import { ScrubberSidePreview } from '@/features/matches/ScrubberSidePreview';
import { ScrubberSlidingText } from '@/features/matches/ScrubberSlidingText';
import type { ScrubDirection } from '@/features/matches/scrubberSlide';
import { ScrubberRow } from '@/platform/glass';

export type UserAdminViewMode = 'invite' | 'roster';

const VIEWS: UserAdminViewMode[] = ['invite', 'roster'];

type Props = {
  mode: UserAdminViewMode;
  onChange: (mode: UserAdminViewMode) => void;
};

function labelFor(mode: UserAdminViewMode): string {
  return mode === 'invite' ? 'Invite' : 'Roster';
}

/**
 * Profile admin scrubber: Invite ↔ Roster (mini labels + slide centre text).
 */
export function UserAdminViewScrubber({ mode, onChange }: Props) {
  const [direction, setDirection] = useState<ScrubDirection | null>(null);
  const index = VIEWS.indexOf(mode);
  const canLeft = index > 0;
  const canRight = index >= 0 && index < VIEWS.length - 1;
  const label = labelFor(mode);
  const leftLabel = canLeft ? labelFor(VIEWS[index - 1]) : null;
  const rightLabel = canRight ? labelFor(VIEWS[index + 1]) : null;

  return (
    <ScrubberRow
      style={styles.row}
      accessibilityLabel={`${label} admin`}
    >
      <ScrubberSidePreview
        label={leftLabel}
        accessibilityLabel="Show Invite"
        disabled={!canLeft}
        direction={direction}
        density="medium"
        onPress={() => {
          if (!canLeft) {
            return;
          }
          setDirection('left');
          onChange(VIEWS[index - 1]);
        }}
      />

      <ScrubberActiveCenter
        morphKey={label}
        direction={direction}
        density="medium"
      >
        <ScrubberSlidingText label={label} direction={direction} />
      </ScrubberActiveCenter>

      <ScrubberSidePreview
        label={rightLabel}
        accessibilityLabel="Show Roster"
        disabled={!canRight}
        direction={direction}
        density="medium"
        onPress={() => {
          if (!canRight) {
            return;
          }
          setDirection('right');
          onChange(VIEWS[index + 1]);
        }}
      />
    </ScrubberRow>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 0,
  },
});
