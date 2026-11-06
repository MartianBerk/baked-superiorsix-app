import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Player predictions vs admin match-day selection widget. */
export type FixturesTabMode = 'normal' | 'admin';

type FixturesTabModeContextValue = {
  mode: FixturesTabMode;
  setMode: (mode: FixturesTabMode) => void;
};

const FixturesTabModeContext = createContext<FixturesTabModeContextValue | null>(
  null,
);

/**
 * Local shell state for the fixtures tab: keep header + bottom nav and swap
 * only the widget body (player predictions ↔ admin match selector).
 */
export function FixturesTabModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<FixturesTabMode>('normal');

  const setMode = useCallback((next: FixturesTabMode) => {
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <FixturesTabModeContext.Provider value={value}>
      {children}
    </FixturesTabModeContext.Provider>
  );
}

export function useFixturesTabMode(): FixturesTabModeContextValue {
  const ctx = useContext(FixturesTabModeContext);
  if (!ctx) {
    throw new Error(
      'useFixturesTabMode must be used within FixturesTabModeProvider',
    );
  }
  return ctx;
}
