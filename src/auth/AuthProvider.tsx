import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiError,
  SUPERIORSIX_AUDIENCE,
  fetchAuthMe,
  loginWithPassword,
  smokeSuperSixBff,
  type SuperSixSmokeResult,
} from '@/api';

import {
  clearSession,
  loadSession,
  rolesFromJwt,
  saveSession,
  subjectFromJwt,
  usernameFromJwt,
  type PersistedSession,
} from './session';

export type AuthSession = PersistedSession;

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  token: string | null;
  roles: string[];
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  lastSmoke: SuperSixSmokeResult | null;
  runSmoke: () => Promise<SuperSixSmokeResult | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isExpired(session: PersistedSession): boolean {
  return Date.now() >= session.expiresAt;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [lastSmoke, setLastSmoke] = useState<SuperSixSmokeResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (cancelled) {
        return;
      }
      if (!stored || isExpired(stored)) {
        if (stored) {
          await clearSession();
        }
        setSession(null);
        setStatus('signedOut');
        return;
      }
      setSession(stored);
      setStatus('signedIn');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSmoke = useCallback(async (): Promise<SuperSixSmokeResult | null> => {
    if (!session?.accessToken) {
      setLastSmoke(null);
      return null;
    }
    const result = await smokeSuperSixBff(session.accessToken);
    setLastSmoke(result);
    return result;
  }, [session?.accessToken]);

  useEffect(() => {
    if (status !== 'signedIn' || !session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await smokeSuperSixBff(session.accessToken);
        if (!cancelled) {
          setLastSmoke(result);
        }
      } catch {
        if (!cancelled) {
          setLastSmoke({
            healthOk: false,
            tokenAccepted: false,
            probeStatus: 0,
            message: 'Smoke call failed.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session?.accessToken]);

  const signIn = useCallback(async (username: string, password: string) => {
    const token = await loginWithPassword(username, password, SUPERIORSIX_AUDIENCE);
    const jwtRoles = rolesFromJwt(token.access_token);
    let resolvedUsername = usernameFromJwt(token.access_token) ?? username.trim().toLowerCase();
    let userId = subjectFromJwt(token.access_token) ?? '';
    let roles = jwtRoles;

    try {
      const me = await fetchAuthMe(token.access_token);
      resolvedUsername = me.username;
      userId = me.id;
      const membership = me.memberships.find((m) => m.application === SUPERIORSIX_AUDIENCE);
      if (membership?.roles?.length) {
        roles = membership.roles;
      } else if (!roles.length) {
        roles = me.roles;
      }
    } catch (err) {
      // Token issued — me() is nice-to-have for display; JWT claims still work.
      if (!(err instanceof ApiError)) {
        throw err;
      }
    }

    const next: PersistedSession = {
      accessToken: token.access_token,
      audience: token.audience || SUPERIORSIX_AUDIENCE,
      expiresAt: Date.now() + token.expires_in * 1000,
      username: resolvedUsername,
      roles,
      userId,
    };

    await saveSession(next);
    setSession(next);
    setStatus('signedIn');

    try {
      setLastSmoke(await smokeSuperSixBff(next.accessToken));
    } catch (err) {
      setLastSmoke({
        healthOk: false,
        tokenAccepted: false,
        probeStatus: err instanceof ApiError ? err.status : 0,
        message: err instanceof Error ? err.message : 'Smoke call failed.',
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
    setLastSmoke(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const roles = session?.roles ?? [];
    return {
      status,
      session,
      token: session?.accessToken ?? null,
      roles,
      isAuthenticated: status === 'signedIn' && !!session,
      hasRole: (role: string) => roles.includes(role),
      signIn,
      signOut,
      lastSmoke,
      runSmoke,
    };
  }, [status, session, signIn, signOut, lastSmoke, runSmoke]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
