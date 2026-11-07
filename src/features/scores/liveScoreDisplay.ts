/**
 * Gameday score-line + polling helpers (Martin SS-26 pointers).
 *
 * - Before real scores / while not in-play or finished: `- : -`
 * - In-play or finished with scores: `h : a` (no invented `0 : 0` from clock)
 * - Non-live fixtures stay `- : -` while others are playing
 * - Poll livescores every 2 min from kickoff while any match is playing;
 *   stop until the next kickoff once the live set finishes
 */

export const LOCK_BEFORE_KICKOFF_MS = 10 * 60 * 1000;
export const LIVE_POLL_MS = 2 * 60 * 1000;

const PLAYING_STATUSES = new Set([
  'IN PLAY',
  'IN_PLAY',
  'LIVE',
  '1H',
  '2H',
  'HT',
  'HALF TIME',
  'HALF_TIME',
  'ET',
  'PEN',
  'BREAK',
]);

const FINISHED_STATUSES = new Set([
  'FT',
  'FINISHED',
  'AET',
  'PEN_FT',
  'AWARDED',
]);

export type ScoreLineInputs = {
  matchDateIso: string | null | undefined;
  status: string | null | undefined;
  homeScore: number | null | undefined;
  awayScore: number | null | undefined;
};

export type MatchClock = {
  matchDateIso: string | null | undefined;
  status: string | null | undefined;
};

function kickoffMs(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? '').trim().toUpperCase().replace(/_/g, ' ');
}

export function isPlayingStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return PLAYING_STATUSES.has(normalized) || PLAYING_STATUSES.has(normalized.replace(/ /g, '_'));
}

export function isFinishedStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return (
    FINISHED_STATUSES.has(normalized) ||
    FINISHED_STATUSES.has(normalized.replace(/ /g, '_'))
  );
}

const HALF_TIME_STATUSES = new Set(['HT', 'HALF TIME', 'HALF_TIME']);

/** True while the fixture is at half-time. */
export function isHalfTimeStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return (
    HALF_TIME_STATUSES.has(normalized) ||
    HALF_TIME_STATUSES.has(normalized.replace(/ /g, '_'))
  );
}

export function isPostponedStatus(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'POSTPONED';
}

/** True once `now + 10m >= kickoff` (prediction / expand lock). */
export function isPastKickoffLock(
  matchDateIso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const kickoff = kickoffMs(matchDateIso);
  if (kickoff == null) {
    return false;
  }
  return now.getTime() + LOCK_BEFORE_KICKOFF_MS >= kickoff;
}

/** True once kickoff time has been reached. */
export function hasKickedOff(
  matchDateIso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const kickoff = kickoffMs(matchDateIso);
  if (kickoff == null) {
    return false;
  }
  return now.getTime() >= kickoff;
}

/** True once the fixture has started (kickoff time / in-play / finished). */
export function matchHasStarted(
  matchDateIso: string | null | undefined,
  status: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (isPostponedStatus(status)) {
    return false;
  }
  return (
    hasKickedOff(matchDateIso, now) ||
    isPlayingStatus(status) ||
    isFinishedStatus(status)
  );
}

/**
 * Aligned score text for match headers.
 * Null scores, or not yet in-play/finished → `- : -`.
 * Do not invent `0 : 0` from wall-clock kickoff alone; show `h : a` only
 * when both scores are present and the fixture is playing or finished.
 */
export function formatAlignedScore(
  input: ScoreLineInputs,
  _now: Date = new Date(),
): string {
  void _now;
  if (isPostponedStatus(input.status)) {
    return '- : -';
  }

  if (input.homeScore == null || input.awayScore == null) {
    return '- : -';
  }

  if (!isPlayingStatus(input.status) && !isFinishedStatus(input.status)) {
    return '- : -';
  }

  return `${input.homeScore} : ${input.awayScore}`;
}

/**
 * Trailing clock label once started:
 * - half-time → `HT`
 * - finished → `FT`
 * - else `23'`-style when the API provided a minute
 */
export function formatMatchMinute(
  matchMinute: number | null | undefined,
  matchDateIso: string | null | undefined,
  status: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!matchHasStarted(matchDateIso, status, now)) {
    return null;
  }
  if (isHalfTimeStatus(status)) {
    return 'HT';
  }
  if (isFinishedStatus(status)) {
    return 'FT';
  }
  if (matchMinute == null || !Number.isFinite(matchMinute)) {
    return null;
  }
  return `${Math.trunc(matchMinute)}'`;
}

/** Flash the date only while at least one match has an in-play status. */
export function anyMatchPlaying(matches: MatchClock[]): boolean {
  return matches.some((match) => isPlayingStatus(match.status));
}

/**
 * Poll livescores from first kickoff while unfinished live-set matches remain;
 * pause once that set is finished until the next future kickoff.
 */
export function shouldPollLiveScores(
  matches: MatchClock[],
  now: Date = new Date(),
): boolean {
  if (matches.length === 0) {
    return false;
  }

  const nowMs = now.getTime();
  const active = matches.filter((m) => !isPostponedStatus(m.status));
  if (active.length === 0) {
    return false;
  }

  if (anyMatchPlaying(active)) {
    return true;
  }

  let anyKickedOffUnfinished = false;
  let anyFuture = false;
  let anyKickedOff = false;

  for (const match of active) {
    const kickoff = kickoffMs(match.matchDateIso);
    if (kickoff == null) {
      continue;
    }
    if (kickoff > nowMs) {
      anyFuture = true;
      continue;
    }
    anyKickedOff = true;
    if (!isFinishedStatus(match.status)) {
      anyKickedOffUnfinished = true;
    }
  }

  if (!anyKickedOff) {
    return false;
  }
  if (anyKickedOffUnfinished) {
    return true;
  }
  // Finished set — pause until next kickoff (caller schedules wake via
  // msUntilNextKickoff). `anyFuture` kept for readability / future use.
  void anyFuture;
  return false;
}

/** ms until the next future kickoff (for restarting poll), or null. */
export function msUntilNextKickoff(
  matches: MatchClock[],
  now: Date = new Date(),
): number | null {
  const nowMs = now.getTime();
  let next: number | null = null;
  for (const match of matches) {
    if (isPostponedStatus(match.status)) {
      continue;
    }
    const kickoff = kickoffMs(match.matchDateIso);
    if (kickoff == null || kickoff <= nowMs) {
      continue;
    }
    if (next == null || kickoff < next) {
      next = kickoff;
    }
  }
  return next == null ? null : next - nowMs;
}
