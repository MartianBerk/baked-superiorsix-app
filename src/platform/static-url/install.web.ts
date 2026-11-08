/**
 * Keep the web address bar on a single pathless URL (`/`) while Expo Router
 * continues to navigate in-app. Deep links are not required for this product
 * surface: any inbound path/search/hash is normalized to `/` before the router
 * reads the initial location, and push/replace calls never write screen paths.
 */
const STATIC_PATH = '/';

function isAlreadyStatic(): boolean {
  const { pathname, search, hash } = window.location;
  return pathname === STATIC_PATH && search === '' && hash === '';
}

function normalizeLocation(): void {
  if (isAlreadyStatic()) {
    return;
  }
  window.history.replaceState(window.history.state, '', STATIC_PATH);
}

function patchHistoryWriter(
  original: typeof window.history.pushState,
): typeof window.history.pushState {
  return function patchedHistoryWriter(
    this: History,
    data: unknown,
    unused: string,
    _url?: string | URL | null,
  ): void {
    original.call(this, data, unused, STATIC_PATH);
  };
}

let installed = false;

export function installStaticAppUrl(): void {
  if (installed || typeof window === 'undefined') {
    return;
  }
  installed = true;

  normalizeLocation();

  window.history.pushState = patchHistoryWriter(
    window.history.pushState.bind(window.history),
  );
  window.history.replaceState = patchHistoryWriter(
    window.history.replaceState.bind(window.history),
  );

  window.addEventListener('popstate', normalizeLocation);
}
