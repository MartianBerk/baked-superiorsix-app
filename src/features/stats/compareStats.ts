import type {
  AggregatePlayerStats,
  AggregateScorePoint,
} from '@/api/superiorsix';

/** One roster row for Stats: current (n) rate + previous (n−1) for delta. */
export type StatsCompareRow = {
  playerid: string;
  name: string;
  correct: number;
  matches: number;
  /** Current round (n) success rate — FE renders; backend/mock precomputes. */
  success_rate: number;
  /** Previous closed round (n−1) success rate, when known. */
  previous_success_rate: number | null;
  /**
   * `success_rate - previous_success_rate` in percentage points.
   * Null when previous is unavailable.
   */
  rate_delta: number | null;
  scores: AggregateScorePoint[];
};

function rateDelta(
  current: number,
  previous: number | null | undefined,
): number | null {
  if (previous == null || !Number.isFinite(previous) || !Number.isFinite(current)) {
    return null;
  }
  return current - previous;
}

/** Merge current (n) rows with previous (n−1) rates by `playerid`. */
export function mergeCompareRows(
  current: AggregatePlayerStats[],
  previous: AggregatePlayerStats[],
): StatsCompareRow[] {
  const previousById = new Map(
    previous.map((row) => [row.playerid, row] as const),
  );
  const rows: StatsCompareRow[] = current.map((row) => {
    const prior = previousById.get(row.playerid);
    const previousRate = prior?.success_rate ?? null;
    return {
      playerid: row.playerid,
      name: row.name,
      correct: row.correct,
      matches: row.matches,
      success_rate: row.success_rate,
      previous_success_rate: previousRate,
      rate_delta: rateDelta(row.success_rate, previousRate),
      scores: row.scores,
    };
  });

  // Include previous-only players (no current row yet) so the list stays complete.
  for (const prior of previous) {
    if (rows.some((row) => row.playerid === prior.playerid)) {
      continue;
    }
    rows.push({
      playerid: prior.playerid,
      name: prior.name,
      correct: 0,
      matches: 0,
      success_rate: 0,
      previous_success_rate: prior.success_rate,
      rate_delta: rateDelta(0, prior.success_rate),
      scores: [],
    });
  }

  rows.sort(
    (a, b) =>
      b.success_rate - a.success_rate ||
      a.name.localeCompare(b.name) ||
      a.playerid.localeCompare(b.playerid),
  );
  return rows;
}
