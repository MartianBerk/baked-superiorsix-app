/**
 * Web notifications stub (SS-8).
 * Push is native-first; Web Push can land later without changing call sites.
 */
export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export async function getPermissionStatus(): Promise<NotificationPermissionStatus> {
  return 'undetermined';
}

export async function requestPermissions(): Promise<NotificationPermissionStatus> {
  return 'undetermined';
}

export async function getPushToken(): Promise<string | null> {
  return null;
}
