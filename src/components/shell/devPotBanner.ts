/**
 * TEMPORARY (Martin local preview) — force the 6/6 “on to win the pot”
 * header banner as if `correctCount === 6`.
 *
 * Off / remove after testing:
 * - Set `FORCE_SIX_CORRECT_POT_BANNER = false`, or
 * - Delete this file and its import in `AppHeader.tsx`
 *
 * Gated by `__DEV__` so production builds never show it.
 */
export const FORCE_SIX_CORRECT_POT_BANNER: boolean = __DEV__ && true;
