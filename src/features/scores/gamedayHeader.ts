/**
 * Header chrome helpers for SS-26 / SS-16.
 *
 * Round N = latest subround sequence (`meta.round_number`).
 * Prize pot (pence) = buy_in_pence × full_roster × subround_number
 *   e.g. 14 × £2 → £28, £56, £84…
 *
 * Prefer BE `meta.prize_pot_pence` when present; FE formula is the fallback.
 */

/** Pot in pence from buy-in, full roster size, and subround sequence. */
export function prizePotPence(
  buyInPence: number,
  fullRoster: number,
  subroundNumber: number,
): number {
  if (
    !Number.isFinite(buyInPence) ||
    !Number.isFinite(fullRoster) ||
    !Number.isFinite(subroundNumber)
  ) {
    return 0;
  }
  if (buyInPence < 0 || fullRoster < 0 || subroundNumber < 1) {
    return 0;
  }
  return Math.round(buyInPence * fullRoster * subroundNumber);
}

/** Format pence as `£28` / `£14.50` (trim trailing .00). */
export function formatPrizePounds(pence: number): string {
  if (!Number.isFinite(pence) || pence <= 0) {
    return '£X';
  }
  const pounds = pence / 100;
  if (Number.isInteger(pounds)) {
    return `£${pounds}`;
  }
  return `£${pounds.toFixed(2)}`;
}

/** Round label for the shell header (`# n`, same as SubroundScrubber). */
export function formatRoundLabel(subroundNumber: number | null | undefined): string {
  if (subroundNumber == null || !Number.isFinite(subroundNumber) || subroundNumber < 1) {
    return '# N';
  }
  return `# ${Math.trunc(subroundNumber)}`;
}
