import { apiFetch, readApiJson } from './client';
import { ApiError } from './errors';

/** Application audience for Superior Six resource-server JWTs. */
export const SUPERIORSIX_AUDIENCE = 'superiorsix';

/** Authorization-server audience for membership admin APIs. */
export const AUTH_AUDIENCE = 'auth';

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  audience: string;
};

export type MembershipResponse = {
  application: string;
  roles: string[];
};

export type AuthUser = {
  id: string;
  username: string;
  is_active: boolean;
  roles: string[];
  memberships: MembershipResponse[];
  created_at: string;
};

/** Superior Six membership roles the admin invite form can grant. */
export const INVITE_PERMISSION_ROLES = [
  'player',
  'user-profile',
  'worldcup',
  'euros',
] as const;

export type InvitePermissionRole = (typeof INVITE_PERMISSION_ROLES)[number];

/** OAuth2 password login with required `audience` (e.g. superiorsix). */
export async function loginWithPassword(
  username: string,
  password: string,
  audience: string = SUPERIORSIX_AUDIENCE,
): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set('username', username.trim());
  body.set('password', password);
  body.set('audience', audience);

  let response: Response;
  try {
    response = await apiFetch('auth', '/v1/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-auth. Is local-dev up on :8010?',
    );
  }

  return readApiJson<TokenResponse>(response);
}

export async function fetchAuthMe(token: string): Promise<AuthUser> {
  let response: Response;
  try {
    response = await apiFetch('auth', '/v1/users/me', { token });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-auth. Is local-dev up on :8010?',
    );
  }
  return readApiJson<AuthUser>(response);
}

/** Create a baked-auth identity (no membership). 409 if username taken. */
export async function registerAuthUser(
  username: string,
  password: string,
): Promise<AuthUser> {
  let response: Response;
  try {
    response = await apiFetch('auth', '/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        password,
      }),
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-auth. Is local-dev up on :8010?',
    );
  }
  return readApiJson<AuthUser>(response);
}

/**
 * Assign superiorsix app membership roles.
 * Requires bearer `aud=auth` with role `admin`.
 */
export async function setAppMembership(
  authAdminToken: string,
  username: string,
  roles: string[],
  application: string = SUPERIORSIX_AUDIENCE,
): Promise<MembershipResponse> {
  const user = username.trim().toLowerCase();
  let response: Response;
  try {
    response = await apiFetch(
      'auth',
      `/v1/applications/${application}/memberships/${encodeURIComponent(user)}`,
      {
        method: 'PUT',
        token: authAdminToken,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      },
    );
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-auth. Is local-dev up on :8010?',
    );
  }
  return readApiJson<MembershipResponse>(response);
}
