import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Player scores placeholder vs admin on-behalf predictions on the scores tab. */
export type ScoresTabMode = 'normal' | 'admin';

type ScoresTabModeContextValue = {
  mode: ScoresTabMode;
  setMode: (mode: ScoresTabMode) => void;
};

const ScoresTabModeContext = createContext<ScoresTabModeContextValue | null>(
  null,
);

/**
 * Local shell state for the scores tab: keep header + bottom nav and swap
 * only the widget body (scores ↔ admin player predictions).
 */
export function ScoresTabModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ScoresTabMode>('normal');

  const setMode = useCallback((next: ScoresTabMode) => {
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ScoresTabModeContext.Provider value={value}>
      {children}
    </ScoresTabModeContext.Provider>
  );
}

export function useScoresTabMode(): ScoresTabModeContextValue {
  const ctx = useContext(ScoresTabModeContext);
  if (!ctx) {
    throw new Error(
      'useScoresTabMode must be used within ScoresTabModeProvider',
    );
  }
  return ctx;
}
