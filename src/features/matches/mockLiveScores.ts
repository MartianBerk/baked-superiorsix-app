/**
 * Temporary Matches mock livescores (Martin local gameday UI test).
 *
 * Active only while the Matches dev clock is set and `__DEV__` is true.
 * Invents plausible H/A score lines + IN PLAY status so badges / flash /
 * live chrome can be reviewed without real ingest.
 *
 * Off: set `MATCHES_DEV_NOW_ISO = null` in `./devClock.ts`.
 */

import type {
  LiveScoreFixture,
  LiveScoresBoard,
  Subround,
} from '@/api/superiorsix';

import { isMatchesDevClockActive } from './devClock';

/** Plausible mid-half scores keyed by Super Six game_number (1–6). */
const MOCK_BY_GAME: Record<
  number,
  { home: number; away: number; minute: number }
> = {
  1: { home: 2, away: 0, minute: 23 },
  2: { home: 1, away: 1, minute: 18 },
  3: { home: 0, away: 1, minute: 31 },
  4: { home: 1, away: 0, minute: 12 },
  5: { home: 0, away: 0, minute: 8 },
  6: { home: 2, away: 1, minute: 41 },
};

type SlateFixture = {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  game_number?: number | null;
  subround_id?: number | null;
  status?: string;
  home_score?: number | null;
  away_score?: number | null;
  match_minute?: number | null;
};

export function isMatchesDevMockScoresActive(): boolean {
  return __DEV__ && isMatchesDevClockActive();
}

function mockForGame(gameNumber: number | null | undefined, matchId: number) {
  const key =
    gameNumber != null && gameNumber >= 1 && gameNumber <= 6
      ? gameNumber
      : ((Math.abs(matchId) % 6) + 1);
  return MOCK_BY_GAME[key] ?? { home: 1, away: 0, minute: 15 };
}

function toMockFixture(row: SlateFixture): LiveScoreFixture {
  const mock = mockForGame(row.game_number, row.id);
  return {
    id: row.id,
    home_team: row.home_team,
    away_team: row.away_team,
    home_score: mock.home,
    away_score: mock.away,
    status: 'IN PLAY',
    match_date: row.match_date,
    match_minute: mock.minute,
    game_number: row.game_number ?? null,
    subround_id: row.subround_id ?? null,
  };
}

/**
 * Overlay invented live scores onto a livescores board (or build from the
 * already-loaded slate when the API returned empty / SCHEDULED rows).
 */
export function withDevMockLiveScores(
  board: LiveScoresBoard,
  fallbackMatches: SlateFixture[],
  subround: Subround | null = null,
): LiveScoresBoard {
  if (!isMatchesDevMockScoresActive()) {
    return board;
  }

  const source: SlateFixture[] =
    board.matches.length > 0 ? board.matches : fallbackMatches;
  if (source.length === 0) {
    return board;
  }

  const matches = source.map(toMockFixture);
  const kickoffs = matches
    .map((m) => m.match_date)
    .filter(Boolean)
    .sort();

  return {
    ...board,
    scores: board.scores,
    subround: board.subround ?? subround,
    matches,
    match_count: matches.length,
    live: true,
    min_kickoff: board.min_kickoff ?? kickoffs[0] ?? null,
    max_kickoff: board.max_kickoff ?? kickoffs[kickoffs.length - 1] ?? null,
    next_kickoff: null,
  };
}

export function emptyLiveScoresBoard(): LiveScoresBoard {
  return {
    scores: [],
    subround: null,
    matches: [],
    match_count: 0,
    live: false,
    min_kickoff: null,
    max_kickoff: null,
    next_kickoff: null,
  };
}
