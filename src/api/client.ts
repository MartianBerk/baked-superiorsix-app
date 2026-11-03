/**
 * HTTP client stub for baked-auth / baked-user / baked-superiorsix.
 * Base URLs come from EXPO_PUBLIC_* env vars when wiring begins.
 */

const AUTH_BASE = process.env.EXPO_PUBLIC_AUTH_URL ?? '';
const USER_BASE = process.env.EXPO_PUBLIC_USER_URL ?? '';
const GAME_BASE = process.env.EXPO_PUBLIC_SUPERSIX_URL ?? '';

export type ApiBases = {
  auth: string;
  user: string;
  game: string;
};

export function getApiBases(): ApiBases {
  return { auth: AUTH_BASE, user: USER_BASE, game: GAME_BASE };
}

export async function apiFetch(
  _base: keyof ApiBases,
  _path: string,
  _init?: RequestInit,
): Promise<Response> {
  throw new Error('API client not wired yet (SS-8 stub).');
}
