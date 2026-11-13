/** Someone currently on a perfect slate for the pot banner. */
export type PerfectSixHolder = {
  displayName: string;
  isViewer: boolean;
};

/** Current leaders not yet perfect (potential pot banner). */
export type PotentialPotLeaders = {
  holders: PerfectSixHolder[];
  /** Shared correct count for the leaders (0 < score < slateSize). */
  score: number;
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
 * Pot banner copy (X = slate size):
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
 * Potential pot banner (0 < score < slateSize):
 * - You have 4 / 6 and are potentially on for the pot
 * - Cara has 4 / 6 and is potentially on for the pot
 * - You and Cara have 4 / 6 and potentially share the pot
 */
export function formatPotentialPotBannerLine(
  leaders: PotentialPotLeaders | null | undefined,
  slateSize = 6,
): string | null {
  if (leaders == null || leaders.holders.length === 0) {
    return null;
  }

  const total = resolveSlateTotal(slateSize);
  const score = Math.floor(leaders.score);
  if (!(score > 0 && score < total)) {
    return null;
  }

  const scoreLabel = `${score} / ${total}`;
  const ordered = orderHolders(leaders.holders);

  if (ordered.length === 1) {
    const only = ordered[0];
    if (only.isViewer) {
      return `You have ${scoreLabel} and are potentially on for the pot`;
    }
    return `${only.displayName} has ${scoreLabel} and is potentially on for the pot`;
  }

  const names = ordered.map((h) => (h.isViewer ? 'You' : h.displayName));
  return `${formatNameList(names)} have ${scoreLabel} and potentially share the pot`;
}

/**
 * Leaders tied at the current max correct count when that max is
 * still below a perfect slate (and above zero).
 */
export function potentialLeadersFromScores(
  scored: readonly {
    displayName: string;
    isViewer: boolean;
    correct: number;
  }[],
  slateSize: number,
): PotentialPotLeaders | null {
  const need = resolveSlateTotal(slateSize);
  if (scored.length === 0) {
    return null;
  }

  let max = 0;
  for (const row of scored) {
    const correct = Math.max(0, Math.floor(row.correct));
    if (correct > max) {
      max = correct;
    }
  }

  // Perfect already exists, or nobody has a correct pick yet.
  if (max <= 0 || max >= need) {
    return null;
  }

  const holders = scored
    .filter((row) => Math.floor(row.correct) === max)
    .map((row) => ({
      displayName: row.displayName,
      isViewer: row.isViewer,
    }));

  if (holders.length === 0) {
    return null;
  }

  return { holders, score: max };
}
