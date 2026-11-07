import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type {
  LiveMatch,
  MatchDifficulty,
  PredictionChoice,
} from '@/api/superiorsix';
import { formatAlignedScore } from '@/features/scores/liveScoreDisplay';
import { colors } from '@/theme';

import { DifficultyPips } from './DifficultyPips';
import { MatchDetailPanel } from './MatchDetailPanel';
import { PredictionPicker } from './PredictionPicker';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

const CHOICE_LABEL: Record<PredictionChoice, string> = {
  home: 'H',
  draw: 'D',
  away: 'A',
};

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
  /** Wall clock for `- : -` → `0 : 0` (defaults to now). */
  now?: Date;
};

/**
 * Player fixture row: home/away stack, difficulty pips, expand for detail +
 * Home/Draw/Away. Past the 10m lock, expands collapse, chevron is hidden, and
 * the header shows an aligned score line (`- : -` / `0 : 0` / live).
 */
export function MatchPredictRow({
  match,
  prediction,
  busy,
  locked,
  canPredict,
  onPredict,
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
        <View style={styles.teams}>
          <Text style={styles.team} numberOfLines={1}>
            {match.home_team}
          </Text>
          <Text style={styles.team} numberOfLines={1}>
            {match.away_team}
            {postponed ? ' (P)' : ''}
          </Text>
        </View>

        <View style={styles.actions}>
          {match.game_number != null ? (
            <Text style={styles.slot}>#{match.game_number}</Text>
          ) : null}
          {scoreLine ? (
            <Text
              style={styles.score}
              accessibilityLabel={`Score ${scoreLine}`}
            >
              {scoreLine}
            </Text>
          ) : null}
          {prediction != null ? (
            <Text
              style={styles.pick}
              accessibilityLabel={`Predicted ${prediction}`}
            >
              {CHOICE_LABEL[prediction]}
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
  teams: {
    flex: 1,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  pick: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 16,
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
