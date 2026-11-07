import { StyleSheet, Text, View } from 'react-native';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import {
  formatAlignedScore,
  formatMatchMinute,
  matchHasStarted,
} from './liveScoreDisplay';
import { PickOutcomeBadge } from './PickOutcomeBadge';
import { isPickCurrentlyCorrect, PICK_BADGE_LABEL } from './pickOutcome';

type Props = {
  match: LiveMatch;
  prediction: PredictionChoice | null;
  /** Wall clock for grey→green timing + score/minute (defaults to now). */
  now?: Date;
};

/**
 * Read-only picks row (Scores player): Home | H/D/A (+ live score/minute) | Away.
 * Same grey/green pick badge as Matches; score line mirrors Matches once started.
 */
export function ScoreMatchRow({ match, prediction, now = new Date() }: Props) {
  const postponed = match.status === 'POSTPONED';
  const pickCorrect = isPickCurrentlyCorrect(prediction, match, now);
  const started = matchHasStarted(match.match_date, match.status, now);
  const scoreLine = started
    ? formatAlignedScore(
        {
          matchDateIso: match.match_date,
          status: match.status,
          homeScore: match.home_score,
          awayScore: match.away_score,
        },
        now,
      )
    : null;
  const minuteLabel = formatMatchMinute(
    match.match_minute,
    match.match_date,
    match.status,
    now,
  );

  return (
    <View style={[styles.row, prediction != null && styles.rowPicked]}>
      {match.game_number != null ? (
        <Text style={styles.gameNumber}>#{match.game_number}</Text>
      ) : (
        <View style={styles.gameNumberSpacer} />
      )}
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
        {scoreLine ? (
          <Text
            style={styles.score}
            accessibilityLabel={`Score ${scoreLine}`}
          >
            {scoreLine}
          </Text>
        ) : null}
        {minuteLabel ? (
          <Text
            style={styles.minute}
            accessibilityLabel={`Minute ${minuteLabel}`}
          >
            {minuteLabel}
          </Text>
        ) : null}
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
  gameNumber: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'left',
    flexShrink: 0,
  },
  gameNumberSpacer: {
    width: 22,
    flexShrink: 0,
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 56,
    gap: 2,
  },
  pickNone: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 27,
    textAlign: 'center',
  },
  score: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  minute: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
