import { StyleSheet, Text, View } from 'react-native';

import type {
  SideGameMatch,
  SideGamePredictionChoice,
} from '@/api/sideGames';
import { isKnockoutMatchday } from '@/api/sideGames';
import {
  formatAlignedScore,
  formatMatchMinute,
} from '@/features/scores/liveScoreDisplay';
import { scoreListChrome } from '@/features/scores/scoreListChrome';
import { colors } from '@/theme';

import { SideGamePredictionPicker } from './SideGamePredictionPicker';

type Props = {
  match: SideGameMatch;
  prediction: SideGamePredictionChoice | null;
  extraTime: boolean;
  penalties: boolean;
  busy: boolean;
  locked: boolean;
  canSubmit: boolean;
  onPredict: (choice: SideGamePredictionChoice) => void;
  onCycleKnockout: () => void;
  teamColumnWidth: number;
  now?: Date;
  /** First row in the day card — omit top rule (Scores list chrome). */
  isFirst?: boolean;
};

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function pickCorrect(
  prediction: SideGamePredictionChoice | null,
  match: SideGameMatch,
): boolean | null {
  if (!prediction) {
    return null;
  }
  const started =
    match.status === 'IN_PLAY' ||
    match.status === 'IN PLAY' ||
    match.status === 'PAUSED' ||
    match.status === 'FINISHED' ||
    match.status === 'AWARDED';
  if (!started || match.home_score == null || match.away_score == null) {
    return null;
  }
  if (prediction === 'home') {
    return match.home_score > match.away_score;
  }
  if (prediction === 'away') {
    return match.away_score > match.home_score;
  }
  return match.home_score === match.away_score;
}

/**
 * Side-game match row: teams, inline mid-row H/D/A (or knockout 90/ET/P),
 * score when locked, kickoff/minute. Section/row chrome matches Scores
 * `scoreListChrome` (same as Matches slate rows).
 */
export function SideGameMatchRow({
  match,
  prediction,
  extraTime,
  penalties,
  busy,
  locked,
  canSubmit,
  onPredict,
  onCycleKnockout,
  teamColumnWidth,
  now = new Date(),
  isFirst = false,
}: Props) {
  const postponed = match.status === 'POSTPONED';
  const knockout = isKnockoutMatchday(match.matchday);
  const correct = pickCorrect(prediction, match);

  const scoreLine = locked
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

  const minuteLabel = locked
    ? formatMatchMinute(
        match.match_minute,
        match.match_date,
        match.status,
        now,
      )
    : formatKickoffTime(match.match_date);

  return (
    <View
      style={[
        scoreListChrome.row,
        isFirst && scoreListChrome.rowFirst,
      ]}
    >
      <View style={[styles.teams, { width: teamColumnWidth }]}>
        <Text style={scoreListChrome.team} numberOfLines={1}>
          {match.home_team}
        </Text>
        <Text style={scoreListChrome.team} numberOfLines={1}>
          {match.away_team}
          {postponed ? ' (P)' : ''}
        </Text>
      </View>
      <View style={styles.mid}>
        <SideGamePredictionPicker
          selection={prediction}
          extraTime={extraTime}
          penalties={penalties}
          knockout={knockout}
          busy={busy}
          disabled={locked || postponed}
          readOnly={!canSubmit}
          correct={correct}
          onSelect={onPredict}
          onCycleKnockout={onCycleKnockout}
        />
      </View>
      {locked && scoreLine ? (
        <Text style={styles.score}>{scoreLine}</Text>
      ) : null}
      <Text style={styles.minute}>{minuteLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  teams: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 1,
  },
  mid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  score: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  minute: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
