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
  avatar_url: string | null;
  active: boolean;
  retired: boolean;
};

export type UpdateDetailsPayload = {
  first_name?: string;
  last_name?: string;
  nickname?: string;
};

/**
 * Patch the caller's roster profile via superiorsix BFF
 * (`POST /user/updatedetails` → baked-user `/me`).
 * Requires JWT role `user-profile` and an existing roster document.
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
