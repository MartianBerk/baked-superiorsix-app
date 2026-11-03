/** Round lifecycle for the thin header status strip. */
export type RoundPhase = 'picking' | 'live' | 'finished';

/**
 * Data for the header status widget.
 * Persist `live` values into `finished` — same copy after full-time.
 */
export type RoundStatus = {
  phase: RoundPhase;
  /** Matches selected while picking (0–6). */
  selectedCount?: number;
  /** Correct results for the logged-in player while live/finished (0–6). */
  correctCount?: number;
  /**
   * Another player currently has all six correct.
   * Shown alongside the user's own live/finished summary.
   */
  rivalPerfect?: {
    displayName: string;
  } | null;
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
