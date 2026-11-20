/**
 * TypeScript resolution fallback. Metro prefers `resolveDevHost.native.ts` /
 * `resolveDevHost.web.ts` at bundle time.
 */
export { resolveDevHost } from './resolveDevHost.native';
