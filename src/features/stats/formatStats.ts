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

/**
 * n vs n−1 delta label (`up 10%` / `down 5%`).
 * `delta` is percentage points (current − previous).
 */
export function formatRateDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) {
    return '—';
  }
  const abs = Math.abs(rounded);
  return rounded > 0 ? `up ${abs}%` : `down ${abs}%`;
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
