/**
 * TEMP SS-28 — removable __DEV__ fixtures when the local stats DB is empty.
 * Delete this file (and its imports) once seed / real rounds exist.
 *
 * Provides both current (n) and previous (n−1) rates so the Stats view can
 * demo green-up / red-down deltas without a second aggregate API.
 */

import type {
  AggregatePlayerStats,
  AggregateStatsResponse,
  HistoricRound,
  HistoricRoundsResponse,
} from '@/api/superiorsix';

/** Flip to false to force live empty payloads while still in __DEV__. */
export const USE_DEV_STATS_MOCK = true;

const MOCK_VIEWER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MOCK_BOB_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MOCK_CARA_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MOCK_DAN_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

/** Stable auth_id used so a signed-in mock viewer can match graph highlight. */
export const MOCK_STATS_VIEWER_AUTH_ID = MOCK_VIEWER_ID;

/** Current round (n) — primary Stats rates + graph day series. */
const MOCK_CURRENT: AggregatePlayerStats[] = [
  {
    playerid: MOCK_VIEWER_ID,
    name: 'Ada Lovelace',
    correct: 4,
    matches: 6,
    success_rate: 66.67,
    scores: [
      { name: 'Ada Lovelace', date: '2026-03-01', score: 1, matches: 1 },
      { name: 'Ada Lovelace', date: '2026-03-08', score: 2, matches: 2 },
      { name: 'Ada Lovelace', date: '2026-03-15', score: 1, matches: 2 },
      { name: 'Ada Lovelace', date: '2026-03-22', score: 0, matches: 1 },
    ],
  },
  {
    playerid: MOCK_BOB_ID,
    name: 'Bob Builder',
    correct: 3,
    matches: 6,
    success_rate: 50.0,
    scores: [
      { name: 'Bob Builder', date: '2026-03-01', score: 0, matches: 1 },
      { name: 'Bob Builder', date: '2026-03-08', score: 1, matches: 2 },
      { name: 'Bob Builder', date: '2026-03-15', score: 1, matches: 2 },
      { name: 'Bob Builder', date: '2026-03-22', score: 1, matches: 1 },
    ],
  },
  {
    playerid: MOCK_CARA_ID,
    name: 'Cara Chase',
    correct: 4,
    matches: 6,
    success_rate: 66.67,
    scores: [
      { name: 'Cara Chase', date: '2026-03-01', score: 1, matches: 1 },
      { name: 'Cara Chase', date: '2026-03-08', score: 1, matches: 2 },
      { name: 'Cara Chase', date: '2026-03-15', score: 2, matches: 2 },
      { name: 'Cara Chase', date: '2026-03-22', score: 0, matches: 1 },
    ],
  },
  {
    playerid: MOCK_DAN_ID,
    name: 'Dan Drift',
    correct: 2,
    matches: 6,
    success_rate: 33.33,
    scores: [
      { name: 'Dan Drift', date: '2026-03-01', score: 0, matches: 1 },
      { name: 'Dan Drift', date: '2026-03-08', score: 1, matches: 2 },
      { name: 'Dan Drift', date: '2026-03-15', score: 0, matches: 2 },
      { name: 'Dan Drift', date: '2026-03-22', score: 1, matches: 1 },
    ],
  },
];

/**
 * Previous closed round (n−1) — SS-18 `/stats/aggregate` shape.
 * Chosen so demos show both up and down deltas vs MOCK_CURRENT:
 * Ada −5pp, Bob +10pp, Cara +17pp, Dan flat-ish (−0).
 */
const MOCK_PREVIOUS: AggregatePlayerStats[] = [
  {
    playerid: MOCK_VIEWER_ID,
    name: 'Ada Lovelace',
    correct: 5,
    matches: 7,
    success_rate: 71.43,
    scores: [
      { name: 'Ada Lovelace', date: '2026-02-01', score: 2, matches: 2 },
      { name: 'Ada Lovelace', date: '2026-02-08', score: 2, matches: 2 },
      { name: 'Ada Lovelace', date: '2026-02-15', score: 1, matches: 3 },
    ],
  },
  {
    playerid: MOCK_BOB_ID,
    name: 'Bob Builder',
    correct: 2,
    matches: 5,
    success_rate: 40.0,
    scores: [
      { name: 'Bob Builder', date: '2026-02-01', score: 1, matches: 2 },
      { name: 'Bob Builder', date: '2026-02-08', score: 1, matches: 3 },
    ],
  },
  {
    playerid: MOCK_CARA_ID,
    name: 'Cara Chase',
    correct: 3,
    matches: 6,
    success_rate: 50.0,
    scores: [
      { name: 'Cara Chase', date: '2026-02-01', score: 1, matches: 2 },
      { name: 'Cara Chase', date: '2026-02-08', score: 2, matches: 4 },
    ],
  },
  {
    playerid: MOCK_DAN_ID,
    name: 'Dan Drift',
    correct: 2,
    matches: 6,
    success_rate: 33.33,
    scores: [
      { name: 'Dan Drift', date: '2026-02-01', score: 1, matches: 3 },
      { name: 'Dan Drift', date: '2026-02-08', score: 1, matches: 3 },
    ],
  },
];

const MOCK_WINNERS: HistoricRound[] = [
  {
    round_id: 3,
    start_date: '2026-02-01',
    end_date: '2026-02-22',
    matches: 4,
    players: 14,
    jackpot: 8400,
    winner: 'Bob Builder',
    winner_ids: [MOCK_BOB_ID],
  },
  {
    round_id: 2,
    start_date: '2026-01-10',
    end_date: '2026-01-28',
    matches: 3,
    players: 14,
    jackpot: 5600,
    winner: 'Ada Lovelace & Cara Chase',
    winner_ids: [MOCK_VIEWER_ID, MOCK_CARA_ID],
  },
  {
    round_id: 1,
    start_date: '2025-12-01',
    end_date: '2025-12-20',
    matches: 3,
    players: 12,
    jackpot: 2800,
    winner: 'Dan Drift',
    winner_ids: [MOCK_DAN_ID],
  },
];

function cloneAggregate(rows: AggregatePlayerStats[]): AggregatePlayerStats[] {
  return rows.map((row) => ({
    ...row,
    scores: row.scores.map((point) => ({ ...point })),
  }));
}

export function mockCurrentStats(): AggregateStatsResponse {
  return { stats: cloneAggregate(MOCK_CURRENT) };
}

export function mockPreviousStats(): AggregateStatsResponse {
  return { stats: cloneAggregate(MOCK_PREVIOUS) };
}

/** @deprecated Prefer mockPreviousStats — kept for older call sites. */
export function mockAggregateStats(): AggregateStatsResponse {
  return mockPreviousStats();
}

export function mockWinnersArchive(): HistoricRoundsResponse {
  return {
    rounds: MOCK_WINNERS.map((row) => ({
      ...row,
      winner_ids: [...row.winner_ids],
    })),
  };
}

export type DevStatsFallback<T> = {
  data: T;
  /** True when TEMP mock fixtures were substituted for empty live data. */
  usedMock: boolean;
};

/**
 * Prefer live n−1 aggregate; fall back to TEMP previous mock when empty.
 */
export function withDevPreviousFallback(
  live: AggregateStatsResponse,
): DevStatsFallback<AggregateStatsResponse> {
  if (!__DEV__ || !USE_DEV_STATS_MOCK || live.stats.length > 0) {
    return { data: live, usedMock: false };
  }
  return { data: mockPreviousStats(), usedMock: true };
}

/**
 * Current (n) rates: TEMP mock only for now (SS-18 exposes n−1 aggregate).
 * When live already has a current payload, pass it through.
 */
export function withDevCurrentFallback(
  live: AggregateStatsResponse,
): DevStatsFallback<AggregateStatsResponse> {
  if (!__DEV__ || !USE_DEV_STATS_MOCK || live.stats.length > 0) {
    return { data: live, usedMock: false };
  }
  return { data: mockCurrentStats(), usedMock: true };
}

/** @deprecated Prefer withDevPreviousFallback. */
export function withDevAggregateFallback(
  live: AggregateStatsResponse,
): DevStatsFallback<AggregateStatsResponse> {
  return withDevPreviousFallback(live);
}

export function withDevWinnersFallback(
  live: HistoricRoundsResponse,
): DevStatsFallback<HistoricRoundsResponse> {
  if (!__DEV__ || !USE_DEV_STATS_MOCK || live.rounds.length > 0) {
    return { data: live, usedMock: false };
  }
  return { data: mockWinnersArchive(), usedMock: true };
}
