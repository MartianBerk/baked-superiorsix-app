import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Player fixtures stub vs admin match-day selection widget. */
export type FixturesTabMode = 'normal' | 'admin';

type FixturesTabModeContextValue = {
  mode: FixturesTabMode;
  setMode: (mode: FixturesTabMode) => void;
  /** Selected Super Six count for the header `n / 6` strip while in admin mode. */
  selectedCount: number;
  setSelectedCount: (count: number) => void;
};

const FixturesTabModeContext = createContext<FixturesTabModeContextValue | null>(
  null,
);

/**
 * Local shell state for the fixtures tab: keep header + bottom nav and swap
 * only the widget body (player stub ↔ admin match selector).
 */
export function FixturesTabModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<FixturesTabMode>('normal');
  const [selectedCount, setSelectedCountState] = useState(0);

  const setMode = useCallback((next: FixturesTabMode) => {
    setModeState(next);
  }, []);

  const setSelectedCount = useCallback((count: number) => {
    setSelectedCountState(Math.max(0, Math.min(6, count)));
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, selectedCount, setSelectedCount }),
    [mode, setMode, selectedCount, setSelectedCount],
  );

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
