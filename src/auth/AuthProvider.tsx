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
  setPasswordAuthUser,
  smokeSuperSixBff,
  type AcceptInviteResult,
  type SuperSixSmokeResult,
} from '@/api';

import {
  clearSession,
  decodeJwtPayload,
  loadSession,
  rolesFromJwt,
  saveSession,
  subjectFromJwt,
  emailFromJwt,
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
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * First login for invitees: set-password claim → acceptinvite →
   * session from returned access_token. Membership was granted at invite.
   */
  claimAndAcceptInvite: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  lastSmoke: SuperSixSmokeResult | null;
  runSmoke: () => Promise<SuperSixSmokeResult | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isExpired(session: PersistedSession): boolean {
  return Date.now() >= session.expiresAt;
}

function expiresAtFromJwt(token: string, fallbackMs = 60 * 60 * 1000): number {
  const payload = decodeJwtPayload(token);
  if (typeof payload?.exp === 'number') {
    return payload.exp * 1000;
  }
  return Date.now() + fallbackMs;
}

async function enrichSession(
  accessToken: string,
  audience: string,
  expiresAt: number,
  emailHint: string,
  rolesHint: string[],
): Promise<PersistedSession> {
  const jwtRoles = rolesFromJwt(accessToken);
  let resolvedEmail = emailFromJwt(accessToken) ?? emailHint;
  let userId = subjectFromJwt(accessToken) ?? '';
  let roles = rolesHint.length ? rolesHint : jwtRoles;

  try {
    const me = await fetchAuthMe(accessToken);
    resolvedEmail = me.email;
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
    accessToken,
    audience: audience || SUPERIORSIX_AUDIENCE,
    expiresAt,
    email: resolvedEmail,
    roles,
    userId,
  };
}

async function buildSessionFromLogin(
  email: string,
  password: string,
): Promise<PersistedSession> {
  const token = await loginWithPassword(email, password, SUPERIORSIX_AUDIENCE);
  return enrichSession(
    token.access_token,
    token.audience || SUPERIORSIX_AUDIENCE,
    Date.now() + token.expires_in * 1000,
    email.trim().toLowerCase(),
    rolesFromJwt(token.access_token),
  );
}

async function buildSessionFromAccept(
  result: AcceptInviteResult,
  emailHint: string,
): Promise<PersistedSession> {
  return enrichSession(
    result.access_token,
    result.audience || SUPERIORSIX_AUDIENCE,
    expiresAtFromJwt(result.access_token),
    emailHint,
    Array.isArray(result.roles) ? result.roles : [],
  );
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
    async (email: string, password: string) => {
      const next = await buildSessionFromLogin(email, password);
      await persistSignedIn(next);
    },
    [persistSignedIn],
  );

  const claimAndAcceptInvite = useCallback(
    async (email: string, password: string) => {
      const addr = email.trim().toLowerCase();
      try {
        await setPasswordAuthUser(addr, password);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 409)) {
          throw err;
        }
        // Password already claimed — continue with acceptinvite / login.
      }

      const accepted = await acceptInvite({ email: addr, password });
      const next = await buildSessionFromAccept(accepted, addr);
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
      claimAndAcceptInvite,
      signOut,
      lastSmoke,
      runSmoke,
    };
  }, [
    status,
    session,
    signIn,
    claimAndAcceptInvite,
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
