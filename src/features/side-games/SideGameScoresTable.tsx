import { StyleSheet, Text, View } from 'react-native';

import type { SideGameScoreRow } from '@/api/sideGames';
import { colors } from '@/theme';

type Props = {
  scores: SideGameScoreRow[];
};

/** Legacy-shaped scores board: Player / Score / Bonus / Total. */
export function SideGameScoresTable({ scores }: Props) {
  if (scores.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No scores yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.player, styles.headerText]}>
          Player
        </Text>
        <Text style={[styles.cell, styles.num, styles.headerText]}>Score</Text>
        <Text style={[styles.cell, styles.num, styles.headerText]}>Bonus</Text>
        <Text style={[styles.cell, styles.num, styles.headerText]}>Total</Text>
      </View>
      {scores.map((row, index) => (
        <View
          key={`${row.auth_id ?? row.player}-${index}`}
          style={[styles.row, index % 2 === 0 ? styles.even : styles.odd]}
        >
          <Text style={[styles.cell, styles.player]} numberOfLines={1}>
            {row.player}
          </Text>
          <Text style={[styles.cell, styles.num]}>{row.score}</Text>
          <Text style={[styles.cell, styles.num]}>{row.bonus}</Text>
          <Text style={[styles.cell, styles.num, styles.total]}>{row.total}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  header: {
    backgroundColor: colors.surface,
  },
  even: {
    backgroundColor: colors.menuBar,
  },
  odd: {
    backgroundColor: colors.background,
  },
  cell: {
    color: colors.text,
    fontSize: 13,
  },
  headerText: {
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  player: {
    flex: 1.6,
    fontWeight: '600',
  },
  num: {
    flex: 0.7,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  total: {
    fontWeight: '700',
    color: colors.accentBright,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
