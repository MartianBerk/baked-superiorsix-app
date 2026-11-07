import { StyleSheet, Text, View } from 'react-native';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import { PickOutcomeBadge } from './PickOutcomeBadge';
import { isPickCurrentlyCorrect, PICK_BADGE_LABEL } from './pickOutcome';

type Props = {
  match: LiveMatch;
  prediction: PredictionChoice | null;
  /** Wall clock for grey→green timing (defaults to now). */
  now?: Date;
};

/**
 * Read-only picks row (Scores player): Home | H/D/A badge | Away.
 * Badge only in the centre — no score / minute chrome (that lives on Matches).
 * Green when the pick matches the live scoreline (shared D-after-kickoff rule).
 */
export function ScoreMatchRow({ match, prediction, now = new Date() }: Props) {
  const postponed = match.status === 'POSTPONED';
  const pickCorrect = isPickCurrentlyCorrect(prediction, match, now);

  return (
    <View style={[styles.row, prediction != null && styles.rowPicked]}>
      <Text style={[styles.team, styles.teamHome]} numberOfLines={2}>
        {match.home_team}
      </Text>
      <View style={styles.centre}>
        {prediction != null ? (
          <PickOutcomeBadge
            prediction={prediction}
            correct={pickCorrect}
            accessibilityLabel={
              pickCorrect
                ? `Correct pick ${PICK_BADGE_LABEL[prediction]} for ${match.home_team} vs ${match.away_team}`
                : `Pick ${PICK_BADGE_LABEL[prediction]} for ${match.home_team} vs ${match.away_team}`
            }
          />
        ) : (
          <Text style={styles.pickNone}>—</Text>
        )}
      </View>
      <Text style={[styles.team, styles.teamAway]} numberOfLines={2}>
        {match.away_team}
        {postponed ? ' (P)' : ''}
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
  centre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 32,
  },
  pickNone: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 27,
    textAlign: 'center',
  },
});
