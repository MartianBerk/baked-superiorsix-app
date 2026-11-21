import { Platform } from 'react-native';

import { resolveDevHost } from './resolveDevHost';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Rewrite loopback API bases to the Expo packager host on native so Expo Go
 * on a physical device can reach local-dev backends on the Mac/LAN.
 *
 * Relative bases (`/auth`) are valid for web behind nginx only — native throws
 * a clear error so Expo Go is not left with a broken fetch URL.
 * Web is a no-op for loopback rewrite (resolveDevHost returns null).
 */
export function resolveApiBase(configured: string): string {
  const raw = configured.trim();
  if (!raw) {
    return raw;
  }

  if (raw.startsWith('/')) {
    if (Platform.OS !== 'web') {
      throw new Error(
        `EXPO_PUBLIC_* base "${raw}" is relative — fine for web behind nginx, ` +
          'but native/Expo Go needs an absolute URL ' +
          '(e.g. http://192.168.1.20:8010 or http://127.0.0.1:8010 for Simulator).',
      );
    }
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
