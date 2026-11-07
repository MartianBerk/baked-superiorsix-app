import type { PerfectSixHolder } from './potBanner';

/**
 * TEMPORARY (Martin local preview) — inject the logged-in viewer and Cara
 * both on 6/6 so the share / tie pot-banner copy can be reviewed.
 *
 * Off / remove after testing:
 * - Set `FORCE_VIEWER_AND_OTHER_SIX_CORRECT = false`, or
 * - Delete this file and its import in `AppHeader.tsx`
 *
 * Gated by `__DEV__` so production builds never show it.
 */
export const FORCE_VIEWER_AND_OTHER_SIX_CORRECT: boolean = __DEV__ && true;

/** @deprecated Use FORCE_VIEWER_AND_OTHER_SIX_CORRECT */
export const FORCE_OTHER_PLAYER_SIX_CORRECT = FORCE_VIEWER_AND_OTHER_SIX_CORRECT;

/** Display name used by the temporary other-player mock. */
export const DEV_MOCK_SIX_CORRECT_NAME = 'Cara';

/**
 * Merge viewer + Cara into real 6/6 holders (does not replace real rows;
 * only fills missing sides so copy shows “You and Cara … share the pot”).
 */
export function withDevOtherPlayerSixCorrect(
  holders: PerfectSixHolder[],
): PerfectSixHolder[] {
  if (!FORCE_VIEWER_AND_OTHER_SIX_CORRECT) {
    return holders;
  }

  let next = [...holders];

  if (!next.some((h) => h.isViewer)) {
    next = [{ displayName: 'You', isViewer: true }, ...next];
  }

  const alreadyCara = next.some(
    (h) =>
      !h.isViewer &&
      h.displayName.localeCompare(DEV_MOCK_SIX_CORRECT_NAME, undefined, {
        sensitivity: 'base',
      }) === 0,
  );
  if (!alreadyCara) {
    next = [
      ...next,
      { displayName: DEV_MOCK_SIX_CORRECT_NAME, isViewer: false },
    ];
  }

  return next;
}
