/**
 * Keep the web address bar on a single pathless URL (`/` or `/super`) while
 * Expo Router continues to navigate in-app. Deep links are not required for
 * this product surface: any inbound path/search/hash is normalized before the
 * router reads the initial location, and push/replace calls never write paths.
 */
import Constants from 'expo-constants';

function getStaticPath(): string {
  const raw =
    Constants.expoConfig?.experiments?.baseUrl ??
    process.env.EXPO_BASE_URL ??
    '';
  if (!raw) {
    return '/';
  }
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/$/, '') || '/';
}

function getStaticPathFromLocation(): string {
  const configured = getStaticPath();
  if (configured !== '/') {
    return configured;
  }
  const { pathname } = window.location;
  if (pathname === '/super' || pathname.startsWith('/super/')) {
    return '/super';
  }
  return '/';
}

function isAlreadyStatic(staticPath: string): boolean {
  const { pathname, search, hash } = window.location;
  return pathname === staticPath && search === '' && hash === '';
}

function normalizeLocation(): void {
  const staticPath = getStaticPathFromLocation();
  if (isAlreadyStatic(staticPath)) {
    return;
  }
  window.history.replaceState(window.history.state, '', staticPath);
}

function patchHistoryWriter(
  original: typeof window.history.pushState,
  staticPath: string,
): typeof window.history.pushState {
  return function patchedHistoryWriter(
    this: History,
    data: unknown,
    unused: string,
    _url?: string | URL | null,
  ): void {
    original.call(this, data, unused, staticPath);
  };
}

let installed = false;

export function installStaticAppUrl(): void {
  if (installed || typeof window === 'undefined') {
    return;
  }
  installed = true;

  const staticPath = getStaticPathFromLocation();
  normalizeLocation();

  window.history.pushState = patchHistoryWriter(
    window.history.pushState.bind(window.history),
    staticPath,
  );
  window.history.replaceState = patchHistoryWriter(
    window.history.replaceState.bind(window.history),
    staticPath,
  );

  window.addEventListener('popstate', normalizeLocation);
}
