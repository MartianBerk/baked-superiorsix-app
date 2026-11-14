/** Admin may override scores once the match is well past kickoff (SS-255). */
export const MATCH_SCORE_OVERRIDE_AFTER_MS = 2 * 60 * 60 * 1000;

/**
 * True when `now >= kickoff + 2h`. Hide/disable the Matches admin override UI
 * otherwise (BE also guards).
 */
export function canOverrideMatchScore(
  matchDateIso: string,
  now: Date = new Date(),
): boolean {
  const kickoffMs = Date.parse(matchDateIso);
  if (!Number.isFinite(kickoffMs)) {
    return false;
  }
  return now.getTime() >= kickoffMs + MATCH_SCORE_OVERRIDE_AFTER_MS;
}
