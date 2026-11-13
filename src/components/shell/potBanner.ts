/** Someone currently on a perfect slate for the pot banner. */
export type PerfectSixHolder = {
  displayName: string;
  isViewer: boolean;
};

/**
 * Selection-progress leaders for the picking-stage split-pot banner.
 * Live / finished never use this — only perfect X/X there.
 */
export type SplitPotLeaders = {
  holders: PerfectSixHolder[];
};

function formatNameList(names: string[]): string {
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
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

  const names = ordered.map((h) => (h.isViewer ? 'You' : h.displayName));
  return `${formatNameList(names)} have ${scoreLabel} and share the pot`;
}

/**
 * Picking-stage split-pot banner (2+ tied on selection progress only):
 * - You and Cara are on a split pot
 * - Cara and Bob are on a split pot
 * Solo leaders do not get a banner while picking.
 */
export function formatSplitPotBannerLine(
  leaders: SplitPotLeaders | null | undefined,
): string | null {
  if (leaders == null || leaders.holders.length < 2) {
    return null;
  }

  const ordered = orderHolders(leaders.holders);
  const names = ordered.map((h) => (h.isViewer ? 'You' : h.displayName));
  return `${formatNameList(names)} are on a split pot`;
}

/**
 * Players tied at the current max **selection** count (picking stage).
 * Same basis as Scores while picking. Requires 2+ at the max (no solo banner).
 * Includes full-slate ties (max === X).
 */
export function splitPotLeadersFromSelections(
  scored: readonly {
    displayName: string;
    isViewer: boolean;
    selected: number;
  }[],
): SplitPotLeaders | null {
  if (scored.length === 0) {
    return null;
  }

  let max = 0;
  for (const row of scored) {
    const selected = Math.max(0, Math.floor(row.selected));
    if (selected > max) {
      max = selected;
    }
  }

  if (max <= 0) {
    return null;
  }

  const holders = scored
    .filter((row) => Math.floor(row.selected) === max)
    .map((row) => ({
      displayName: row.displayName,
      isViewer: row.isViewer,
    }));

  if (holders.length < 2) {
    return null;
  }

  return { holders };
}
