import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

import type { StatsCompareRow } from './compareStats';
import { formatSuccessRate } from './formatStats';
import { RateDeltaBadge } from './RateDeltaBadge';

type Props = {
  stats: StatsCompareRow[];
  /** Highlight the signed-in player's row when present. */
  viewerAuthId?: string | null;
};

/**
 * Current-round (n) success rates with inline n vs n−1 delta badges.
 */
export function PlayerStatsList({ stats, viewerAuthId }: Props) {
  if (stats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No player rates yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.nameCol]}>Player</Text>
        <Text style={[styles.headerCell, styles.correctCol]}>Correct</Text>
        <Text style={[styles.headerCell, styles.rateCol]}>%</Text>
        <Text style={[styles.headerCell, styles.deltaCol]}>Vs Last Round</Text>
      </View>
      {stats.map((row, index) => {
        const isViewer =
          viewerAuthId != null && row.playerid === viewerAuthId;
        const rateLabel = formatSuccessRate(row.success_rate);
        return (
          <View
            key={row.playerid}
            style={[
              styles.row,
              index % 2 === 0 ? styles.rowEven : styles.rowOdd,
              isViewer && styles.rowViewer,
            ]}
            accessibilityLabel={`${row.name}, ${row.correct} of ${row.matches} correct, ${rateLabel}${isViewer ? ', you' : ''}`}
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
              {rateLabel}
            </Text>
            <View style={styles.deltaCol}>
              <RateDeltaBadge delta={row.rate_delta} />
            </View>
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
    flex: 1.35,
    paddingRight: 6,
  },
  correctCol: {
    flex: 0.65,
    textAlign: 'center',
  },
  rateCol: {
    flex: 0.45,
    textAlign: 'center',
  },
  deltaCol: {
    flex: 0.85,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
