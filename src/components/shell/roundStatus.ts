import type { MatchDifficulty } from '@/api/superiorsix';

import type { PerfectSixHolder, SplitPotLeaders } from './potBanner';

/** Round lifecycle for the thin header status strip. */
export type RoundPhase = 'picking' | 'live' | 'finished';

/**
 * Data for the header status widget.
 * Persist `live` values into `finished` — same copy after full-time.
 */
export type RoundStatus = {
  phase: RoundPhase;
  /**
   * Games in the current slate/subround (denominator for n/X selections|correct).
   * Prefer the loaded board/matches length — not a hard-coded 6.
   */
  slateSize?: number;
  /** Matches selected while picking (0–slateSize). */
  selectedCount?: number;
  /** Correct results for the logged-in player while live/finished. */
  correctCount?: number;
  /**
   * Aggregate difficulty of the current slate’s selected matches (header pips).
   * Player: mean of the loaded subround fixtures.
   * Admin Matches: mean of the draft selection (updates live as picks change).
   * Omit to leave the previous value; pass `null` to clear.
   */
  slateDifficulty?: MatchDifficulty | null;
  /**
   * Another player currently has every slate pick correct.
   * Shown alongside the user's own live/finished summary.
   */
  rivalPerfect?: {
    displayName: string;
  } | null;
  /** Everyone currently on a perfect slate (drives the live/finished pot banner). */
  perfectSix?: PerfectSixHolder[];
  /**
   * Picking-stage selection leaders for the split-pot banner.
   * Live/finished leave this null — only perfect X/X shows then.
   * Perfect banner still wins if both somehow apply.
   */
  splitPot?: SplitPotLeaders | null;
};

/** SS-8 placeholder until round/selection APIs are wired. */
export const PLACEHOLDER_ROUND_STATUS: RoundStatus = {
  phase: 'picking',
  selectedCount: 0,
};

/** Demo: Scores tab — live correct-count only. */
export const DEMO_LIVE_STATUS: RoundStatus = {
  phase: 'live',
  correctCount: 4,
};

/** Demo: Leaders tab — live correct-count + rival has all 6. */
export const DEMO_LIVE_RIVAL_STATUS: RoundStatus = {
  phase: 'live',
  correctCount: 4,
  rivalPerfect: { displayName: 'Alex' },
};

/** Map Super Six tab paths to demo strip states (visibility only). */
export function demoRoundStatusForPath(pathname: string): RoundStatus {
  if (pathname.includes('/scores')) {
    return DEMO_LIVE_STATUS;
  }
  if (pathname.includes('/leaders')) {
    return DEMO_LIVE_RIVAL_STATUS;
  }
  return PLACEHOLDER_ROUND_STATUS;
}
