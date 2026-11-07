/** Someone currently on 6/6 for the pot banner. */
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
 * Pot banner copy:
 * - You have 6 / 6 and have the pot
 * - Cara has 6 / 6 and has the pot
 * - You and Cara have 6 / 6 and share the pot
 */
export function formatPotBannerLine(
  holders: PerfectSixHolder[],
): string | null {
  if (holders.length === 0) {
    return null;
  }

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
      return 'You have 6 / 6 and have the pot';
    }
    return `${only.displayName} has 6 / 6 and has the pot`;
  }

  const names = ordered.map((h) => (h.isViewer ? 'You' : h.displayName));
  return `${formatNameList(names)} have 6 / 6 and share the pot`;
}
