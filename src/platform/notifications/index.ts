/**
 * Public notifications API. App code imports only from here.
 * Metro resolves `.native.ts` / `.web.ts` implementations.
 */
export {
  getPermissionStatus,
  getPushToken,
  requestPermissions,
} from './notifications';
export type { NotificationPermissionStatus } from './notifications';
