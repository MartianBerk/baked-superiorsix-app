import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { Subround } from '@/api/superiorsix';

import {
  formatKickoffLabel,
  formatScrubberDate,
  utcDayKey,
} from './formatMatchDate';
import { ScrubberSidePreview } from './ScrubberSidePreview';
import { ScrubberSlidingText } from './ScrubberSlidingText';
import { scrubberChrome } from './scrubberChrome';
import type { ScrubDirection } from './scrubberSlide';

export type SubroundLabelMode = 'sequence' | 'kickoff';

type Props = {
  subrounds: Subround[];
  selectedId: number | null;
  onChange: (subround: Subround) => void;
  /**
   * `sequence` (admin): `# n`.
   * `kickoff` (player): earliest kickoff date/time in the slate.
   */
  labelMode?: SubroundLabelMode;
  /**
   * Matches Admin only: when selected is the last row, the right side preview
   * shows “+” and this fires (same press as scrubbing to a side mini).
   * Omit on player / Scores scrubbers.
   */
  onStartNew?: () => void;
  /** @deprecated Unused — prefer `onStartNew` for admin force-next. */
  trailing?: ReactNode;
  /** Outer wrap style (e.g. clear margin when nested in a side-by-side row). */
  style?: StyleProp<ViewStyle>;
};

/** Admin centre label: sequence as `# n`. */
export function subroundSequenceLabel(subround: Subround): string {
  return `# ${subround.sequence}`;
}

/** Player centre label: earliest kickoff date + time (`Sat 31 Oct 3pm`). */
export function subroundKickoffLabel(subround: Subround): string {
  if (subround.min_kickoff) {
    const day = formatScrubberDate(utcDayKey(subround.min_kickoff));
    const time = formatKickoffLabel(subround.min_kickoff);
    return `${day} ${time}`;
  }
  return subroundSequenceLabel(subround);
}

export function subroundLabel(
  subround: Subround,
  mode: SubroundLabelMode = 'sequence',
): string {
  return mode === 'kickoff'
    ? subroundKickoffLabel(subround)
    : subroundSequenceLabel(subround);
}

/** Left/right subround scrubber (shared chrome with date scrubber). */
export function SubroundScrubber({
  subrounds,
  selectedId,
  onChange,
  labelMode = 'sequence',
  onStartNew,
  trailing,
  style,
}: Props) {
  const [direction, setDirection] = useState<ScrubDirection | null>(null);

  if (subrounds.length === 0 || selectedId == null) {
    return null;
  }

  const index = subrounds.findIndex((row) => row.id === selectedId);
  const selected = index >= 0 ? subrounds[index] : null;
  if (!selected) {
    return null;
  }

  const canLeft = index > 0;
  const canRight = index >= 0 && index < subrounds.length - 1;
  const showStartNew = !canRight && onStartNew != null;
  const label = subroundLabel(selected, labelMode);
  const leftLabel = canLeft
    ? subroundLabel(subrounds[index - 1], labelMode)
    : null;
  const rightLabel = canRight
    ? subroundLabel(subrounds[index + 1], labelMode)
    : showStartNew
      ? '+'
      : null;

  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[scrubberChrome.row, styles.rowTight]}
        accessibilityRole="adjustable"
      >
        <ScrubberSidePreview
          label={leftLabel}
          accessibilityLabel={
            leftLabel
              ? `Previous subround, ${leftLabel}`
              : 'Previous subround'
          }
          disabled={!canLeft}
          direction={direction}
          onPress={() => {
            if (!canLeft) {
              return;
            }
            setDirection('left');
            onChange(subrounds[index - 1]);
          }}
        />

        <View style={scrubberChrome.centerSlot}>
          <ScrubberSlidingText
            label={label}
            direction={direction}
            accessibilityLabel={
              labelMode === 'kickoff'
                ? `Subround ${selected.sequence}, ${label}`
                : `Subround ${selected.sequence}`
            }
          />
        </View>

        <ScrubberSidePreview
          label={rightLabel}
          accessibilityLabel={
            showStartNew
              ? 'Start new subround'
              : rightLabel
                ? `Next subround, ${rightLabel}`
                : 'Next subround'
          }
          disabled={!canRight && !showStartNew}
          direction={direction}
          onPress={() => {
            if (canRight) {
              setDirection('right');
              onChange(subrounds[index + 1]);
              return;
            }
            if (showStartNew && onStartNew) {
              setDirection('right');
              onStartNew();
            }
          }}
        />
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
    gap: 6,
  },
  rowTight: {
    marginBottom: 0,
  },
});
