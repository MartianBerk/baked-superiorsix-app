import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Player leaderboard vs admin parent-round management on the leaders tab. */
export type LeadersTabMode = 'normal' | 'admin';

type LeadersTabModeContextValue = {
  mode: LeadersTabMode;
  setMode: (mode: LeadersTabMode) => void;
};

const LeadersTabModeContext = createContext<LeadersTabModeContextValue | null>(
  null,
);

/**
 * Local shell state for the leaders tab: keep header + bottom nav and swap
 * only the widget body (leaderboard ↔ admin Round start/close).
 */
export function LeadersTabModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LeadersTabMode>('normal');

  const setMode = useCallback((next: LeadersTabMode) => {
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <LeadersTabModeContext.Provider value={value}>
      {children}
    </LeadersTabModeContext.Provider>
  );
}

export function useLeadersTabMode(): LeadersTabModeContextValue {
  const ctx = useContext(LeadersTabModeContext);
  if (!ctx) {
    throw new Error(
      'useLeadersTabMode must be used within LeadersTabModeProvider',
    );
  }
  return ctx;
}
