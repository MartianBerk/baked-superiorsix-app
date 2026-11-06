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

/**
 * List roster invites via baked-user (`GET /superiorsix/invites`).
 * Requires superiorsix JWT with admin or game-master. Includes invite.roles.
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
 * `GET /game/listsubrounds` — player-facing slates for the current (or given)
 * parent round. Public.
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
 * `GET /admin/listsubrounds` — game-master list for current (or given) round.
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
 * Pass `create: true` to create the next sequence when none / latest is over.
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
