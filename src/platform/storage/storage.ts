/**
 * TypeScript resolution fallback. Metro prefers `storage.native.ts` /
 * `storage.web.ts` at bundle time.
 */
export { getItem, removeItem, setItem } from './storage.native';
