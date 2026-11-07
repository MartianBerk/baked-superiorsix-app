import { StyleSheet, Text, View } from 'react-native';

import type {
  LiveMatch,
  MatchDifficulty,
  PredictionChoice,
} from '@/api/superiorsix';
import { DifficultyPips } from '@/features/matches/DifficultyPips';
import { colors } from '@/theme';

import { ScoreMatchRow } from './ScoreMatchRow';

const SLOT_TOTAL = 6;

type Props = {
  playerName: string;
  matches: LiveMatch[];
  /** matchId → prediction for this player. */
  predictions: Record<number, PredictionChoice | null>;
  /** matchId → correct flag when known from livescores. */
  correctByMatch: Record<number, boolean | null>;
  /** Overall correct / pick count for the header. */
  score: number;
  slateDifficulty: MatchDifficulty | null;
};

/**
 * Always-open player block for Scores (admin layout chrome, no expand/predict).
 * Picks board only — no live score chrome.
 */
export function PlayerScoreSection({
  playerName,
  matches,
  predictions,
  correctByMatch,
  score,
  slateDifficulty,
}: Props) {
  const countLabel = `${score}/${SLOT_TOTAL}`;

  return (
    <View style={styles.card}>
      <View
        style={styles.header}
        accessibilityRole="header"
        accessibilityLabel={`${playerName}, ${countLabel}`}
      >
        <View style={styles.headerLeft}>
          <DifficultyPips difficulty={slateDifficulty} />
          <Text style={styles.name} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        <Text style={styles.count}>{countLabel}</Text>
      </View>
      {matches.map((match) => (
        <ScoreMatchRow
          key={match.id}
          match={match}
          prediction={predictions[match.id] ?? null}
          correct={correctByMatch[match.id] ?? null}
        />
      ))}
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
  count: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    minWidth: 36,
    textAlign: 'right',
    flexShrink: 0,
  },
});
