import { formatScrubberDate, utcDayKey } from '@/features/matches/formatMatchDate';

/** Format jackpot pence as £n / £n.nn. */
export function formatJackpotPounds(pence: number): string {
  const pounds = pence / 100;
  return `£${pounds.toFixed(pence % 100 === 0 ? 0 : 2)}`;
}

/** Round success rate for display (`67%`). */
export function formatSuccessRate(rate: number): string {
  if (!Number.isFinite(rate)) {
    return '—';
  }
  return `${Math.round(rate)}%`;
}

/** Compact day label for graph axis (`01 Feb`). */
export function formatScoreDayLabel(isoDate: string): string {
  const key = isoDate.includes('T') ? utcDayKey(isoDate) : isoDate.slice(0, 10);
  const scrubber = formatScrubberDate(key);
  // `Sat 01 Feb` → `01 Feb`
  const parts = scrubber.split(' ');
  if (parts.length >= 3) {
    return `${parts[1]} ${parts[2]}`;
  }
  return scrubber;
}

/** Longer winners date (`01 Feb 2026`). */
export function formatWinnerDate(isoDate: string): string {
  const key = isoDate.includes('T') ? utcDayKey(isoDate) : isoDate.slice(0, 10);
  const [y, m, d] = key.split('-').map(Number);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (!y || !m || !d) {
    return isoDate;
  }
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}
