/**
 * TypeScript resolution fallback. Metro prefers `install.native.ts` /
 * `install.web.ts` at bundle time.
 */
export { installStaticAppUrl } from './install.native';
