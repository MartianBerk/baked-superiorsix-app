import { resolveDevHost } from './resolveDevHost';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Rewrite loopback API bases to the Expo packager host on native so Expo Go
 * on a physical device can reach local-dev backends on the Mac/LAN.
 *
 * Relative bases (`/auth`) and non-loopback hosts are left unchanged.
 * Web is a no-op (resolveDevHost returns null).
 */
export function resolveApiBase(configured: string): string {
  const raw = configured.trim();
  if (!raw || raw.startsWith('/')) {
    return raw;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  if (!LOOPBACK.has(url.hostname)) {
    return raw.replace(/\/$/, '');
  }

  const lanHost = resolveDevHost();
  if (!lanHost || LOOPBACK.has(lanHost)) {
    return raw.replace(/\/$/, '');
  }

  url.hostname = lanHost;
  return url.toString().replace(/\/$/, '');
}

export { resolveDevHost };
