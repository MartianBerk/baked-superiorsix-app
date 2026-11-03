/**
 * Native notifications stub (iOS / Android).
 * Wire expo-notifications here in a later slice; do not import that package from screens.
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
