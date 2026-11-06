import { colors } from '@/theme';

/**
 * Map API `band` 1–5 onto Easy / Medium / Hard for UI color.
 * BE: band 1 = easiest, 5 = hardest (baked-superiorsix#22).
 * Choice: 1–2 easy (green), 3 medium (amber), 4–5 hard (red).
 */
export type DifficultyTier = 'easy' | 'medium' | 'hard';

export function difficultyTier(band: number): DifficultyTier {
  if (band <= 2) {
    return 'easy';
  }
  if (band === 3) {
    return 'medium';
  }
  return 'hard';
}

export function difficultyColor(band: number): string {
  const tier = difficultyTier(band);
  if (tier === 'easy') {
    return colors.resultWin;
  }
  if (tier === 'medium') {
    return colors.difficultyMedium;
  }
  return colors.resultLose;
}

export function difficultyLabel(band: number): string {
  const tier = difficultyTier(band);
  if (tier === 'easy') {
    return 'Easy';
  }
  if (tier === 'medium') {
    return 'Medium';
  }
  return 'Hard';
}
