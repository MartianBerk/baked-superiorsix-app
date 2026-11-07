import type { MatchDifficulty, PredictionChoice } from '@/api/superiorsix';

import type { PerfectSixHolder } from './potBanner';
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
   * Header difficulty pips. Pass explicitly (including `null` to hide).
   * Omit so callers that lack difficulty data can leave the previous value.
   */
  slateDifficulty?: MatchDifficulty | null;
}): RoundStatus {
  const slateSize =
    opts.slateSize > 0 && Number.isFinite(opts.slateSize)
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
      ...withDifficulty,
    };
  }

  return {
    phase: opts.phase,
    slateSize,
    correctCount: Math.max(0, opts.correctCount),
    perfectSix,
    ...withDifficulty,
  };
}
