import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import type {
  LiveMatch,
  MatchDifficulty,
  PredictionChoice,
} from '@/api/superiorsix';
import { PickOutcomeBadge } from '@/features/scores/PickOutcomeBadge';
import {
  formatAlignedScore,
  formatMatchMinute,
} from '@/features/scores/liveScoreDisplay';
import {
  isPickCurrentlyCorrect,
  PICK_BADGE_LABEL,
} from '@/features/scores/pickOutcome';
import { colors } from '@/theme';

import { DifficultyPips } from './DifficultyPips';
import { MatchDetailPanel } from './MatchDetailPanel';
import { PredictionPicker } from './PredictionPicker';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

/** Approx width for team column from longest label (fontSize 12 semibold). */
export function teamColumnWidthForMatches(matches: LiveMatch[]): number {
  let maxChars = 0;
  for (const match of matches) {
    const awayExtra = match.status === 'POSTPONED' ? 4 : 0;
    maxChars = Math.max(
      maxChars,
      match.home_team.length,
      match.away_team.length + awayExtra,
    );
  }
  // Clamp so short slates still leave room for pick badge / score / minute.
  return Math.min(160, Math.max(72, Math.ceil(maxChars * 7.2)));
}

export type PlayerMatch = LiveMatch & {
  difficulty?: MatchDifficulty | null;
};

type Props = {
  match: PlayerMatch;
  prediction: PredictionChoice | null;
  busy: boolean;
  locked: boolean;
  canPredict: boolean;
  onPredict: (choice: PredictionChoice) => void;
  /** Shared team-name column width (longest name across the slate). */
  teamColumnWidth: number;
  /** Wall clock for lock / score-line / badge timing (defaults to now). */
  now?: Date;
};

/**
 * Player fixture row: #N leftmost, then difficulty pips, home/away stack,
 * expand for detail / PredictionPicker. Trailing meta is pick badge (if any)
 * + score + match minute once started (+ chevron when unlocked).
 */
export function MatchPredictRow({
  match,
  prediction,
  busy,
  locked,
  canPredict,
  onPredict,
  teamColumnWidth,
  now = new Date(),
}: Props) {
  const [expanded, setExpanded] = useState(false);
  /** Lock forces sections closed without a cascading setState effect. */
  const open = expanded && !locked;
  const postponed = match.status === 'POSTPONED';
  const chevron = (open ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );
  // Show H/D/A whenever this player has a pick (incl. locked live slate).
  const showPick = prediction != null;
  const pickCorrect =
    showPick && isPickCurrentlyCorrect(prediction, match, now);
  const pickLabel =
    showPick && prediction != null ? PICK_BADGE_LABEL[prediction] : null;

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

  const minuteLabel = formatMatchMinute(
    match.match_minute,
    match.match_date,
    match.status,
    now,
  );

  return (
    <View style={[styles.block, prediction != null && styles.blockPicked]}>
      <View style={styles.row}>
        <View style={styles.leading}>
          <View style={styles.gameAndPips}>
            {match.game_number != null ? (
              <Text style={styles.gameNumber}>#{match.game_number}</Text>
            ) : (
              <View style={styles.gameNumberSpacer} />
            )}
            <DifficultyPips difficulty={match.difficulty} />
          </View>
          <View style={[styles.teams, { maxWidth: teamColumnWidth }]}>
            <Text style={styles.team} numberOfLines={1}>
              {match.home_team}
            </Text>
            <Text style={styles.team} numberOfLines={1}>
              {match.away_team}
              {postponed ? ' (P)' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {showPick && prediction != null ? (
            busy ? (
              <View style={styles.badgeBusy}>
                <ActivityIndicator
                  size="small"
                  color={pickCorrect ? colors.text : colors.textMuted}
                />
              </View>
            ) : (
              <PickOutcomeBadge
                prediction={prediction}
                correct={pickCorrect}
                accessibilityLabel={
                  pickCorrect
                    ? `Correct pick ${pickLabel} for ${match.home_team} vs ${match.away_team}`
                    : `Pick ${pickLabel} for ${match.home_team} vs ${match.away_team}`
                }
              />
            )
          ) : null}
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
          {!locked ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={
                open
                  ? `Collapse ${match.home_team} vs ${match.away_team}`
                  : `Expand ${match.home_team} vs ${match.away_team}`
              }
              onPress={() => setExpanded((prev) => !prev)}
              style={({ pressed }) => [
                styles.actionHit,
                pressed && styles.actionPressed,
              ]}
            >
              <SvgXml xml={chevron} width={18} height={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {open ? (
        <MatchDetailPanel
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          matchDateIso={match.match_date}
        >
          {canPredict ? (
            <PredictionPicker
              selection={prediction}
              busy={busy}
              disabled={locked || postponed}
              onSelect={onPredict}
            />
          ) : (
            <Text style={styles.signInHint}>Sign in to set a prediction.</Text>
          )}
        </MatchDetailPanel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  blockPicked: {
    backgroundColor: colors.menuActive,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // Extra air only between pips and team names (#n↔pips stay tighter).
    gap: 16,
    minWidth: 0,
  },
  gameAndPips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
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
  teams: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  team: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  badgeBusy: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actions: {
    // Keep pick badge + score + minute from being squeezed off by long names.
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
  },
  minute: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  score: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'center',
  },
  actionHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  actionPressed: {
    backgroundColor: colors.surface,
  },
  signInHint: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
