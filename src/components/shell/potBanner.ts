/** Someone currently on a perfect slate for the pot banner. */
export type PerfectSixHolder = {
  displayName: string;
  isViewer: boolean;
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

  const total =
    slateSize > 0 && Number.isFinite(slateSize) ? Math.floor(slateSize) : 6;
  const scoreLabel = `${total} / ${total}`;

  const ordered = [
    ...holders.filter((h) => h.isViewer),
    ...holders
      .filter((h) => !h.isViewer)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: 'base',
        }),
      ),
  ];

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
