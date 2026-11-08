/**
 * Euros + World Cup API client (SS-29 / SS-141).
 *
 * Activate contracts: baked-superiorsix PR #40
 * (`cursor/ss29-side-game-activate-apis-ce1d`) — see
 * `/cursor/stores/self/internal/ss29-activate-apis.md`.
 *
 * Close: FE posts `{ winner_ids }` (no end_date). BE may still only accept
 * optional `end_date` until a parallel worker lands winners on endtournament.
 */

import {
  isEurosMockEnabled,
  MOCK_EUROS_MATCHES,
  MOCK_EUROS_META,
  MOCK_EUROS_PREDICTIONS,
  MOCK_EUROS_SCORES,
} from '@/features/side-games/eurosMock';

import { apiFetch, readApiJson } from './client';
import { ApiError } from './errors';

export type SideGameKind = 'euros' | 'worldcup';

export type SideGamePredictionChoice = 'home' | 'draw' | 'away';

export type SideGameMatch = {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  match_minute: number | null;
  match_date: string;
  matchday: number;
  extra_time: boolean;
  penalties: boolean;
  use_match: boolean;
};

export type SideGameScoreRow = {
  player: string;
  score: number;
  bonus: number;
  total: number;
  auth_id: string | null;
};

export type SideGamePrediction = {
  id: number;
  auth_id: string;
  match_id: number;
  prediction: SideGamePredictionChoice;
  plus_ninety: boolean;
  extra_time: boolean;
  penalties: boolean;
  dropped: boolean;
};

export type EurosTournament = {
  id: number;
  competition_code: string;
  label: string;
  start_date: string;
  end_date: string | null;
  buy_in_pence: number;
  entrant_count: number;
  prize_pot_pence: number;
};

export type EurosMeta = {
  open: boolean;
  buy_in_pence: number;
  entrant_count: number;
  prize_pot_pence: number;
  tournament: EurosTournament | null;
};

/** World Cup public meta (`GET /worldcup/meta`). */
export type WorldcupMeta = {
  buy_in_pence: number;
  participant_count: number;
  pot_pence: number;
  /** SS-141 — false when absent (pre-merge) or closed. */
  open: boolean;
};

export type OpenEurosPayload = {
  startDate: string;
  buyInPence: number;
  /** Selected Super Six roster auth_id UUIDs (required, non-empty). */
  entrantIds: string[];
  label?: string;
};

export type OpenWorldcupPayload = {
  buyInPence: number;
  /** Selected Super Six roster auth_id UUIDs (required, non-empty). */
  entrantIds: string[];
};

/** Close body — winners only (no end_date in the admin UI). */
export type EndSideGamePayload = {
  /** Roster auth_id UUIDs; at least one required by FE. */
  winnerIds: string[];
};

export function sideGameLabel(kind: SideGameKind): string {
  return kind === 'euros' ? 'Euros' : 'World Cup';
}

function gameUnreachable(): ApiError {
  return new ApiError(
    0,
    'Could not reach baked-superiorsix. Is local-dev up on :8030?',
  );
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asChoice(value: unknown): SideGamePredictionChoice | null {
  if (value === 'home' || value === 'draw' || value === 'away') {
    return value;
  }
  return null;
}

function nullableNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeMatch(raw: Record<string, unknown>): SideGameMatch {
  return {
    id: asNumber(raw.id),
    home_team: asString(raw.home_team),
    away_team: asString(raw.away_team),
    home_score: nullableNumber(raw.home_score),
    away_score: nullableNumber(raw.away_score),
    status: asString(raw.status, 'SCHEDULED'),
    match_minute: nullableNumber(raw.match_minute),
    match_date: asString(raw.match_date),
    matchday: asNumber(raw.matchday, 1),
    extra_time: asBool(raw.extra_time),
    penalties: asBool(raw.penalties),
    use_match: raw.use_match == null ? true : asBool(raw.use_match, true),
  };
}

function normalizeScore(raw: Record<string, unknown>): SideGameScoreRow {
  return {
    player: asString(raw.player),
    score: asNumber(raw.score),
    bonus: asNumber(raw.bonus),
    total: asNumber(raw.total),
    auth_id: raw.auth_id == null ? null : asString(raw.auth_id, String(raw.auth_id)),
  };
}

function normalizePrediction(raw: Record<string, unknown>): SideGamePrediction | null {
  const choice = asChoice(raw.prediction);
  if (!choice) {
    return null;
  }
  return {
    id: asNumber(raw.id),
    auth_id: asString(raw.auth_id, String(raw.auth_id ?? '')),
    match_id: asNumber(raw.match_id),
    prediction: choice,
    plus_ninety: asBool(raw.plus_ninety),
    extra_time: asBool(raw.extra_time),
    penalties: asBool(raw.penalties),
    dropped: asBool(raw.dropped),
  };
}

function normalizeEurosTournament(
  raw: Record<string, unknown> | null | undefined,
): EurosTournament | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return {
    id: asNumber(raw.id),
    competition_code: asString(raw.competition_code, 'EC'),
    label: asString(raw.label, 'European Championship'),
    start_date: asString(raw.start_date),
    end_date: raw.end_date == null ? null : asString(raw.end_date),
    buy_in_pence: asNumber(raw.buy_in_pence),
    entrant_count: asNumber(raw.entrant_count),
    prize_pot_pence: asNumber(raw.prize_pot_pence),
  };
}

function normalizeEurosMeta(body: Record<string, unknown>): EurosMeta {
  const metaRaw =
    body.meta && typeof body.meta === 'object'
      ? (body.meta as Record<string, unknown>)
      : body;
  return {
    open: asBool(metaRaw.open),
    buy_in_pence: asNumber(metaRaw.buy_in_pence),
    entrant_count: asNumber(metaRaw.entrant_count),
    prize_pot_pence: asNumber(metaRaw.prize_pot_pence),
    tournament: normalizeEurosTournament(
      metaRaw.tournament as Record<string, unknown> | null | undefined,
    ),
  };
}

function normalizeWorldcupMeta(body: Record<string, unknown>): WorldcupMeta {
  return {
    buy_in_pence: asNumber(body.buy_in_pence),
    participant_count: asNumber(body.participant_count),
    pot_pence: asNumber(body.pot_pence),
    // SS-141: show WC tab only when open === true (absent → closed).
    open: asBool(body.open, false),
  };
}

/** Nav visibility for World Cup — `GET /worldcup/meta` → `open`. */
export function isWorldcupOpen(meta: WorldcupMeta | null | undefined): boolean {
  return Boolean(meta?.open);
}

export function isEurosOpen(meta: EurosMeta | null | undefined): boolean {
  return Boolean(meta?.open);
}

export async function getEurosMeta(): Promise<EurosMeta> {
  if (isEurosMockEnabled()) {
    return MOCK_EUROS_META;
  }
  let response: Response;
  try {
    response = await apiFetch('game', '/euros/meta');
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  return normalizeEurosMeta(body ?? {});
}

export async function getWorldcupMeta(): Promise<WorldcupMeta> {
  let response: Response;
  try {
    response = await apiFetch('game', '/worldcup/meta');
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  return normalizeWorldcupMeta(body ?? {});
}

export async function listSideGameMatches(
  kind: SideGameKind,
): Promise<SideGameMatch[]> {
  if (kind === 'euros' && isEurosMockEnabled()) {
    return MOCK_EUROS_MATCHES.filter((m) => m.use_match);
  }
  const path = kind === 'euros' ? '/euros/matches' : '/worldcup/matches';
  let response: Response;
  try {
    response = await apiFetch('game', path);
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ matches?: unknown[] }>(response);
  const rows = Array.isArray(body?.matches) ? body.matches : [];
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map(normalizeMatch)
    .filter((m) => m.use_match && Number.isFinite(m.id) && m.id > 0);
}

export async function listSideGameScores(
  kind: SideGameKind,
  token?: string | null,
): Promise<SideGameScoreRow[]> {
  if (kind === 'euros' && isEurosMockEnabled()) {
    return MOCK_EUROS_SCORES;
  }
  const path = kind === 'euros' ? '/euros/scores' : '/worldcup/scores';
  let response: Response;
  try {
    response = await apiFetch('game', path, { token: token ?? undefined });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ scores?: unknown[] }>(response);
  const rows = Array.isArray(body?.scores) ? body.scores : [];
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map(normalizeScore);
}

export async function listSideGamePredictions(
  kind: SideGameKind,
): Promise<SideGamePrediction[]> {
  if (kind === 'euros' && isEurosMockEnabled()) {
    return MOCK_EUROS_PREDICTIONS.filter((p) => !p.dropped);
  }
  const path =
    kind === 'euros' ? '/euros/listpredictions' : '/worldcup/listpredictions';
  let response: Response;
  try {
    response = await apiFetch('game', path);
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ predictions?: unknown[] }>(response);
  const rows = Array.isArray(body?.predictions) ? body.predictions : [];
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map(normalizePrediction)
    .filter((p): p is SideGamePrediction => p != null && !p.dropped);
}

export async function getSideGamePrediction(
  kind: SideGameKind,
  token: string,
  gameId: number,
): Promise<SideGamePrediction | null> {
  const path =
    kind === 'euros'
      ? `/euros/getprediction?gameId=${encodeURIComponent(String(gameId))}`
      : `/worldcup/getprediction?gameId=${encodeURIComponent(String(gameId))}`;
  let response: Response;
  try {
    response = await apiFetch('game', path, { token });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  const pred = body?.prediction;
  if (!pred || typeof pred !== 'object') {
    // Legacy euros may return `{ prediction: null }` or a bare choice string.
    const bare = asChoice(pred);
    if (bare) {
      return {
        id: 0,
        auth_id: '',
        match_id: gameId,
        prediction: bare,
        plus_ninety: false,
        extra_time: false,
        penalties: false,
        dropped: false,
      };
    }
    return null;
  }
  return normalizePrediction(pred as Record<string, unknown>);
}

export async function addSideGamePrediction(
  kind: SideGameKind,
  token: string,
  payload: {
    gameId: number;
    prediction: SideGamePredictionChoice;
    extraTime?: boolean;
    penalties?: boolean;
  },
): Promise<SideGamePrediction> {
  const path =
    kind === 'euros' ? '/euros/addprediction' : '/worldcup/addprediction';
  let response: Response;
  try {
    response = await apiFetch('game', path, {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: payload.gameId,
        prediction: payload.prediction,
        extra_time: payload.extraTime ?? false,
        penalties: payload.penalties ?? false,
      }),
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  const normalized = normalizePrediction(body ?? {});
  if (!normalized) {
    throw new ApiError(response.status, 'Unexpected prediction response.');
  }
  return normalized;
}

export async function getAdminEurosMeta(token: string): Promise<EurosMeta> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/euros/meta', { token });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  return normalizeEurosMeta(body ?? {});
}

export async function getAdminWorldcupSettings(
  token: string,
): Promise<WorldcupMeta> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/worldcup/settings', { token });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  return normalizeWorldcupMeta(body ?? {});
}

/** `POST /admin/euros/opentournament` — requires non-empty `entrant_ids`. */
export async function openEurosTournament(
  token: string,
  payload: OpenEurosPayload,
): Promise<EurosTournament> {
  if (payload.entrantIds.length === 0) {
    throw new ApiError(422, 'Select at least one entrant.');
  }
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/euros/opentournament', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: payload.startDate,
        buy_in_pence: payload.buyInPence,
        entrant_ids: payload.entrantIds,
        label: payload.label ?? 'European Championship',
      }),
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  const tournament = normalizeEurosTournament(body);
  if (!tournament) {
    throw new ApiError(response.status, 'Unexpected open-tournament response.');
  }
  return tournament;
}

/**
 * `POST /admin/euros/endtournament` with `{ winner_ids }` (FE contract).
 * Current BE may ignore `winner_ids` / still accept optional `end_date` only.
 */
export async function endEurosTournament(
  token: string,
  payload: EndSideGamePayload,
): Promise<EurosTournament> {
  if (payload.winnerIds.length === 0) {
    throw new ApiError(422, 'Select at least one winner.');
  }
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/euros/endtournament', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_ids: payload.winnerIds }),
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  const tournament = normalizeEurosTournament(body);
  if (!tournament) {
    throw new ApiError(response.status, 'Unexpected end-tournament response.');
  }
  return tournament;
}

/**
 * `POST /admin/worldcup/opentournament` (SS-141).
 * Body: `{ buy_in_pence, entrant_ids }` — no start_date.
 */
export async function openWorldcupTournament(
  token: string,
  payload: OpenWorldcupPayload,
): Promise<WorldcupMeta> {
  if (payload.entrantIds.length === 0) {
    throw new ApiError(422, 'Select at least one entrant.');
  }
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/worldcup/opentournament', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buy_in_pence: payload.buyInPence,
        entrant_ids: payload.entrantIds,
      }),
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  return normalizeWorldcupMeta(body ?? {});
}

/**
 * `POST /admin/worldcup/endtournament` with `{ winner_ids }` (FE contract).
 * Current BE may ignore `winner_ids` until a parallel worker lands.
 */
export async function endWorldcupTournament(
  token: string,
  payload: EndSideGamePayload,
): Promise<WorldcupMeta> {
  if (payload.winnerIds.length === 0) {
    throw new ApiError(422, 'Select at least one winner.');
  }
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/worldcup/endtournament', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_ids: payload.winnerIds }),
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  return normalizeWorldcupMeta(body ?? {});
}

/** Knockout stage uses ET/pens toggle instead of Draw (legacy matchday ≥ 4). */
export function isKnockoutMatchday(matchday: number): boolean {
  return Number.isFinite(matchday) && matchday >= 4;
}
