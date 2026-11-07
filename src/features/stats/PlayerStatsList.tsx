import { StyleSheet, Text, View } from 'react-native';

import type { AggregatePlayerStats } from '@/api/superiorsix';
import { colors } from '@/theme';

import { formatSuccessRate } from './formatStats';

type Props = {
  stats: AggregatePlayerStats[];
  /** Highlight the signed-in player's row when present. */
  viewerAuthId?: string | null;
};

/**
 * Previous-round success rates for the roster (backend-sorted by rate desc).
 */
export function PlayerStatsList({ stats, viewerAuthId }: Props) {
  if (stats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No player rates for the previous round.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.nameCol]}>Player</Text>
        <Text style={[styles.headerCell, styles.correctCol]}>Correct</Text>
        <Text style={[styles.headerCell, styles.rateCol]}>%</Text>
      </View>
      {stats.map((row, index) => {
        const isViewer =
          viewerAuthId != null && row.playerid === viewerAuthId;
        return (
          <View
            key={row.playerid}
            style={[
              styles.row,
              index % 2 === 0 ? styles.rowEven : styles.rowOdd,
              isViewer && styles.rowViewer,
            ]}
            accessibilityLabel={`${row.name}, ${row.correct} of ${row.matches} correct, ${formatSuccessRate(row.success_rate)}${isViewer ? ', you' : ''}`}
          >
            <Text
              style={[styles.cell, styles.nameCol, isViewer && styles.viewerText]}
              numberOfLines={1}
            >
              {isViewer ? `${row.name} (You)` : row.name}
            </Text>
            <Text
              style={[styles.cell, styles.correctCol, isViewer && styles.viewerText]}
            >
              {row.correct}/{row.matches}
            </Text>
            <Text
              style={[styles.cell, styles.rateCol, isViewer && styles.viewerText]}
            >
              {formatSuccessRate(row.success_rate)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.menuBar,
  },
  headerCell: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowEven: {
    backgroundColor: colors.surface,
  },
  rowOdd: {
    backgroundColor: colors.menuBar,
  },
  rowViewer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accentBright,
  },
  cell: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  viewerText: {
    color: colors.text,
    fontWeight: '800',
  },
  nameCol: {
    flex: 1.4,
    paddingRight: 8,
  },
  correctCol: {
    flex: 0.7,
    textAlign: 'center',
  },
  rateCol: {
    flex: 0.55,
    textAlign: 'right',
  },
  empty: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
