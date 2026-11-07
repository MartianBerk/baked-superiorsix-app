import type { MatchDifficulty } from '@/api/superiorsix';
import { colors } from '@/theme';

/**
 * Map API `band` 1–5 onto Easy / Medium / Hard for UI color.
 * BE: band 1 = easiest, 5 = hardest (baked-superiorsix#22).
 * Choice: 1–2 easy (green), 3 medium (amber), 4–5 hard (red).
 */
export type DifficultyTier = 'easy' | 'medium' | 'hard';

const BAND_COUNT = 5;

/** Same mapping as BE `band_for_score` (SS-79). */
export function bandForScore(score: number): number {
  const clamped = Math.max(0, Math.min(1, score));
  if (clamped >= 1) {
    return BAND_COUNT;
  }
  return Math.trunc(clamped * BAND_COUNT) + 1;
}

/**
 * Overall Super Six slate difficulty: mean of per-match scores, then band.
 * Used for the under-header strip (selected slate matches).
 */
export function aggregateSelectionDifficulty(
  difficulties: (MatchDifficulty | null | undefined)[],
): MatchDifficulty | null {
  const scores: number[] = [];
  for (const row of difficulties) {
    if (row != null && Number.isFinite(row.score)) {
      scores.push(row.score);
    }
  }
  if (scores.length === 0) {
    return null;
  }
  const mean =
    Math.round(
      (scores.reduce((sum, value) => sum + value, 0) / scores.length) * 1000,
    ) / 1000;
  return { score: mean, band: bandForScore(mean) };
}

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
