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
