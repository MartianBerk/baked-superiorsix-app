/**
 * Temporary Matches live-mode clock override (Martin local gameday test).
 *
 * Europe/London wall clock as ISO-8601 with offset.
 * On 2026-11-07 London is GMT, so `Z` == local.
 *
 * Toggle:
 * - Set `MATCHES_DEV_NOW_ISO` to freeze "now" for lock / score lines
 * - Set to `null` to restore the real clock
 *
 * Bump examples (3pm kickoff slate):
 * - 10m pre-kickoff lock: `'2026-11-07T14:50:00Z'`
 * - at kickoff / live mock: `'2026-11-07T15:00:00Z'`
 * - mid-live:             `'2026-11-07T15:30:00Z'`
 *
 * While non-null (and `__DEV__`), Matches also overlays mock livescores
 * from `./mockLiveScores.ts` so score lines / badges / date flash work
 * without real ingest.
 */
export const MATCHES_DEV_NOW_ISO: string | null = '2026-11-07T15:00:00Z';

/** True while the Matches widget is using the frozen test clock. */
export function isMatchesDevClockActive(): boolean {
  return MATCHES_DEV_NOW_ISO != null && MATCHES_DEV_NOW_ISO !== '';
}

/** Wall clock for Matches lock / `- : -` → `0 : 0` transitions. */
export function matchesNow(): Date {
  if (!isMatchesDevClockActive()) {
    return new Date();
  }
  const parsed = new Date(MATCHES_DEV_NOW_ISO as string);
  if (!Number.isFinite(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

/** Short label for the on-screen banner when the override is active. */
export function matchesDevClockLabel(): string {
  if (!isMatchesDevClockActive()) {
    return '';
  }
  return MATCHES_DEV_NOW_ISO as string;
}
