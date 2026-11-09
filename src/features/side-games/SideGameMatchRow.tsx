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
 * score when locked, kickoff/minute. No expander. Correctness is the badge
 * going green (no tick mark).
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
    <View style={[styles.block, prediction != null && styles.blockPicked]}>
      <View style={styles.row}>
        <View style={[styles.teams, { width: teamColumnWidth }]}>
          <Text style={styles.team} numberOfLines={1}>
            {match.home_team}
          </Text>
          <Text style={styles.team} numberOfLines={1}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  /** Same selected-row wash as Matches / Scores. */
  blockPicked: {
    backgroundColor: colors.menuActive,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teams: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 2,
  },
  team: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  mid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  score: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  minute: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
});
