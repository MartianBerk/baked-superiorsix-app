import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type {
  LiveMatch,
  MatchDifficulty,
  PredictionChoice,
} from '@/api/superiorsix';
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
};

/**
 * Player fixture row: home/away stack, difficulty pips, expand for detail +
 * Home/Draw/Away. No add/drop (admin-only).
 */
export function MatchPredictRow({
  match,
  prediction,
  busy,
  locked,
  canPredict,
  onPredict,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const postponed = match.status === 'POSTPONED';
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );

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
          {prediction != null ? (
            <Text
              style={styles.pick}
              accessibilityLabel={`Predicted ${prediction}`}
            >
              {CHOICE_LABEL[prediction]}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded
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
        </View>
      </View>

      {expanded ? (
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
