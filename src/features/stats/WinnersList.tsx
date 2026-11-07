import { StyleSheet, Text, View } from 'react-native';

import type { HistoricRound } from '@/api/superiorsix';
import { colors } from '@/theme';

import { formatJackpotPounds, formatWinnerDate } from './formatStats';

type Props = {
  rounds: HistoricRound[];
};

/**
 * Flat historical winners archive — winner name(s), date, pot, and slate meta.
 * Newest closed round first (SS-18 `/stats/winners` order). No round scrubber.
 */
export function WinnersList({ rounds }: Props) {
  if (rounds.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyBody}>No closed rounds yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.winnerCol]}>Winner</Text>
        <Text style={[styles.headerCell, styles.dateCol]}>Won</Text>
        <Text style={[styles.headerCell, styles.potCol]}>Pot</Text>
      </View>
      {rounds.map((round, index) => (
        <View
          key={round.round_id}
          style={[
            styles.row,
            index % 2 === 0 ? styles.rowEven : styles.rowOdd,
          ]}
          accessibilityLabel={`${round.winner}, won ${formatWinnerDate(round.end_date)}, pot ${formatJackpotPounds(round.jackpot)}`}
        >
          <View style={styles.winnerCol}>
            <Text style={styles.winner} numberOfLines={2}>
              {round.winner}
            </Text>
            <Text style={styles.detail} numberOfLines={1}>
              Round {round.round_id} · {round.players} players ·{' '}
              {round.matches} match days
            </Text>
          </View>
          <Text style={[styles.date, styles.dateCol]} numberOfLines={2}>
            {formatWinnerDate(round.end_date)}
          </Text>
          <Text style={[styles.pot, styles.potCol]}>
            {formatJackpotPounds(round.jackpot)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
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
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  rowEven: {
    backgroundColor: colors.surface,
  },
  rowOdd: {
    backgroundColor: colors.menuBar,
  },
  winnerCol: {
    flex: 1.5,
    minWidth: 0,
    paddingRight: 4,
  },
  dateCol: {
    flex: 0.85,
  },
  potCol: {
    flex: 0.55,
    textAlign: 'right',
  },
  winner: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    paddingTop: 1,
  },
  pot: {
    color: colors.amber,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    paddingTop: 1,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
