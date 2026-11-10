import { StyleSheet, Text, View } from 'react-native';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { PredictionPicker } from '@/features/matches/PredictionPicker';
import { colors } from '@/theme';

import { isPostponedStatus } from './liveScoreDisplay';

type Props = {
  match: LiveMatch;
  prediction: PredictionChoice | null;
  busy: boolean;
  disabled: boolean;
  onSelect: (choice: PredictionChoice) => void;
};

/**
 * Expanded admin prediction row: home | HOME/DRAW/AWAY picker | away.
 * Picker chrome matches player Matches `PredictionPicker`.
 */
export function AdminPredictionMatchRow({
  match,
  prediction,
  busy,
  disabled,
  onSelect,
}: Props) {
  const postponed = isPostponedStatus(match.status);
  const locked = disabled || postponed;
  const fixtureLabel = `${match.home_team} vs ${match.away_team}`;

  return (
    <View style={[styles.row, prediction != null && styles.rowPicked]}>
      <Text style={[styles.team, styles.teamHome]} numberOfLines={2}>
        {match.home_team}
      </Text>
      <PredictionPicker
        embedded
        selection={prediction}
        busy={busy}
        disabled={locked}
        postponed={postponed}
        fixtureLabel={fixtureLabel}
        onSelect={onSelect}
      />
      <Text style={[styles.team, styles.teamAway]} numberOfLines={2}>
        {match.away_team}
        {postponed ? (
          <Text style={styles.postponedMark}> (P)</Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPicked: {
    backgroundColor: colors.menuActive,
  },
  team: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  teamHome: {
    textAlign: 'left',
  },
  teamAway: {
    textAlign: 'right',
  },
  postponedMark: {
    color: colors.resultLose,
    fontWeight: '800',
  },
});
