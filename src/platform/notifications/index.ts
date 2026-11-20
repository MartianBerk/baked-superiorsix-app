/**
 * Public notifications API. App code imports only from here.
 * Metro resolves `notifications.native.ts` / `notifications.web.ts`.
 * SS-263 keeps both as stubs — no push / expo-notifications yet.
 */
export {
  getPermissionStatus,
  getPushToken,
  requestPermissions,
} from './notifications';
export type { NotificationPermissionStatus } from './notifications';
