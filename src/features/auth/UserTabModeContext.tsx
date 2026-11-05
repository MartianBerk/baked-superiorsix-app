import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Normal profile widget vs admin invite/roster widget on the user tab. */
export type UserTabMode = 'normal' | 'admin';

type UserTabModeContextValue = {
  mode: UserTabMode;
  setMode: (mode: UserTabMode) => void;
  /** Flip to the other mode (normal ↔ admin). */
  swapMode: () => void;
};

const UserTabModeContext = createContext<UserTabModeContextValue | null>(null);

/**
 * Local shell state for the rightmost user tab: keep header + bottom nav and
 * swap only the widget body (no `/(admin)` route).
 */
export function UserTabModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UserTabMode>('normal');

  const setMode = useCallback((next: UserTabMode) => {
    setModeState(next);
  }, []);

  const swapMode = useCallback(() => {
    setModeState((prev) => (prev === 'normal' ? 'admin' : 'normal'));
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, swapMode }),
    [mode, setMode, swapMode],
  );

  return (
    <UserTabModeContext.Provider value={value}>
      {children}
    </UserTabModeContext.Provider>
  );
}

export function useUserTabMode(): UserTabModeContextValue {
  const ctx = useContext(UserTabModeContext);
  if (!ctx) {
    throw new Error('useUserTabMode must be used within UserTabModeProvider');
  }
  return ctx;
}
