import { StyleSheet, View } from 'react-native';

import type { MatchDifficulty } from '@/api/superiorsix';
import { colors } from '@/theme';

import { difficultyColor, difficultyLabel } from './matchDifficulty';

type Props = {
  difficulty: MatchDifficulty | null | undefined;
};

/**
 * Five band pips from SS-79 / SS-80 (band 1–5). Shared by admin picker and
 * player prediction rows.
 */
export function DifficultyPips({ difficulty }: Props) {
  const band =
    difficulty != null &&
    Number.isFinite(difficulty.band) &&
    difficulty.band >= 1 &&
    difficulty.band <= 5
      ? Math.trunc(difficulty.band)
      : null;

  if (band == null) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`Difficulty ${difficultyLabel(band)}, band ${band} of 5`}
      style={styles.difficulty}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < band;
        return (
          <View
            key={index}
            style={[
              styles.difficultyPip,
              filled
                ? { backgroundColor: difficultyColor(band) }
                : styles.difficultyPipEmpty,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Five band pips (~7.5px: 25% smaller than prior 10px). */
  difficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    flexShrink: 0,
  },
  difficultyPip: {
    width: 7.5,
    height: 7.5,
    borderRadius: 3.75,
  },
  difficultyPipEmpty: {
    backgroundColor: colors.border,
  },
});
