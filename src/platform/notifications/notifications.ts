/**
 * TypeScript resolution fallback. Metro prefers `notifications.native.ts` /
 * `notifications.web.ts` at bundle time.
 */
export {
  getPermissionStatus,
  getPushToken,
  requestPermissions,
} from './notifications.native';
export type { NotificationPermissionStatus } from './notifications.native';
