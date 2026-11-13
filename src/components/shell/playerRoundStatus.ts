import type { MatchDifficulty, PredictionChoice } from '@/api/superiorsix';

import type { PerfectSixHolder, PotentialPotLeaders } from './potBanner';
import type { RoundPhase, RoundStatus } from './roundStatus';

/** Count non-null predictions (header numerator while picking). */
export function countSelectedPredictions(
  predictions: Iterable<PredictionChoice | null | undefined>,
): number {
  let count = 0;
  for (const prediction of predictions) {
    if (prediction != null) {
      count += 1;
    }
  }
  return count;
}

export function resolvePlayerRoundPhase(opts: {
  boardLive: boolean;
  subroundOver: boolean;
  /** True once FE/BE 10m pre-kickoff lock has hit. */
  kickoffLocked: boolean;
}): RoundPhase {
  if (opts.boardLive) {
    return 'live';
  }
  if (opts.subroundOver || opts.kickoffLocked) {
    return 'finished';
  }
  return 'picking';
}

/**
 * Single shape for the shell n/X strip across Matches / Scores / Leaders / Profile.
 * Picking → selectedCount; live/finished → correctCount.
 */
export function buildPlayerRoundStatus(opts: {
  phase: RoundPhase;
  slateSize: number;
  selectedCount: number;
  correctCount: number;
  perfectSix?: PerfectSixHolder[];
  /**
   * Non-perfect leaders for the potential pot banner.
   * Ignored while picking (correct counts are not the strip numerator yet).
   */
  potentialPot?: PotentialPotLeaders | null;
  /**
   * Header difficulty pips. Pass explicitly (including `null` to hide).
   * Omit so callers that lack difficulty data can leave the previous value.
   */
  slateDifficulty?: MatchDifficulty | null;
}): RoundStatus {
  // Allow 0 (e.g. tournament still loading / empty) — do not coerce to undefined
  // or RoundStatusStrip will fall back to Super Six’s hard-coded 6.
  const slateSize =
    opts.slateSize >= 0 && Number.isFinite(opts.slateSize)
      ? Math.floor(opts.slateSize)
      : undefined;
  const perfectSix = opts.perfectSix;
  const withDifficulty =
    opts.slateDifficulty !== undefined
      ? { slateDifficulty: opts.slateDifficulty }
      : {};

  if (opts.phase === 'picking') {
    return {
      phase: 'picking',
      slateSize,
      selectedCount: Math.max(0, opts.selectedCount),
      perfectSix,
      // Potential is correct-count based — never while still picking.
      potentialPot: null,
      ...withDifficulty,
    };
  }

  return {
    phase: opts.phase,
    slateSize,
    correctCount: Math.max(0, opts.correctCount),
    perfectSix,
    potentialPot: opts.potentialPot ?? null,
    ...withDifficulty,
  };
}
