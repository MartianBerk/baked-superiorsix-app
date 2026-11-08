import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

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

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

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
 * Side-game match row: teams, score/expand, minute, optional H/D/A + ET/pens.
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
  const [expanded, setExpanded] = useState(false);
  const open = expanded && !locked;
  const postponed = match.status === 'POSTPONED';
  const knockout = isKnockoutMatchday(match.matchday);
  const chevron = (open ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );
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
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${match.home_team} versus ${match.away_team}`}
        disabled={postponed}
        onPress={() => {
          if (!locked) {
            setExpanded((v) => !v);
          }
        }}
        style={({ pressed }) => [
          styles.row,
          pressed && !locked && styles.pressed,
        ]}
      >
        <View style={styles.correctSlot}>
          {correct === true ? (
            <Text style={styles.correctMark}>✓</Text>
          ) : null}
        </View>
        <View style={[styles.teams, { width: teamColumnWidth }]}>
          <Text
            style={[
              styles.team,
              prediction === 'home' && styles.teamPicked,
            ]}
            numberOfLines={1}
          >
            {match.home_team}
          </Text>
          <Text
            style={[
              styles.team,
              prediction === 'away' && styles.teamPicked,
            ]}
            numberOfLines={1}
          >
            {match.away_team}
            {postponed ? ' (P)' : ''}
          </Text>
        </View>
        <View style={styles.scoreSlot}>
          {locked ? (
            <Text style={styles.score}>{scoreLine ?? '- : -'}</Text>
          ) : (
            <SvgXml xml={chevron} width={14} height={14} />
          )}
        </View>
        <Text style={styles.minute}>{minuteLabel}</Text>
      </Pressable>

      {open ? (
        <SideGamePredictionPicker
          selection={prediction}
          extraTime={extraTime}
          penalties={penalties}
          knockout={knockout}
          busy={busy}
          disabled={locked || postponed}
          readOnly={!canSubmit}
          onSelect={onPredict}
          onCycleKnockout={onCycleKnockout}
        />
      ) : null}
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
  blockPicked: {
    backgroundColor: 'rgba(22, 53, 86, 0.35)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  correctSlot: {
    width: 16,
    alignItems: 'center',
  },
  correctMark: {
    color: colors.accentBright,
    fontSize: 14,
    fontWeight: '700',
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
  teamPicked: {
    color: colors.accentBright,
  },
  scoreSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
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
