import { apiFetch, readApiJson } from './client';
import { ApiError } from './errors';

/** Application audience for Superior Six resource-server JWTs. */
export const SUPERIORSIX_AUDIENCE = 'superiorsix';

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
  must_set_password?: boolean;
  created_at: string;
};

/**
 * Selectable Superior Six invite permission chips.
 * `user-profile` is always granted server-side on invite/accept — not listed here.
 */
export const INVITE_PERMISSION_ROLES = [
  'player',
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

/**
 * Claim an invite-ready account (SS-66): set the first password.
 * Returns UserResponse (no token). 409 if password already set; then use login.
 */
export async function setPasswordAuthUser(
  username: string,
  password: string,
): Promise<AuthUser> {
  let response: Response;
  try {
    response = await apiFetch('auth', '/v1/auth/set-password', {
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
