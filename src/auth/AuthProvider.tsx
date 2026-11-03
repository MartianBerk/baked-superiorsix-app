import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type AuthSession = {
  token: string | null;
  roles: string[];
};

type AuthContextValue = AuthSession & {
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Session stub — real baked-auth JWT wiring comes in a later slice. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      token: null,
      roles: [],
      isAuthenticated: false,
      hasRole: () => false,
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
