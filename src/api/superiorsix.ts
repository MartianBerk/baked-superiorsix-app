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
 * No difficulty — hydrate from `/game/matchdetail` when needed.
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
 * `GET /game/livematches?matchDate=` — Super Six selections (`use_match`) for one
 * UTC calendar day. Public. `matchDate` is legacy `dd-mm-yyyy`.
 */
export async function listLiveMatches(matchDate: string): Promise<LiveMatch[]> {
  const params = new URLSearchParams({ matchDate });
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

/**
 * Public gameday round summary from SS-16 (`GET /game/currentround`).
 * Prefer this over admin `currentround` for header chrome. Tolerates noop /
 * empty bodies by returning `null`.
 */
export type GameCurrentRound = {
  /** Parent round id (legacy `round_id` or SS-16 `id`). */
  id: number;
  start_date?: string | null;
  /** Earliest upcoming / current slate kickoff (legacy). */
  current_match_date?: string | null;
  /**
   * Buy-in stake in pence. SS-16 may send this directly; legacy jackpot
   * clients derive pot on the FE instead.
   */
  buy_in_pence?: number | null;
  /** Active full roster size (non-retired). Used for pot = buy_in × roster × subround. */
  players?: number | null;
  /** Legacy precomputed jackpot (pence). Prefer FE formula when buy_in+players known. */
  jackpot?: number | null;
  /** Latest / current subround sequence when BE provides it. */
  subround?: number | null;
  /** Legacy field: match-day / subround count — treat as subround when present. */
  matches?: number | null;
};

function asFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeGameCurrentRound(
  raw: Record<string, unknown>,
): GameCurrentRound | null {
  const id = asFiniteNumber(raw.id ?? raw.round_id);
  if (id == null) {
    return null;
  }
  return {
    id,
    ...(typeof raw.start_date === 'string' ? { start_date: raw.start_date } : {}),
    ...(typeof raw.current_match_date === 'string'
      ? { current_match_date: raw.current_match_date }
      : {}),
    buy_in_pence: asFiniteNumber(raw.buy_in_pence),
    players: asFiniteNumber(raw.players ?? raw.n_players),
    jackpot: asFiniteNumber(raw.jackpot),
    subround: asFiniteNumber(raw.subround ?? raw.subround_number),
    matches: asFiniteNumber(raw.matches),
  };
}

/**
 * `GET /game/currentround` — public jackpot / progress summary (SS-16).
 * Returns `null` when no open round or the route is still a noop scaffold.
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

/** One match row inside a livescores player payload (SS-16 / legacy). */
export type LiveScoreMatch = {
  match_id?: number | null;
  home_team: string;
  away_team: string;
  prediction: PredictionChoice;
  correct: boolean;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  match_date?: string | null;
  game_number?: number | null;
};

/** Player scoreboard row from `GET /game/livescores` (SS-16). */
export type LiveScorePlayer = {
  /** Roster auth UUID when SS-16 keys by auth; else legacy numeric id as string. */
  auth_id: string;
  name: string;
  score: number;
  matches: LiveScoreMatch[];
};

function normalizeLiveScoreMatch(
  raw: Record<string, unknown>,
): LiveScoreMatch | null {
  const home =
    typeof raw.home_team === 'string' ? raw.home_team : null;
  const away =
    typeof raw.away_team === 'string' ? raw.away_team : null;
  const choice = asPredictionChoice(raw.prediction);
  if (!home || !away || choice == null) {
    return null;
  }
  const matchId = asFiniteNumber(raw.match_id ?? raw.id);
  const gameNumber = asFiniteNumber(raw.game_number);
  return {
    ...(matchId != null ? { match_id: matchId } : {}),
    home_team: home,
    away_team: away,
    prediction: choice,
    correct: raw.correct === true,
    status: typeof raw.status === 'string' ? raw.status : '',
    home_score: asFiniteNumber(raw.home_score),
    away_score: asFiniteNumber(raw.away_score),
    ...(typeof raw.match_date === 'string'
      ? { match_date: raw.match_date }
      : {}),
    ...(gameNumber != null ? { game_number: gameNumber } : {}),
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
    name,
    score,
    matches,
  };
}

/**
 * `GET /game/livescores?matchDate=` — Super Six scoreboard for one UTC day
 * (SS-16). `matchDate` is legacy `dd-mm-yyyy`. Returns `null` when the route
 * is still a noop scaffold so the Scores UI can show a clear waiting state.
 */
export async function getLiveScores(
  matchDate: string,
): Promise<LiveScorePlayer[] | null> {
  const params = new URLSearchParams({ matchDate });
  let response: Response;
  try {
    response = await apiFetch(
      'game',
      `/game/livescores?${params.toString()}`,
    );
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
  const rows = Array.isArray(body.scores) ? body.scores : [];
  const out: LiveScorePlayer[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const normalized = normalizeLiveScorePlayer(
      row as Record<string, unknown>,
    );
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
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
