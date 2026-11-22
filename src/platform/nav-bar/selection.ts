/**
 * TypeScript resolution fallback. Metro prefers `selection.native.ts` /
 * `selection.web.ts` at bundle time.
 */
export {
  navBarHitActiveStyle,
  navBarIconActiveColor,
  navBarIconInactiveColor,
} from './selection.native';
