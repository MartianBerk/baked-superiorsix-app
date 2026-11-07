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
import {
  formatAlignedScore,
  hasKickedOff,
  isFinishedStatus,
  isPlayingStatus,
} from '@/features/scores/liveScoreDisplay';
import { colors } from '@/theme';

import { DifficultyPips } from './DifficultyPips';
import { MatchDetailPanel } from './MatchDetailPanel';
import { PredictionPicker } from './PredictionPicker';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

const BADGE_LABEL: Record<PredictionChoice, string> = {
  home: 'H',
  draw: 'D',
  away: 'A',
};

function outcomeFromScores(
  homeScore: number,
  awayScore: number,
): PredictionChoice {
  if (homeScore > awayScore) {
    return 'home';
  }
  if (homeScore < awayScore) {
    return 'away';
  }
  return 'draw';
}

/** True once the score line leaves `- : -` (kickoff / in-play / finished). */
function scoresHaveStarted(
  match: Pick<LiveMatch, 'match_date' | 'status'>,
  now: Date,
  postponed: boolean,
): boolean {
  if (postponed) {
    return false;
  }
  return (
    hasKickedOff(match.match_date, now) ||
    isPlayingStatus(match.status) ||
    isFinishedStatus(match.status)
  );
}

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
  // Clamp so short slates still leave room for pick badge / score / #N.
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
  /** Shared team-name column width so pick badges align across rows. */
  teamColumnWidth: number;
  /** Wall clock for `- : -` → `0 : 0` (defaults to now). */
  now?: Date;
};

/**
 * Player fixture row: home/away stack, difficulty pips, single chosen H/D/A
 * badge to the right of teams when signed in with a pick (aligned across rows),
 * expand for detail / PredictionPicker. Past the 10m lock, expands collapse,
 * chevron is hidden, and the header shows an aligned score line. Pick badge is
 * grey until scores start, then green accent when the pick matches the scoreline.
 * Logged out or no prediction → no badge.
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
  const pickLabel =
    canPredict && prediction != null ? BADGE_LABEL[prediction] : null;
  const pickCorrect =
    pickLabel != null &&
    prediction != null &&
    scoresHaveStarted(match, now, postponed) &&
    prediction ===
      outcomeFromScores(match.home_score ?? 0, match.away_score ?? 0);

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

  return (
    <View style={[styles.block, prediction != null && styles.blockPicked]}>
      <View style={styles.row}>
        <DifficultyPips difficulty={match.difficulty} />
        <View style={[styles.teams, { width: teamColumnWidth }]}>
          <Text style={styles.team} numberOfLines={1}>
            {match.home_team}
          </Text>
          <Text style={styles.team} numberOfLines={1}>
            {match.away_team}
            {postponed ? ' (P)' : ''}
          </Text>
        </View>

        {pickLabel != null ? (
          <View
            style={[styles.badge, pickCorrect && styles.badgeCorrect]}
            accessibilityLabel={
              pickCorrect
                ? `Correct pick ${pickLabel} for ${match.home_team} vs ${match.away_team}`
                : `Pick ${pickLabel} for ${match.home_team} vs ${match.away_team}`
            }
          >
            {busy ? (
              <ActivityIndicator
                size="small"
                color={pickCorrect ? colors.text : colors.textMuted}
              />
            ) : (
              <Text
                style={[
                  styles.badgeLabel,
                  pickCorrect && styles.badgeLabelCorrect,
                ]}
              >
                {pickLabel}
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.actions}>
          {scoreLine ? (
            <Text
              style={styles.score}
              accessibilityLabel={`Score ${scoreLine}`}
            >
              {scoreLine}
            </Text>
          ) : null}
          {match.game_number != null ? (
            <Text style={styles.slot}>#{match.game_number}</Text>
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
  teams: {
    flexShrink: 0,
    gap: 2,
    justifyContent: 'center',
  },
  team: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeCorrect: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  badgeLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 12,
  },
  badgeLabelCorrect: {
    color: colors.text,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    minWidth: 0,
  },
  slot: {
    color: colors.accentBright,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
    minWidth: 18,
    textAlign: 'right',
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
