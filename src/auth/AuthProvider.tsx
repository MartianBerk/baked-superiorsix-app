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
  acceptInvite,
  fetchAuthMe,
  loginWithPassword,
  registerAuthUser,
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
  /**
   * First login for invitees: register → superiorsix token → accept invite →
   * re-login so JWT roles reflect the grant.
   */
  registerAndAcceptInvite: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  lastSmoke: SuperSixSmokeResult | null;
  runSmoke: () => Promise<SuperSixSmokeResult | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isExpired(session: PersistedSession): boolean {
  return Date.now() >= session.expiresAt;
}

async function buildSession(
  username: string,
  password: string,
): Promise<PersistedSession> {
  const token = await loginWithPassword(username, password, SUPERIORSIX_AUDIENCE);
  const jwtRoles = rolesFromJwt(token.access_token);
  let resolvedUsername =
    usernameFromJwt(token.access_token) ?? username.trim().toLowerCase();
  let userId = subjectFromJwt(token.access_token) ?? '';
  let roles = jwtRoles;

  try {
    const me = await fetchAuthMe(token.access_token);
    resolvedUsername = me.username;
    userId = me.id;
    const membership = me.memberships.find(
      (m) => m.application === SUPERIORSIX_AUDIENCE,
    );
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

  return {
    accessToken: token.access_token,
    audience: token.audience || SUPERIORSIX_AUDIENCE,
    expiresAt: Date.now() + token.expires_in * 1000,
    username: resolvedUsername,
    roles,
    userId,
  };
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

  const persistSignedIn = useCallback(async (next: PersistedSession) => {
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

  const signIn = useCallback(
    async (username: string, password: string) => {
      const next = await buildSession(username, password);
      await persistSignedIn(next);
    },
    [persistSignedIn],
  );

  const registerAndAcceptInvite = useCallback(
    async (username: string, password: string) => {
      const user = username.trim().toLowerCase();
      try {
        await registerAuthUser(user, password);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 409)) {
          throw err;
        }
        // Identity already exists — continue with login + accept.
      }

      // Needs a superiorsix JWT before accept. SS-57 must make that obtainable
      // after register (e.g. provisional membership) or adjust accept auth.
      let next: PersistedSession;
      try {
        next = await buildSession(user, password);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          throw new ApiError(
            403,
            'Registered, but no superiorsix token yet. Accept-invite (SS-57) must grant membership so first login can continue — backend not ready or invite missing.',
          );
        }
        throw err;
      }

      try {
        await acceptInvite(next.accessToken);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          throw new ApiError(
            404,
            'Accept-invite endpoint not available yet (SS-57). Invite was registered; retry after backend lands.',
          );
        }
        throw err;
      }

      // Re-issue JWT so roles from the grant are present.
      next = await buildSession(user, password);
      await persistSignedIn(next);
    },
    [persistSignedIn],
  );

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
      registerAndAcceptInvite,
      signOut,
      lastSmoke,
      runSmoke,
    };
  }, [
    status,
    session,
    signIn,
    registerAndAcceptInvite,
    signOut,
    lastSmoke,
    runSmoke,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
