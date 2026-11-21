import Constants from 'expo-constants';

/**
 * LAN hostname of the machine running Metro / Expo CLI.
 * Expo Go on a physical device uses this instead of 127.0.0.1.
 */
export function resolveDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost ??
    Constants.experienceUrl?.replace(/^[a-z]+:\/\//i, '').split('/')[0] ??
    null;
  if (!hostUri) {
    return null;
  }
  const host = hostUri.split(':')[0]?.trim();
  return host || null;
}
