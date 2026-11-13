/** Someone currently on a perfect slate for the pot banner. */
export type PerfectSixHolder = {
  displayName: string;
  isViewer: boolean;
};

/**
 * Identical-prediction-map leaders for the picking-stage split-pot banner.
 * Live / finished never use this — only perfect X/X (score) there.
 */
export type SplitPotLeaders = {
  holders: PerfectSixHolder[];
};

/** matchId → H/D/A (or null / missing when unset). */
export type SplitPotPredictionMap = Readonly<
  Record<number, string | null | undefined>
>;

/**
 * Space-limited subject for tie banners:
 * - exactly 2 → `You and Cara` / `Cara and Bob`
 * - 3+ with viewer → `You +n` (n = others)
 * - 3+ without viewer → `Cara +n` (first sorted name + remaining)
 */
function formatCompactTieSubject(ordered: PerfectSixHolder[]): string {
  if (ordered.length === 2) {
    const names = ordered.map((h) => (h.isViewer ? 'You' : h.displayName));
    return `${names[0]} and ${names[1]}`;
  }

  const viewer = ordered.find((h) => h.isViewer);
  if (viewer) {
    return `You +${ordered.length - 1}`;
  }

  const first = ordered[0]?.displayName ?? 'Player';
  return `${first} +${ordered.length - 1}`;
}

function orderHolders(holders: PerfectSixHolder[]): PerfectSixHolder[] {
  return [
    ...holders.filter((h) => h.isViewer),
    ...holders
      .filter((h) => !h.isViewer)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: 'base',
        }),
      ),
  ];
}

function resolveSlateTotal(slateSize: number): number {
  return slateSize > 0 && Number.isFinite(slateSize) ? Math.floor(slateSize) : 6;
}

/**
 * Perfect-slate pot banner (live/finished when someone is on X/X):
 * - You have X / X and have the pot
 * - Cara has X / X and has the pot
 * - You and Cara have X / X and share the pot
 * - You +3 have X / X and share the pot  (3+ with viewer)
 * - Cara +2 have X / X and share the pot  (3+ others only)
 */
export function formatPotBannerLine(
  holders: PerfectSixHolder[],
  slateSize = 6,
): string | null {
  if (holders.length === 0) {
    return null;
  }

  const total = resolveSlateTotal(slateSize);
  const scoreLabel = `${total} / ${total}`;
  const ordered = orderHolders(holders);

  if (ordered.length === 1) {
    const only = ordered[0];
    if (only.isViewer) {
      return `You have ${scoreLabel} and have the pot`;
    }
    return `${only.displayName} has ${scoreLabel} and has the pot`;
  }

  return `${formatCompactTieSubject(ordered)} have ${scoreLabel} and share the pot`;
}

/**
 * Picking-stage split-pot banner (2+ with identical slate prediction maps, viewer among them):
 * - You and Cara are on a split pot
 * - You +3 are on a split pot
 * Others-only ties and solo leaders: no picking banner.
 */
export function formatSplitPotBannerLine(
  leaders: SplitPotLeaders | null | undefined,
): string | null {
  if (leaders == null || leaders.holders.length < 2) {
    return null;
  }
  if (!leaders.holders.some((h) => h.isViewer)) {
    return null;
  }

  const ordered = orderHolders(leaders.holders);
  return `${formatCompactTieSubject(ordered)} are on a split pot`;
}

function pickForMatch(
  predictions: SplitPotPredictionMap,
  matchId: number,
): string | null {
  const value = predictions[matchId];
  return value == null || value === '' ? null : value;
}

/** True when both maps agree on every slate match (null/missing equal; set ≠ missing). */
export function predictionMapsEqualForSlate(
  a: SplitPotPredictionMap,
  b: SplitPotPredictionMap,
  slateMatchIds: readonly number[],
): boolean {
  for (const matchId of slateMatchIds) {
    if (pickForMatch(a, matchId) !== pickForMatch(b, matchId)) {
      return false;
    }
  }
  return true;
}

function hasAnySlatePick(
  predictions: SplitPotPredictionMap,
  slateMatchIds: readonly number[],
): boolean {
  for (const matchId of slateMatchIds) {
    if (pickForMatch(predictions, matchId) != null) {
      return true;
    }
  }
  return false;
}

/**
 * Players whose prediction maps are **identical** to the viewer’s over the
 * current slate match ids (picking stage). Not selection-count ties.
 * Requires viewer among them, viewer has ≥1 pick, and ≥1 other with the same map.
 */
export function splitPotLeadersFromMatchingPredictions(
  scored: readonly {
    displayName: string;
    isViewer: boolean;
    predictions: SplitPotPredictionMap;
  }[],
  slateMatchIds: readonly number[],
): SplitPotLeaders | null {
  if (scored.length === 0 || slateMatchIds.length === 0) {
    return null;
  }

  const viewer = scored.find((row) => row.isViewer);
  if (viewer == null || !hasAnySlatePick(viewer.predictions, slateMatchIds)) {
    return null;
  }

  const holders = scored
    .filter((row) =>
      predictionMapsEqualForSlate(
        row.predictions,
        viewer.predictions,
        slateMatchIds,
      ),
    )
    .map((row) => ({
      displayName: row.displayName,
      isViewer: row.isViewer,
    }));

  if (holders.length < 2 || !holders.some((h) => h.isViewer)) {
    return null;
  }

  return { holders };
}
