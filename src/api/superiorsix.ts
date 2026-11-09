import { apiFetch, readApiJson } from './client';
import { ApiError } from './errors';

export type SuperSixSmokeResult = {
  /** `GET /health` reached the BFF. */
  healthOk: boolean;
  /** Authenticated call was not 401 — JWT accepted by superiorsix. */
  tokenAccepted: boolean;
  /** HTTP status from the authenticated probe (`/user/getprediction`). */
  probeStatus: number;
  /** Short human-readable summary. */
  message: string;
};

/** Player roster row returned by superiorsix BFF profile proxies. */
export type PlayerProfile = {
  auth_id: string;
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  active: boolean;
  retired: boolean;
};

export type UpdateDetailsPayload = {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  /** Required by product when saving from the profile form; still optional on the wire for partial patches. */
  email?: string;
};

export type InvitePlayerPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  /** Superior Six membership roles stored on the invite (granted on accept). */
  roles: string[];
};

export type InvitePlayerResult = {
  email: string;
  status: string;
  auth_id: string | null;
  profile: Record<string, unknown>;
  roles: string[];
};

export type PendingInvite = {
  email: string;
  status: string;
  auth_id: string | null;
  profile: Record<string, unknown>;
  roles: string[];
};

export type AddPlayerPayload = {
  auth_id: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname?: string;
};

export type AcceptInvitePayload = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
};

/**
 * Prediction difficulty from SS-79 (`score` 0–1 higher=harder, `band` 1–5).
 * Optional until Docker / BE includes baked-superiorsix#22.
 */
export type MatchDifficulty = {
  score: number;
  band: number;
};

/** Admin fixture row from `/admin/listmatches`. */
export type AdminMatch = {
  id: number;
  external_id: string;
  league_id: number;
  match_date: string;
  match_minute: number | null;
  status: string;
  home_team: string;
  away_team: string;
  use_match: boolean;
  home_score: number | null;
  away_score: number | null;
  game_number: number | null;
  /** SS-82 slate this selection belongs to (null when not selected). */
  subround_id?: number | null;
  last_updated?: string | null;
  difficulty?: MatchDifficulty | null;
};

/** Prediction slate under a parent round (SS-82). */
export type Subround = {
  id: number;
  round_id: number;
  sequence: number;
  created_at: string | null;
  closed_at: string | null;
  match_count: number;
  min_kickoff: string | null;
  max_kickoff: string | null;
  is_over: boolean;
  is_open_for_editing: boolean;
};

/** Parent game round (`GET /admin/currentround`, `POST /admin/addround`). */
export type RoundInfo = {
  id: number;
  start_date: string;
  end_date: string | null;
  buy_in_pence: number;
  /** Auth UUIDs; empty while open (SS-15). */
  winner_ids?: string[];
};

/** True when BE has no open round (subround list/create need one first). */
export function isNoRoundInProgressError(err: unknown): boolean {
  if (!(err instanceof ApiError)) {
    return false;
  }
  const detail = err.message.toLowerCase();
  return (
    detail.includes('no round in progress') ||
    (err.status === 400 && detail.includes('round'))
  );
}

export type LeagueInfo = {
  id: number;
  name: string;
  code: string;
  start_date: string;
};

/** Result codes from `/game/matchdetail` form / H2H rows. */
export type TeamResultCode = 'WIN' | 'DRAW' | 'LOSE';

export type MatchDetailPayload = {
  league_position: Record<string, string | null>;
  team_performance: Record<string, TeamResultCode[]>;
  head_to_head: Record<string, TeamResultCode[]>;
  difficulty?: MatchDifficulty | null;
};

/** Player outcome choice for `/user/addprediction` (`home` | `draw` | `away`). */
export type PredictionChoice = 'home' | 'draw' | 'away';

/**
 * Selected Super Six fixture from `GET /game/livematches` (public).
 * Frozen difficulty is included when persisted on the match row.
 */
export type LiveMatch = {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  match_minute: number | null;
  game_number: number | null;
  match_date: string;
  /** SS-82 slate id when selected for Super Six. */
  subround_id?: number | null;
  difficulty?: MatchDifficulty | null;
};

/** `POST /user/acceptinvite` — no invitee bearer; BFF grants roles then returns JWT. */
export type AcceptInviteResult = {
  player: PlayerProfile;
  roles: string[];
  access_token: string;
  token_type?: string;
  audience?: string;
};

/** List roster rows via superiorsix BFF (`GET /admin/listplayers`). */
export async function listPlayers(
  token: string,
  active?: boolean,
): Promise<PlayerProfile[]> {
  const query =
    typeof active === 'boolean' ? `?active=${active ? 'true' : 'false'}` : '';
  let response: Response;
  try {
    response = await apiFetch('game', `/admin/listplayers${query}`, { token });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }
  const body = await readApiJson<{ players: PlayerProfile[] }>(response);
  return body.players ?? [];
}

/**
 * Invite by email: passwordless auth user + membership + roster invite
 * (`POST /admin/inviteplayer`). Requires JWT role `admin`.
 */
export async function invitePlayer(
  token: string,
  payload: InvitePlayerPayload,
): Promise<InvitePlayerResult> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/inviteplayer', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }
  const invite = await readApiJson<InvitePlayerResult>(response);
  return {
    ...invite,
    roles: Array.isArray(invite.roles) ? invite.roles : [],
  };
}

export type PlayerRolesResult = {
  email: string;
  roles: string[];
};

/**
 * Read superiorsix membership roles for a rostered email
 * (`GET /admin/getplayerroles`). Requires JWT role `admin`.
 */
export async function getPlayerRoles(
  token: string,
  email: string,
): Promise<PlayerRolesResult> {
  const encoded = encodeURIComponent(email.trim().toLowerCase());
  let response: Response;
  try {
    response = await apiFetch(
      'game',
      `/admin/getplayerroles?email=${encoded}`,
      { token },
    );
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }
  const body = await readApiJson<PlayerRolesResult>(response);
  return {
    email: body.email,
    roles: Array.isArray(body.roles) ? body.roles : [],
  };
}

/**
 * Replace assignable membership roles for a rostered email
 * (`POST /admin/updateroles`). Requires JWT role `admin`.
 * Assignable set includes app-scoped `admin`; server always-grants `user-profile`.
 */
export async function updatePlayerRoles(
  token: string,
  payload: { email: string; roles: string[] },
): Promise<PlayerRolesResult> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/updateroles', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        roles: payload.roles,
      }),
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }
  const body = await readApiJson<PlayerRolesResult>(response);
  return {
    email: body.email,
    roles: Array.isArray(body.roles) ? body.roles : [],
  };
}

/**
 * List roster invites via baked-user (`GET /superiorsix/invites`).
 * Requires superiorsix JWT with admin. Includes invite.roles.
 */
export async function listInvites(token: string): Promise<PendingInvite[]> {
  let response: Response;
  try {
    response = await apiFetch('user', '/superiorsix/invites', { token });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-user. Is local-dev up on :8020?',
    );
  }
  const body = await readApiJson<{ invites: PendingInvite[] }>(response);
  return (body.invites ?? []).map((invite) => ({
    ...invite,
    roles: Array.isArray(invite.roles) ? invite.roles : [],
  }));
}

/**
 * Invitee accepts a pending invite after set-password claim
 * (`POST /user/acceptinvite` with email + password; no invitee bearer).
 * BFF logs in and creates roster (membership already granted at invite).
 */
export async function acceptInvite(
  payload: AcceptInvitePayload,
): Promise<AcceptInviteResult> {
  let response: Response;
  try {
    response = await apiFetch('game', '/user/acceptinvite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        ...(payload.first_name ? { first_name: payload.first_name } : {}),
        ...(payload.last_name ? { last_name: payload.last_name } : {}),
        ...(payload.nickname ? { nickname: payload.nickname } : {}),
      }),
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }
  return readApiJson<AcceptInviteResult>(response);
}

/**
 * Create roster profile for an invited auth subject
 * (`POST /admin/addplayer`). Requires JWT role `admin`.
 * Kept for ops/debug; admin invite UI no longer calls this (SS-56 redesign).
 */
export async function addPlayer(
  token: string,
  payload: AddPlayerPayload,
): Promise<PlayerProfile> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/addplayer', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }
  return readApiJson<PlayerProfile>(response);
}

/**
 * Patch the caller's roster profile via superiorsix BFF
 * (`POST /user/updatedetails` → baked-user `/me`).
 * Requires an active roster player JWT; baked-user still needs `user-profile`
 * on the token (always granted on invite/accept).
 */
export async function updateProfileDetails(
  token: string,
  payload: UpdateDetailsPayload,
): Promise<PlayerProfile> {
  let response: Response;
  try {
    response = await apiFetch('game', '/user/updatedetails', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }
  return readApiJson<PlayerProfile>(response);
}

function gameUnreachable(): ApiError {
  return new ApiError(
    0,
    'Could not reach baked-superiorsix. Is local-dev up on :8030?',
  );
}

/**
 * `GET /game/matchdetail` — league position, recent form, head-to-head.
 * Public game route; `matchDate` is legacy `dd-mm-yyyy`.
 */
export async function fetchMatchDetail(opts: {
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
}): Promise<MatchDetailPayload> {
  const params = new URLSearchParams({
    hometeam: opts.homeTeam,
    awayteam: opts.awayTeam,
    matchdate: opts.matchDate,
  });
  let response: Response;
  try {
    response = await apiFetch('game', `/game/matchdetail?${params.toString()}`);
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ match_detail: MatchDetailPayload }>(response);
  return body.match_detail;
}

/**
 * `GET /game/livematches` — Super Six selections (`use_match`).
 * Prefer `subroundId` (one slate). Legacy `matchDate` (`dd-mm-yyyy`) for a UTC day.
 */
export async function listLiveMatches(opts: {
  matchDate?: string;
  subroundId?: number;
}): Promise<LiveMatch[]> {
  const params = new URLSearchParams();
  if (opts.subroundId != null) {
    params.set('subroundId', String(opts.subroundId));
  } else if (opts.matchDate) {
    params.set('matchDate', opts.matchDate);
  } else {
    throw new ApiError(400, 'listLiveMatches requires subroundId or matchDate');
  }
  let response: Response;
  try {
    response = await apiFetch('game', `/game/livematches?${params.toString()}`);
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ matches: LiveMatch[] }>(response);
  return body.matches ?? [];
}

/**
 * `GET /user/getprediction?gameId=` — active prediction for the current round.
 * `gameId` is the match id (legacy name). Requires JWT `player` + roster.
 */
export async function getPrediction(
  token: string,
  matchId: number,
): Promise<PredictionChoice | null> {
  let response: Response;
  try {
    response = await apiFetch(
      'game',
      `/user/getprediction?gameId=${encodeURIComponent(String(matchId))}`,
      { token },
    );
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ prediction: string | null }>(response);
  const value = body.prediction;
  if (value === 'home' || value === 'draw' || value === 'away') {
    return value;
  }
  return null;
}

/**
 * `POST /user/addprediction` — submit or update Home/Draw/Away before the
 * 10-minute kickoff cutoff. Requires JWT `player` + roster + open round.
 */
export async function addPrediction(
  token: string,
  matchId: number,
  prediction: PredictionChoice,
): Promise<{ matchId: number; prediction: PredictionChoice }> {
  let response: Response;
  try {
    response = await apiFetch('game', '/user/addprediction', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: matchId, prediction }),
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{
    match_id: number;
    prediction: string;
  }>(response);
  const value = body.prediction;
  if (value !== 'home' && value !== 'draw' && value !== 'away') {
    throw new ApiError(
      response.status,
      'Unexpected prediction value from server.',
    );
  }
  return { matchId: body.match_id, prediction: value };
}

/**
 * Admin-on-behalf prediction row from SS-17 (`/admin/listpredictions*`).
 * Keyed by roster `auth_id` (legacy used numeric `player_id`).
 */
export type AdminMatchPrediction = {
  id?: number;
  round_id?: number;
  auth_id: string;
  match_id: number;
  prediction: PredictionChoice;
  home_team?: string;
  away_team?: string;
  match_date?: string;
  first_name?: string;
  last_name?: string;
};

function asPredictionChoice(value: unknown): PredictionChoice | null {
  if (value === 'home' || value === 'draw' || value === 'away') {
    return value;
  }
  return null;
}

/**
 * Normalize SS-17 / legacy list rows. Accepts `auth_id` (preferred) or
 * string `player_id` during the BE transition.
 */
function normalizeAdminPrediction(
  raw: Record<string, unknown>,
): AdminMatchPrediction | null {
  const matchId = Number(raw.match_id);
  if (!Number.isFinite(matchId)) {
    return null;
  }
  const choice = asPredictionChoice(raw.prediction);
  if (choice == null) {
    return null;
  }
  const authRaw = raw.auth_id ?? raw.player_id;
  if (authRaw == null || authRaw === '') {
    return null;
  }
  const authId = String(authRaw);
  const roundId =
    raw.round_id == null || raw.round_id === ''
      ? undefined
      : Number(raw.round_id);
  const id =
    raw.id == null || raw.id === '' ? undefined : Number(raw.id);
  return {
    ...(id != null && Number.isFinite(id) ? { id } : {}),
    ...(roundId != null && Number.isFinite(roundId)
      ? { round_id: roundId }
      : {}),
    auth_id: authId,
    match_id: matchId,
    prediction: choice,
    ...(typeof raw.home_team === 'string' ? { home_team: raw.home_team } : {}),
    ...(typeof raw.away_team === 'string' ? { away_team: raw.away_team } : {}),
    ...(typeof raw.match_date === 'string'
      ? { match_date: raw.match_date }
      : {}),
    ...(typeof raw.first_name === 'string'
      ? { first_name: raw.first_name }
      : {}),
    ...(typeof raw.last_name === 'string' ? { last_name: raw.last_name } : {}),
  };
}

function assertNotAdminPredictionNoop(body: unknown, action: string): void {
  if (
    body &&
    typeof body === 'object' &&
    'noop' in body &&
    (body as { noop?: unknown }).noop === true
  ) {
    throw new ApiError(
      501,
      `Admin predictions API not ready yet (${action}). Waiting on SS-17.`,
    );
  }
}

/**
 * `GET /admin/listpredictionsnew?matchdate=` — all predictions for that UTC
 * day in the current round (SS-17). `matchdate` is legacy `dd-mm-yyyy`.
 * Empty / noop scaffold responses yield `[]` so the Scores admin UI can still
 * render the slate.
 */
export async function listAdminPredictions(
  token: string,
  opts: { matchDate: string },
): Promise<AdminMatchPrediction[]> {
  const params = new URLSearchParams({ matchdate: opts.matchDate });
  let response: Response;
  try {
    response = await apiFetch(
      'game',
      `/admin/listpredictionsnew?${params.toString()}`,
      { token },
    );
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  if (
    body &&
    typeof body === 'object' &&
    'noop' in body &&
    body.noop === true
  ) {
    return [];
  }
  const rows = Array.isArray(body.predictions) ? body.predictions : [];
  const out: AdminMatchPrediction[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const normalized = normalizeAdminPrediction(
      row as Record<string, unknown>,
    );
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
}

/**
 * `POST /admin/addprediction` — submit or update Home/Draw/Away on behalf of
 * a rostered player (SS-17). Body uses `auth_id` (UUID string).
 */
export async function addAdminPrediction(
  token: string,
  opts: {
    authId: string;
    matchId: number;
    prediction: PredictionChoice;
  },
): Promise<{ authId: string; matchId: number; prediction: PredictionChoice }> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/addprediction', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_id: opts.authId,
        match_id: opts.matchId,
        prediction: opts.prediction,
      }),
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  assertNotAdminPredictionNoop(body, 'addprediction');
  const choice =
    asPredictionChoice(body.prediction) ??
    asPredictionChoice(opts.prediction);
  if (choice == null) {
    throw new ApiError(
      response.status,
      'Unexpected prediction value from admin addprediction.',
    );
  }
  const matchId =
    body.match_id != null && Number.isFinite(Number(body.match_id))
      ? Number(body.match_id)
      : opts.matchId;
  const authId =
    body.auth_id != null && String(body.auth_id) !== ''
      ? String(body.auth_id)
      : opts.authId;
  return { authId, matchId, prediction: choice };
}

/** `GET /admin/currentround` — open parent round or null. */
export async function getCurrentRound(token: string): Promise<RoundInfo | null> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/currentround', { token });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ current_round: RoundInfo | null }>(response);
  return body.current_round ?? null;
}

/**
 * `POST /admin/addround` — open the first (or next) parent round.
 * Fails with 400 if a round is already in progress.
 */
export async function addRound(
  token: string,
  opts: { startDate: string; buyInPence?: number },
): Promise<RoundInfo> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/addround', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: opts.startDate,
        buy_in_pence: opts.buyInPence ?? 0,
      }),
    });
  } catch {
    throw gameUnreachable();
  }
  return readApiJson<RoundInfo>(response);
}

/**
 * `POST /admin/endround?endDate=` — close the open parent round (SS-15).
 * `endDate` is a UTC day key (`yyyy-mm-dd`); sent as legacy `dd-mm-yyyy`.
 * Body `winner_ids` are roster `auth_id` UUIDs (min 1, unique).
 */
export async function endRound(
  token: string,
  opts: { endDate: string; winnerIds: string[] },
): Promise<RoundInfo> {
  const [y, m, d] = opts.endDate.split('-');
  if (!y || !m || !d) {
    throw new ApiError(0, 'endDate must be YYYY-MM-DD.');
  }
  if (opts.winnerIds.length === 0) {
    throw new ApiError(0, 'Select at least one winner.');
  }
  const legacyEnd = `${d}-${m}-${y}`;
  const params = new URLSearchParams({ endDate: legacyEnd });
  let response: Response;
  try {
    response = await apiFetch(
      'game',
      `/admin/endround?${params.toString()}`,
      {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_ids: opts.winnerIds }),
      },
    );
  } catch {
    throw gameUnreachable();
  }
  return readApiJson<RoundInfo>(response);
}

/**
 * `GET /game/listsubrounds` — player-facing slates for the current (or given)
 * parent round. Public. 400 ``No round in progress.`` when none open.
 */
export async function listGameSubrounds(roundId?: number): Promise<Subround[]> {
  const params = new URLSearchParams();
  if (roundId != null) {
    params.set('roundId', String(roundId));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  let response: Response;
  try {
    response = await apiFetch('game', `/game/listsubrounds${query}`);
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ subrounds: Subround[] }>(response);
  return body.subrounds ?? [];
}

/**
 * `GET /admin/listsubrounds` — admin list for current (or given) round.
 */
export async function listAdminSubrounds(
  token: string,
  roundId?: number,
): Promise<Subround[]> {
  const params = new URLSearchParams();
  if (roundId != null) {
    params.set('roundId', String(roundId));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  let response: Response;
  try {
    response = await apiFetch('game', `/admin/listsubrounds${query}`, {
      token,
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ subrounds: Subround[] }>(response);
  return body.subrounds ?? [];
}

/**
 * `GET /admin/currentsubround` — open-for-editing slate.
 * Prefer `create: false` on load; FE shows a pending slate and lets
 * `addmatches` create the first/next subround on Submit. `create: true`
 * remains available for explicit open (prefer `opensubround` for force-next).
 */
export async function getCurrentSubround(
  token: string,
  opts?: { create?: boolean },
): Promise<Subround | null> {
  const create = opts?.create === true;
  const query = create ? '?create=true' : '';
  let response: Response;
  try {
    response = await apiFetch('game', `/admin/currentsubround${query}`, {
      token,
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ current_subround: Subround | null }>(
    response,
  );
  return body.current_subround ?? null;
}

/**
 * `POST /admin/opensubround` — force-create the next slate even if the previous
 * still has future kickoffs (Sat/Mon/Wed/Fri separate slates).
 */
export async function openSubround(token: string): Promise<Subround> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/opensubround', {
      method: 'POST',
      token,
    });
  } catch {
    throw gameUnreachable();
  }
  return readApiJson<Subround>(response);
}

/** `GET /admin/listleagues` — league id → code map for kickoff headers. */
export async function listLeagues(token: string): Promise<LeagueInfo[]> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/listleagues', { token });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ leagues: LeagueInfo[] }>(response);
  return body.leagues ?? [];
}

/**
 * `GET /admin/listmatches` — fixtures for an inclusive UTC range (`dd-mm-yyyy`).
 * Both fromDate and toDate required; max 7 calendar days; same day = one day.
 */
export async function listMatches(
  token: string,
  opts: { fromDate: string; toDate: string },
): Promise<AdminMatch[]> {
  const params = new URLSearchParams({
    fromDate: opts.fromDate,
    toDate: opts.toDate,
  });
  let response: Response;
  try {
    response = await apiFetch('game', `/admin/listmatches?${params.toString()}`, {
      token,
    });
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ matches: AdminMatch[] }>(response);
  return body.matches ?? [];
}

/** `POST /admin/addmatch` — select a fixture as Super Six game N. */
export async function addMatch(
  token: string,
  matchId: number,
  gameNumber: number,
): Promise<AdminMatch> {
  let response: Response;
  try {
    response = await apiFetch('game', '/admin/addmatch', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, game_number: gameNumber }),
    });
  } catch {
    throw gameUnreachable();
  }
  return readApiJson<AdminMatch>(response);
}

/**
 * `POST /admin/addmatches?matchDate=` — batch replace a day's Super Six
 * selections (0–6). `matchDate` is legacy `dd-mm-yyyy`.
 */
export async function addMatches(
  token: string,
  matchDate: string,
  selections: { id: number; game_number: number }[],
): Promise<AdminMatch[]> {
  let response: Response;
  try {
    response = await apiFetch(
      'game',
      `/admin/addmatches?matchDate=${encodeURIComponent(matchDate)}`,
      {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selections),
      },
    );
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<{ matches: AdminMatch[] }>(response);
  return body.matches ?? [];
}

/** `GET /admin/dropmatch?id=` — clear Super Six selection on a fixture. */
export async function dropMatch(
  token: string,
  matchId: number,
): Promise<AdminMatch> {
  let response: Response;
  try {
    response = await apiFetch('game', `/admin/dropmatch?id=${matchId}`, {
      token,
    });
  } catch {
    throw gameUnreachable();
  }
  return readApiJson<AdminMatch>(response);
}

function asFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asMatchDifficulty(value: unknown): MatchDifficulty | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  const score = asFiniteNumber(row.score);
  const band = asFiniteNumber(row.band);
  if (score == null || band == null) {
    return null;
  }
  return { score, band };
}

function normalizeSubround(raw: unknown): Subround | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = asFiniteNumber(row.id);
  const roundId = asFiniteNumber(row.round_id);
  const sequence = asFiniteNumber(row.sequence);
  if (id == null || roundId == null || sequence == null) {
    return null;
  }
  return {
    id,
    round_id: roundId,
    sequence,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    closed_at: typeof row.closed_at === 'string' ? row.closed_at : null,
    match_count: asFiniteNumber(row.match_count) ?? 0,
    min_kickoff: typeof row.min_kickoff === 'string' ? row.min_kickoff : null,
    max_kickoff: typeof row.max_kickoff === 'string' ? row.max_kickoff : null,
    is_over: row.is_over === true,
    is_open_for_editing: row.is_open_for_editing === true,
  };
}

/**
 * SS-16 `GET /game/meta` — shell header + slate navigation.
 * Pot is precomputed: buy_in_pence × n_players × round_number.
 */
export type GameMeta = {
  /** Latest subround/slate sequence (header Round N). */
  round_number: number;
  /** Precomputed pot in pence (14×£2 → £28 / £56 / £84…). */
  prize_pot_pence: number;
  buy_in_pence: number;
  /** Full active roster size. */
  n_players: number;
  round: RoundInfo | null;
  subround: Subround | null;
  subrounds: Subround[];
  /** ISO match-day kickoffs for navigation. */
  match_days: string[];
};

function normalizeRoundInfo(raw: unknown): RoundInfo | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = asFiniteNumber(row.id);
  const buyIn = asFiniteNumber(row.buy_in_pence);
  if (id == null || typeof row.start_date !== 'string' || buyIn == null) {
    return null;
  }
  const winners = Array.isArray(row.winner_ids)
    ? row.winner_ids.map((v) => String(v))
    : [];
  return {
    id,
    start_date: row.start_date,
    end_date: typeof row.end_date === 'string' ? row.end_date : null,
    buy_in_pence: buyIn,
    winner_ids: winners,
  };
}

function normalizeGameMeta(raw: Record<string, unknown>): GameMeta {
  const subroundsRaw = Array.isArray(raw.subrounds) ? raw.subrounds : [];
  const subrounds: Subround[] = [];
  for (const row of subroundsRaw) {
    const normalized = normalizeSubround(row);
    if (normalized) {
      subrounds.push(normalized);
    }
  }
  const matchDaysRaw = Array.isArray(raw.match_days) ? raw.match_days : [];
  const match_days = matchDaysRaw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v);

  return {
    round_number: asFiniteNumber(raw.round_number) ?? 0,
    prize_pot_pence: asFiniteNumber(raw.prize_pot_pence) ?? 0,
    buy_in_pence: asFiniteNumber(raw.buy_in_pence) ?? 0,
    n_players: asFiniteNumber(raw.n_players) ?? 0,
    round: normalizeRoundInfo(raw.round),
    subround: normalizeSubround(raw.subround),
    subrounds,
    match_days,
  };
}

/**
 * `GET /game/meta` — public header Round N + prize pot + slate list (SS-16).
 */
export async function getGameMeta(): Promise<GameMeta> {
  let response: Response;
  try {
    response = await apiFetch('game', '/game/meta');
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  if (
    !body ||
    typeof body !== 'object' ||
    ('noop' in body && body.noop === true) ||
    !body.meta ||
    typeof body.meta !== 'object'
  ) {
    return {
      round_number: 0,
      prize_pot_pence: 0,
      buy_in_pence: 0,
      n_players: 0,
      round: null,
      subround: null,
      subrounds: [],
      match_days: [],
    };
  }
  return normalizeGameMeta(body.meta as Record<string, unknown>);
}

/**
 * Public `GET /game/currentround` payload (SS-16 PublicCurrentRoundPayload).
 */
export type GameCurrentRound = {
  round_id: number;
  start_date: string;
  /** Latest subround sequence (same as meta.round_number). */
  round_number: number;
  buy_in_pence: number;
  /** Full roster count. */
  players: number;
  /** Alias of prize_pot_pence (legacy jackpot field). */
  jackpot: number;
  prize_pot_pence: number;
  subround_id: number | null;
  current_match_date: string | null;
  /** Match count on the current slate. */
  matches: number;
};

function normalizeGameCurrentRound(
  raw: Record<string, unknown>,
): GameCurrentRound | null {
  const roundId = asFiniteNumber(raw.round_id ?? raw.id);
  if (roundId == null || typeof raw.start_date !== 'string') {
    return null;
  }
  const roundNumber = asFiniteNumber(raw.round_number) ?? 0;
  const buyIn = asFiniteNumber(raw.buy_in_pence) ?? 0;
  const players = asFiniteNumber(raw.players ?? raw.n_players) ?? 0;
  const pot =
    asFiniteNumber(raw.prize_pot_pence) ??
    asFiniteNumber(raw.jackpot) ??
    0;
  return {
    round_id: roundId,
    start_date: raw.start_date,
    round_number: roundNumber,
    buy_in_pence: buyIn,
    players,
    jackpot: asFiniteNumber(raw.jackpot) ?? pot,
    prize_pot_pence: pot,
    subround_id: asFiniteNumber(raw.subround_id),
    current_match_date:
      typeof raw.current_match_date === 'string'
        ? raw.current_match_date
        : null,
    matches: asFiniteNumber(raw.matches) ?? 0,
  };
}

/**
 * `GET /game/currentround` — public pot / round summary (SS-16).
 * Returns `null` when no open round.
 */
export async function getGameCurrentRound(): Promise<GameCurrentRound | null> {
  let response: Response;
  try {
    response = await apiFetch('game', '/game/currentround');
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  if (
    !body ||
    typeof body !== 'object' ||
    ('noop' in body && body.noop === true)
  ) {
    return null;
  }
  const raw = body.current_round;
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return normalizeGameCurrentRound(raw as Record<string, unknown>);
}

/** One match row inside a livescores player payload (SS-16). */
export type LiveScoreMatch = {
  match_id: number;
  home_team: string;
  away_team: string;
  /** Null when the player has not predicted this fixture. */
  prediction: PredictionChoice | null;
  correct: boolean;
  status: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string | null;
  game_number: number | null;
  match_minute: number | null;
};

/** Player scoreboard row from `GET /game/livescores` (SS-16). */
export type LiveScorePlayer = {
  auth_id: string;
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  nickname?: string | null;
  score: number;
  matches: LiveScoreMatch[];
};

/** Slate fixture row from livescores `matches[]` (MatchResponse subset). */
export type LiveScoreFixture = {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  match_date: string;
  match_minute: number | null;
  game_number: number | null;
  subround_id: number | null;
  difficulty?: MatchDifficulty | null;
};

/** Full `GET /game/livescores` board (SS-16). */
export type LiveScoresBoard = {
  scores: LiveScorePlayer[];
  subround: Subround | null;
  matches: LiveScoreFixture[];
  match_count: number;
  /** True while any fixture is IN PLAY / HALF TIME. */
  live: boolean;
  min_kickoff: string | null;
  max_kickoff: string | null;
  /** Next future kickoff — FE can sleep until then instead of polling. */
  next_kickoff: string | null;
};

function normalizeLiveScoreMatch(
  raw: Record<string, unknown>,
): LiveScoreMatch | null {
  const home = typeof raw.home_team === 'string' ? raw.home_team : null;
  const away = typeof raw.away_team === 'string' ? raw.away_team : null;
  const matchId = asFiniteNumber(raw.match_id ?? raw.id);
  if (!home || !away || matchId == null) {
    return null;
  }
  const choice =
    raw.prediction == null || raw.prediction === ''
      ? null
      : asPredictionChoice(raw.prediction);
  return {
    match_id: matchId,
    home_team: home,
    away_team: away,
    prediction: choice,
    correct: raw.correct === true,
    status: typeof raw.status === 'string' ? raw.status : '',
    home_score: asFiniteNumber(raw.home_score),
    away_score: asFiniteNumber(raw.away_score),
    match_date: typeof raw.match_date === 'string' ? raw.match_date : null,
    game_number: asFiniteNumber(raw.game_number),
    match_minute: asFiniteNumber(raw.match_minute),
  };
}

function normalizeLiveScorePlayer(
  raw: Record<string, unknown>,
): LiveScorePlayer | null {
  const authRaw = raw.auth_id ?? raw.id;
  if (authRaw == null || authRaw === '') {
    return null;
  }
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : String(authRaw);
  const matchesRaw = Array.isArray(raw.matches) ? raw.matches : [];
  const matches: LiveScoreMatch[] = [];
  for (const row of matchesRaw) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const normalized = normalizeLiveScoreMatch(row as Record<string, unknown>);
    if (normalized) {
      matches.push(normalized);
    }
  }
  const score =
    asFiniteNumber(raw.score) ??
    matches.reduce((sum, m) => sum + (m.correct ? 1 : 0), 0);
  return {
    auth_id: String(authRaw),
    id: String(raw.id ?? authRaw),
    name,
    ...(typeof raw.first_name === 'string' ? { first_name: raw.first_name } : {}),
    ...(typeof raw.last_name === 'string' ? { last_name: raw.last_name } : {}),
    ...(raw.nickname === null || typeof raw.nickname === 'string'
      ? { nickname: raw.nickname as string | null }
      : {}),
    score,
    matches,
  };
}

function normalizeLiveScoreFixture(
  raw: Record<string, unknown>,
): LiveScoreFixture | null {
  const id = asFiniteNumber(raw.id);
  if (
    id == null ||
    typeof raw.home_team !== 'string' ||
    typeof raw.away_team !== 'string' ||
    typeof raw.match_date !== 'string'
  ) {
    return null;
  }
  return {
    id,
    home_team: raw.home_team,
    away_team: raw.away_team,
    home_score: asFiniteNumber(raw.home_score),
    away_score: asFiniteNumber(raw.away_score),
    status: typeof raw.status === 'string' ? raw.status : '',
    match_date: raw.match_date,
    match_minute: asFiniteNumber(raw.match_minute),
    game_number: asFiniteNumber(raw.game_number),
    subround_id: asFiniteNumber(raw.subround_id),
    difficulty: asMatchDifficulty(raw.difficulty),
  };
}

function normalizeLiveScoresBoard(
  body: Record<string, unknown>,
): LiveScoresBoard {
  const scores: LiveScorePlayer[] = [];
  const scoresRaw = Array.isArray(body.scores) ? body.scores : [];
  for (const row of scoresRaw) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const normalized = normalizeLiveScorePlayer(
      row as Record<string, unknown>,
    );
    if (normalized) {
      scores.push(normalized);
    }
  }
  const matches: LiveScoreFixture[] = [];
  const matchesRaw = Array.isArray(body.matches) ? body.matches : [];
  for (const row of matchesRaw) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const normalized = normalizeLiveScoreFixture(
      row as Record<string, unknown>,
    );
    if (normalized) {
      matches.push(normalized);
    }
  }
  return {
    scores,
    subround: normalizeSubround(body.subround),
    matches,
    match_count: asFiniteNumber(body.match_count) ?? matches.length,
    live: body.live === true,
    min_kickoff: typeof body.min_kickoff === 'string' ? body.min_kickoff : null,
    max_kickoff: typeof body.max_kickoff === 'string' ? body.max_kickoff : null,
    next_kickoff:
      typeof body.next_kickoff === 'string' ? body.next_kickoff : null,
  };
}

/**
 * `GET /game/livescores` — aggregate Super Six scoreboard (SS-16).
 * Prefer `subroundId` (one batch call for the slate). Optional `matchDate`
 * (`dd-mm-yyyy`) for legacy day filter. Omit both for latest open slate.
 */
export async function getLiveScores(opts?: {
  matchDate?: string;
  subroundId?: number;
}): Promise<LiveScoresBoard> {
  const params = new URLSearchParams();
  if (opts?.matchDate) {
    params.set('matchDate', opts.matchDate);
  }
  if (opts?.subroundId != null) {
    params.set('subroundId', String(opts.subroundId));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  let response: Response;
  try {
    response = await apiFetch('game', `/game/livescores${query}`);
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  if (
    !body ||
    typeof body !== 'object' ||
    ('noop' in body && body.noop === true)
  ) {
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
  return normalizeLiveScoresBoard(body);
}

/**
 * Smoke the superiorsix BFF after login: health + one Bearer-protected route.
 *
 * `/user/getprediction` requires `player` + roster; 403 “not on roster” still
 * means the JWT was accepted (good enough for SS-50). 401 means reject.
 */
export async function smokeSuperSixBff(token: string): Promise<SuperSixSmokeResult> {
  let healthOk = false;
  try {
    const health = await apiFetch('game', '/health');
    healthOk = health.ok;
  } catch {
    return {
      healthOk: false,
      tokenAccepted: false,
      probeStatus: 0,
      message: 'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    };
  }

  let probe: Response;
  try {
    probe = await apiFetch('game', '/user/getprediction?gameId=1', { token });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-superiorsix. Is local-dev up on :8030?',
    );
  }

  const tokenAccepted = probe.status !== 401;
  let detail = '';
  try {
    const body = (await probe.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') {
      detail = body.detail;
    }
  } catch {
    // ignore non-JSON
  }

  let message: string;
  if (!healthOk) {
    message = `Health check failed (HTTP ${probe.status}).`;
  } else if (probe.status === 401) {
    message = 'Token rejected by superiorsix (401).';
  } else if (probe.status === 403) {
    message = detail
      ? `Token accepted; ${detail}`
      : 'Token accepted (403 — likely missing roster invite).';
  } else if (probe.ok) {
    message = 'Token accepted; authenticated probe succeeded.';
  } else {
    message = detail
      ? `Token accepted; probe HTTP ${probe.status}: ${detail}`
      : `Token accepted; probe HTTP ${probe.status}.`;
  }

  return { healthOk, tokenAccepted, probeStatus: probe.status, message };
}

/** One match-day score point from `GET /stats/aggregate` (SS-18). */
export type AggregateScorePoint = {
  name: string;
  /** ISO date `yyyy-mm-dd`. */
  date: string;
  /** Correct predictions that day. */
  score: number;
  matches: number;
};

/**
 * Player success-rate row for the previous closed round only (n−1).
 * `playerid` is roster `auth_id`. Rates are precomputed — FE renders as-is.
 */
export type AggregatePlayerStats = {
  playerid: string;
  name: string;
  correct: number;
  matches: number;
  success_rate: number;
  scores: AggregateScorePoint[];
};

export type AggregateStatsResponse = {
  stats: AggregatePlayerStats[];
};

/** One closed round in the full winners archive (`GET /stats/winners`). */
export type HistoricRound = {
  round_id: number;
  start_date: string;
  end_date: string;
  matches: number;
  players: number;
  /** Pot won, pence. */
  jackpot: number;
  winner: string;
  winner_ids: string[];
};

export type HistoricRoundsResponse = {
  rounds: HistoricRound[];
};

function asStatsString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeAggregateScorePoint(
  raw: Record<string, unknown>,
): AggregateScorePoint {
  return {
    name: asStatsString(raw.name),
    date: asStatsString(raw.date),
    score: asFiniteNumber(raw.score) ?? 0,
    matches: asFiniteNumber(raw.matches) ?? 0,
  };
}

function normalizeAggregatePlayerStats(
  raw: Record<string, unknown>,
): AggregatePlayerStats {
  const scoresRaw = Array.isArray(raw.scores) ? raw.scores : [];
  return {
    playerid:
      raw.playerid == null ? '' : asStatsString(raw.playerid, String(raw.playerid)),
    name: asStatsString(raw.name),
    correct: asFiniteNumber(raw.correct) ?? 0,
    matches: asFiniteNumber(raw.matches) ?? 0,
    success_rate: asFiniteNumber(raw.success_rate) ?? 0,
    scores: scoresRaw
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map(normalizeAggregateScorePoint),
  };
}

function normalizeHistoricRound(raw: Record<string, unknown>): HistoricRound {
  const winnerIds = Array.isArray(raw.winner_ids) ? raw.winner_ids : [];
  return {
    round_id: asFiniteNumber(raw.round_id) ?? 0,
    start_date: asStatsString(raw.start_date),
    end_date: asStatsString(raw.end_date),
    matches: asFiniteNumber(raw.matches) ?? 0,
    players: asFiniteNumber(raw.players) ?? 0,
    jackpot: asFiniteNumber(raw.jackpot) ?? 0,
    winner: asStatsString(raw.winner),
    winner_ids: winnerIds.map((id) => String(id)),
  };
}

/**
 * SS-18 `GET /stats/aggregate` — success rates for the previous closed round
 * only (n−1). Optional legacy `dd-mm-yyyy` day filters.
 */
export async function getStatsAggregate(opts?: {
  startDate?: string | null;
  endDate?: string | null;
}): Promise<AggregateStatsResponse> {
  const params = new URLSearchParams();
  if (opts?.startDate) {
    params.set('start_date', opts.startDate);
  }
  if (opts?.endDate) {
    params.set('end_date', opts.endDate);
  }
  const query = params.toString();
  let response: Response;
  try {
    response = await apiFetch(
      'game',
      `/stats/aggregate${query ? `?${query}` : ''}`,
    );
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  const rows = Array.isArray(body?.stats) ? body.stats : [];
  return {
    stats: rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map(normalizeAggregatePlayerStats),
  };
}

/** SS-18 `GET /stats/winners` — full closed-round winners archive. */
export async function getStatsWinners(): Promise<HistoricRoundsResponse> {
  let response: Response;
  try {
    response = await apiFetch('game', '/stats/winners');
  } catch {
    throw gameUnreachable();
  }
  const body = await readApiJson<Record<string, unknown>>(response);
  const rows = Array.isArray(body?.rounds) ? body.rounds : [];
  return {
    rounds: rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map(normalizeHistoricRound),
  };
}
