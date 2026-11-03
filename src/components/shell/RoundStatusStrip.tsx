import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

import type { RoundStatus } from './roundStatus';

type Props = {
  status: RoundStatus;
};

function buildPrimaryLine(status: RoundStatus): string {
  if (status.phase === 'picking') {
    const n = status.selectedCount ?? 0;
    return `${n} / 6 Selections`;
  }

  const correct = status.correctCount ?? 0;
  return `${correct} / 6 correct`;
}

/**
 * Thin strip under the main header.
 * - picking: n/6 selections (legacy MatchSelector / Games copy)
 * - live / finished: user's correct count; finished keeps the same state
 * - if another player has all 6, show that alongside
 */
export function RoundStatusStrip({ status }: Props) {
  const primary = buildPrimaryLine(status);
  const complete =
    status.phase === 'picking'
      ? (status.selectedCount ?? 0) >= 6
      : (status.correctCount ?? 0) >= 6;

  const rival =
    status.phase !== 'picking' && status.rivalPerfect
      ? `${status.rivalPerfect.displayName} has all 6`
      : null;

  return (
    <View
      style={styles.strip}
      accessibilityRole="summary"
      accessibilityLabel={[primary, rival].filter(Boolean).join('. ')}
    >
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
