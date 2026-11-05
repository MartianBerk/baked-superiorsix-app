import { getItem, removeItem, setItem } from '@/platform/storage';

const SESSION_KEY = 'superiorsix.session.v1';

export type PersistedSession = {
  accessToken: string;
  audience: string;
  /** Epoch ms when the access token is expected to expire. */
  expiresAt: number;
  username: string;
  roles: string[];
  userId: string;
};

export async function loadSession(): Promise<PersistedSession | null> {
  const raw = await getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (
      !parsed ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.username !== 'string' ||
      !Array.isArray(parsed.roles)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(session: PersistedSession): Promise<void> {
  await setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await removeItem(SESSION_KEY);
}

function base64UrlToJson(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }
  // Hermes / some native runtimes expose atob via expo; fall back to char decode.
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < padded.length; i += 4) {
    const a = chars.indexOf(padded[i]);
    const b = chars.indexOf(padded[i + 1]);
    const c = chars.indexOf(padded[i + 2]);
    const d = chars.indexOf(padded[i + 3]);
    const n = (a << 18) | (b << 12) | ((c & 63) << 6) | (d & 63);
    output += String.fromCharCode((n >> 16) & 255);
    if (padded[i + 2] !== '=') {
      output += String.fromCharCode((n >> 8) & 255);
    }
    if (padded[i + 3] !== '=') {
      output += String.fromCharCode(n & 255);
    }
  }
  return output;
}

/** Decode JWT payload (no signature verify — display / expiry only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    return JSON.parse(base64UrlToJson(parts[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function rolesFromJwt(token: string): string[] {
  const payload = decodeJwtPayload(token);
  const roles = payload?.roles;
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles.filter((r): r is string => typeof r === 'string');
}

export function usernameFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.username === 'string' ? payload.username : null;
}

export function subjectFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === 'string' ? payload.sub : null;
}
