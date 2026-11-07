import { StyleSheet, Text, View } from 'react-native';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

const CHOICE_LABEL: Record<PredictionChoice, string> = {
  home: 'H',
  draw: 'D',
  away: 'A',
};

type Props = {
  match: LiveMatch;
  prediction: PredictionChoice | null;
  correct: boolean | null;
};

/**
 * Read-only picks row (Scores player): Home | H/D/A | Away + tick.
 * No live score chrome — that lives on Matches (player).
 */
export function ScoreMatchRow({ match, prediction, correct }: Props) {
  const postponed = match.status === 'POSTPONED';
  const homePicked = prediction === 'home';
  const awayPicked = prediction === 'away';
  const drawPicked = prediction === 'draw';

  return (
    <View style={[styles.row, prediction != null && styles.rowPicked]}>
      <Text
        style={[styles.team, styles.teamHome, homePicked && styles.teamPick]}
        numberOfLines={2}
      >
        {match.home_team}
      </Text>
      <View style={styles.centre}>
        {prediction != null ? (
          <Text
            style={[styles.pickLetter, drawPicked && styles.pickDraw]}
            accessibilityLabel={`Predicted ${CHOICE_LABEL[prediction]}`}
          >
            {CHOICE_LABEL[prediction]}
          </Text>
        ) : (
          <Text style={styles.pickLetterMuted}>—</Text>
        )}
        {correct === true ? (
          <Text style={styles.tick} accessibilityLabel="Correct">
            ✓
          </Text>
        ) : (
          <Text style={styles.tickPlaceholder}> </Text>
        )}
      </View>
      <Text
        style={[styles.team, styles.teamAway, awayPicked && styles.teamPick]}
        numberOfLines={2}
      >
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
  teamPick: {
    color: colors.accentBright,
    fontWeight: '800',
  },
  centre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
    minWidth: 56,
  },
  pickLetter: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  pickDraw: {
    color: colors.accentBright,
  },
  pickLetterMuted: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  tick: {
    color: colors.accentBright,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 14,
    textAlign: 'center',
  },
  tickPlaceholder: {
    minWidth: 14,
  },
});
