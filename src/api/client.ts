/**
 * HTTP client for baked-auth / baked-user / baked-superiorsix.
 *
 * Base URLs come from EXPO_PUBLIC_* (see .env.example). Primary local setup:
 * APIs via baked-superiorsix/local-dev on 127.0.0.1:8010 / 8020 / 8030.
 */

import { ApiError, formatApiDetail } from './errors';

const AUTH_BASE = process.env.EXPO_PUBLIC_AUTH_URL ?? '';
const USER_BASE = process.env.EXPO_PUBLIC_USER_URL ?? '';
const GAME_BASE = process.env.EXPO_PUBLIC_SUPERSIX_URL ?? '';

export type ApiBases = {
  auth: string;
  user: string;
  game: string;
};

export type ApiFetchInit = RequestInit & {
  /** When set, sends `Authorization: Bearer …`. */
  token?: string | null;
};

export function getApiBases(): ApiBases {
  return { auth: AUTH_BASE, user: USER_BASE, game: GAME_BASE };
}

function resolveUrl(base: keyof ApiBases, path: string): string {
  const root = getApiBases()[base];
  if (!root) {
    throw new Error(
      `Missing EXPO_PUBLIC_* URL for "${base}". Copy .env.example to .env ` +
        '(auth → EXPO_PUBLIC_AUTH_URL, user → EXPO_PUBLIC_USER_URL, ' +
        'game → EXPO_PUBLIC_SUPERSIX_URL).',
    );
  }
  const normalizedRoot = root.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedRoot}${normalizedPath}`;
}

export async function apiFetch(
  base: keyof ApiBases,
  path: string,
  init?: ApiFetchInit,
): Promise<Response> {
  const { token, headers: initHeaders, ...rest } = init ?? {};
  const url = resolveUrl(base, path);
  const headers = new Headers(initHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...rest, headers });
}

/** Parse JSON (or empty) body; throw ApiError on non-2xx. */
export async function readApiJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }

  if (!response.ok) {
    const detail =
      body && typeof body === 'object' && 'detail' in body
        ? (body as { detail: unknown }).detail
        : body;
    throw new ApiError(
      response.status,
      formatApiDetail(detail) || `HTTP ${response.status}`,
    );
  }

  return body as T;
}
