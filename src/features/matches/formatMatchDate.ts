/** Calendar day key (UTC) used for date scrubbing. */
export function utcDayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Legacy-style scrubber label: `Sat 31 Oct`. */
export function formatScrubberDate(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${weekdays[date.getUTCDay()]} ${day} ${months[date.getUTCMonth()]}`;
}

/** Kickoff group header time like `3pm` / `12:30pm` (UTC wall clock). */
export function formatKickoffLabel(iso: string): string {
  const d = new Date(iso);
  let hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }
  if (minutes === 0) {
    return `${hours}${suffix}`;
  }
  return `${hours}:${String(minutes).padStart(2, '0')}${suffix}`;
}

/** Stable minute key for grouping (UTC `HH:MM`). */
export function kickoffMinuteKey(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** BFF legacy query date `dd-mm-yyyy` from a UTC day key. */
export function toLegacyDateParam(dayKey: string): string {
  const [y, m, d] = dayKey.split('-');
  return `${d}-${m}-${y}`;
}

/**
 * Admin listmatches scrubber window: UTC today … today+6 (7 calendar days).
 * Single fetch — DateScrubber is derived from the loaded payload; API caps at 7d.
 */
export function adminScrubberRange(now: Date = new Date()): {
  fromDate: string;
  toDate: string;
} {
  const fromKey = utcDayKey(now);
  const [y, m, d] = fromKey.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + 6, 12));
  return {
    fromDate: toLegacyDateParam(fromKey),
    toDate: toLegacyDateParam(utcDayKey(end)),
  };
}
