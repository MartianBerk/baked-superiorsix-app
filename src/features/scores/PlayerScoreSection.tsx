import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type {
  LiveMatch,
  MatchDifficulty,
  PredictionChoice,
} from '@/api/superiorsix';
import { DifficultyPips } from '@/features/matches/DifficultyPips';
import { colors } from '@/theme';

import { ScoreMatchRow } from './ScoreMatchRow';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

const SLOT_TOTAL = 6;

type Props = {
  playerName: string;
  matches: LiveMatch[];
  /** matchId → prediction for this player. */
  predictions: Record<number, PredictionChoice | null>;
  /** Overall correct / pick count for the header. */
  score: number;
  slateDifficulty: MatchDifficulty | null;
  expanded: boolean;
  onToggleExpand: () => void;
};

/**
 * Collapsible player block for Scores (admin chrome, no H/D/A submit).
 * Collapsed by default; expand shows read-only predictions.
 */
export function PlayerScoreSection({
  playerName,
  matches,
  predictions,
  score,
  slateDifficulty,
  expanded,
  onToggleExpand,
}: Props) {
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );
  const countLabel = `${score}/${SLOT_TOTAL}`;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${playerName}, ${countLabel}${expanded ? ', expanded' : ''}`}
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerLeft}>
          <DifficultyPips difficulty={slateDifficulty} />
          <Text style={styles.name} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{countLabel}</Text>
          <View style={styles.chevronSlot}>
            <SvgXml xml={chevron} width={18} height={18} />
          </View>
        </View>
      </Pressable>
      {expanded
        ? matches.map((match) => (
            <ScoreMatchRow
              key={match.id}
              match={match}
              prediction={predictions[match.id] ?? null}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.menuBar,
  },
  headerPressed: {
    backgroundColor: colors.menuActive,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  count: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    minWidth: 36,
    textAlign: 'right',
  },
  chevronSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
