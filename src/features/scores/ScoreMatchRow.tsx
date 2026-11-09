import { StyleSheet, Text, View } from 'react-native';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import { PickOutcomeBadge } from './PickOutcomeBadge';
import { isPickCurrentlyCorrect, PICK_BADGE_LABEL } from './pickOutcome';
import { scoreListChrome } from './scoreListChrome';

type Props = {
  match: LiveMatch;
  prediction: PredictionChoice | null;
  /** Wall clock for grey→green timing (defaults to now). */
  now?: Date;
};

/**
 * Read-only picks row (Scores player): Home | H/D/A badge | Away.
 * Compact badge + tight padding so expanded lists stay short.
 * Green when the pick matches the live scoreline (shared D-after-kickoff rule).
 */
export function ScoreMatchRow({ match, prediction, now = new Date() }: Props) {
  const postponed = match.status === 'POSTPONED';
  const pickCorrect = isPickCurrentlyCorrect(prediction, match, now);

  return (
    <View
      style={[
        scoreListChrome.row,
        prediction != null && scoreListChrome.rowPicked,
      ]}
    >
      <Text
        style={[scoreListChrome.team, styles.teamHome]}
        numberOfLines={1}
      >
        {match.home_team}
      </Text>
      <View style={styles.centre}>
        {prediction != null ? (
          <PickOutcomeBadge
            prediction={prediction}
            correct={pickCorrect}
            compact
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
      <Text
        style={[scoreListChrome.team, styles.teamAway]}
        numberOfLines={1}
      >
        {match.away_team}
        {postponed ? ' (P)' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  teamHome: {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  teamAway: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  centre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 24,
  },
  pickNone: {
    width: 22,
    height: 22,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
