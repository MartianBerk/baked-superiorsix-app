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
 * Single fetch for the whole window; DateScrubber walks these calendar days
 * (including empty ones). API caps at 7d.
 */
export function adminScrubberRange(now: Date = new Date()): {
  fromDate: string;
  toDate: string;
} {
  const keys = adminScrubberDayKeys(now);
  return {
    fromDate: toLegacyDateParam(keys[0]),
    toDate: toLegacyDateParam(keys[keys.length - 1]),
  };
}

/** UTC day keys for the admin match-picker date scrubber (today … today+6). */
export function adminScrubberDayKeys(now: Date = new Date()): string[] {
  const fromKey = utcDayKey(now);
  const [y, m, d] = fromKey.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) =>
    utcDayKey(new Date(Date.UTC(y, m - 1, d + i, 12))),
  );
}

/** Monday (UTC) of the week containing `dayKey` / `now`. */
export function utcMondayKey(input: string | Date = new Date()): string {
  const key = typeof input === 'string' ? input : utcDayKey(input);
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  // getUTCDay: Sun=0 … Sat=6 → days since Monday
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - sinceMonday);
  return utcDayKey(date);
}

/** Seven UTC day keys Mon…Sun for a Monday-commencing game week. */
export function gameWeekDayKeys(mondayKey: string): string[] {
  const [y, m, d] = mondayKey.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) =>
    utcDayKey(new Date(Date.UTC(y, m - 1, d + i, 12))),
  );
}

/**
 * Monday keys spanning a discovery window used to *find* weeks with
 * Super Six selections. The G/W scrubber itself only lists weeks that
 * actually returned matches — not this full grid.
 */
export function discoveryWeekStartKeys(
  now: Date = new Date(),
  pastWeeks = 12,
  futureWeeks = 4,
): string[] {
  const current = utcMondayKey(now);
  const [y, m, d] = current.split('-').map(Number);
  const keys: string[] = [];
  for (let offset = -pastWeeks; offset <= futureWeeks; offset += 1) {
    keys.push(utcDayKey(new Date(Date.UTC(y, m - 1, d + offset * 7, 12))));
  }
  return keys;
}

/** Flat UTC day keys for the discovery window (Mon…Sun per week). */
export function discoveryDayKeys(
  now: Date = new Date(),
  pastWeeks = 12,
  futureWeeks = 4,
): string[] {
  return discoveryWeekStartKeys(now, pastWeeks, futureWeeks).flatMap(
    gameWeekDayKeys,
  );
}

/**
 * Prefer `preferred` if still available, else the week containing `now`,
 * else the chronologically nearest available Monday.
 */
export function pickGameWeek(
  available: string[],
  preferred: string | null,
  now: Date = new Date(),
): string | null {
  if (available.length === 0) {
    return null;
  }
  if (preferred && available.includes(preferred)) {
    return preferred;
  }
  const current = utcMondayKey(now);
  if (available.includes(current)) {
    return current;
  }
  let best = available[0];
  let bestDist = Math.abs(
    Date.parse(`${best}T12:00:00Z`) - Date.parse(`${current}T12:00:00Z`),
  );
  for (const week of available.slice(1)) {
    const dist = Math.abs(
      Date.parse(`${week}T12:00:00Z`) - Date.parse(`${current}T12:00:00Z`),
    );
    if (dist < bestDist) {
      best = week;
      bestDist = dist;
    }
  }
  return best;
}
