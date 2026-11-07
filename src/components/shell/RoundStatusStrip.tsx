import { StyleSheet, Text, View } from 'react-native';

import { DifficultyPips } from '@/features/matches/DifficultyPips';
import { colors } from '@/theme';

import type { RoundStatus } from './roundStatus';

type Props = {
  status: RoundStatus;
};

/** Denominator for header n/X — loaded slate size, with 6 only as last-resort fallback. */
export function resolveSlateSize(status: RoundStatus): number {
  const size = status.slateSize;
  if (size != null && Number.isFinite(size) && size > 0) {
    return Math.floor(size);
  }
  return 6;
}

function buildPrimaryLine(status: RoundStatus): string {
  const total = resolveSlateSize(status);
  if (status.phase === 'picking') {
    const n = status.selectedCount ?? 0;
    return `${n} / ${total} Selections`;
  }

  const correct = status.correctCount ?? 0;
  return `${correct} / ${total} correct`;
}

/**
 * Thin strip under the main header.
 * - picking: n/X selections (X = current slate size)
 * - live / finished: user's correct count; finished keeps the same state
 * - difficulty pips = aggregate of selected slate matches when set
 * - if another player has a perfect slate, show that alongside
 */
export function RoundStatusStrip({ status }: Props) {
  const total = resolveSlateSize(status);
  const primary = buildPrimaryLine(status);
  const complete =
    status.phase === 'picking'
      ? (status.selectedCount ?? 0) >= total
      : (status.correctCount ?? 0) >= total;

  const rival =
    status.phase !== 'picking' && status.rivalPerfect
      ? `${status.rivalPerfect.displayName} has all ${total}`
      : null;

  return (
    <View
      style={styles.strip}
      accessibilityRole="summary"
      accessibilityLabel={[primary, rival].filter(Boolean).join('. ')}
    >
      <DifficultyPips difficulty={status.slateDifficulty} />
      <Text style={[styles.primary, complete && styles.primaryComplete]}>
        {primary}
      </Text>
      {rival ? <Text style={styles.rival}>{rival}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.menuBar,
  },
  primary: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  primaryComplete: {
    color: colors.accentBright,
  },
  rival: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
