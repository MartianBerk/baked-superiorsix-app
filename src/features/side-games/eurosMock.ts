/**
 * DEV mock Euros fixtures so the player tab is viewable without seed data.
 * Enable with `EXPO_PUBLIC_EUROS_MOCK=1` (default on in `__DEV__` unless set to `0`).
 */

import type {
  EurosMeta,
  SideGameMatch,
  SideGamePrediction,
  SideGameScoreRow,
} from '@/api/sideGames';

export function isEurosMockEnabled(): boolean {
  const flag = process.env.EXPO_PUBLIC_EUROS_MOCK?.trim().toLowerCase();
  if (flag === '0' || flag === 'false') {
    return false;
  }
  if (flag === '1' || flag === 'true') {
    return true;
  }
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** Relative to “today” so the date scrubber lands on live-looking days. */
function dayOffsetIso(daysFromToday: number, hourUtc: number): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysFromToday,
      hourUtc,
      0,
      0,
    ),
  );
  return d.toISOString();
}

export const MOCK_EUROS_META: EurosMeta = {
  open: true,
  buy_in_pence: 200,
  entrant_count: 4,
  prize_pot_pence: 800,
  tournament: {
    id: 1,
    competition_code: 'EC',
    label: 'Euros',
    start_date: dayOffsetIso(-2, 12).slice(0, 10),
    end_date: null,
    buy_in_pence: 200,
    entrant_count: 4,
    prize_pot_pence: 800,
  },
};

export const MOCK_EUROS_MATCHES: SideGameMatch[] = [
  {
    id: 101,
    home_team: 'Germany',
    away_team: 'Scotland',
    home_score: 5,
    away_score: 1,
    status: 'FINISHED',
    match_minute: null,
    match_date: dayOffsetIso(-1, 19),
    matchday: 1,
    extra_time: false,
    penalties: false,
    use_match: true,
  },
  {
    id: 102,
    home_team: 'Hungary',
    away_team: 'Switzerland',
    home_score: 1,
    away_score: 3,
    status: 'FINISHED',
    match_minute: null,
    match_date: dayOffsetIso(-1, 16),
    matchday: 1,
    extra_time: false,
    penalties: false,
    use_match: true,
  },
  {
    id: 103,
    home_team: 'Spain',
    away_team: 'Croatia',
    home_score: 2,
    away_score: 0,
    status: 'IN_PLAY',
    match_minute: 67,
    match_date: dayOffsetIso(0, 16),
    matchday: 1,
    extra_time: false,
    penalties: false,
    use_match: true,
  },
  {
    id: 104,
    home_team: 'Italy',
    away_team: 'Albania',
    home_score: null,
    away_score: null,
    status: 'SCHEDULED',
    match_minute: null,
    match_date: dayOffsetIso(0, 19),
    matchday: 1,
    extra_time: false,
    penalties: false,
    use_match: true,
  },
  {
    id: 105,
    home_team: 'Poland',
    away_team: 'Netherlands',
    home_score: null,
    away_score: null,
    status: 'SCHEDULED',
    match_minute: null,
    match_date: dayOffsetIso(1, 13),
    matchday: 2,
    extra_time: false,
    penalties: false,
    use_match: true,
  },
  {
    id: 106,
    home_team: 'Slovenia',
    away_team: 'Denmark',
    home_score: null,
    away_score: null,
    status: 'SCHEDULED',
    match_minute: null,
    match_date: dayOffsetIso(1, 16),
    matchday: 2,
    extra_time: false,
    penalties: false,
    use_match: true,
  },
  {
    id: 201,
    home_team: 'England',
    away_team: 'France',
    home_score: null,
    away_score: null,
    status: 'SCHEDULED',
    match_minute: null,
    match_date: dayOffsetIso(14, 19),
    matchday: 4,
    extra_time: false,
    penalties: false,
    use_match: true,
  },
];

export const MOCK_EUROS_SCORES: SideGameScoreRow[] = [
  { player: 'Ada', score: 2, bonus: 0, total: 2, auth_id: 'mock-ada' },
  { player: 'Bob', score: 1, bonus: 0, total: 1, auth_id: 'mock-bob' },
  { player: 'Chris', score: 1, bonus: 0, total: 1, auth_id: 'mock-chris' },
  { player: 'Dana', score: 0, bonus: 0, total: 0, auth_id: 'mock-dana' },
];

export const MOCK_EUROS_PREDICTIONS: SideGamePrediction[] = [
  {
    id: 1,
    auth_id: 'mock-ada',
    match_id: 101,
    prediction: 'home',
    plus_ninety: false,
    extra_time: false,
    penalties: false,
    dropped: false,
  },
  {
    id: 2,
    auth_id: 'mock-ada',
    match_id: 102,
    prediction: 'away',
    plus_ninety: false,
    extra_time: false,
    penalties: false,
    dropped: false,
  },
  {
    id: 3,
    auth_id: 'mock-bob',
    match_id: 101,
    prediction: 'home',
    plus_ninety: false,
    extra_time: false,
    penalties: false,
    dropped: false,
  },
];
