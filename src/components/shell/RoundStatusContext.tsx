import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { RoundStatus } from './roundStatus';

type RoundStatusContextValue = {
  /**
   * Live picking status from the player fixtures widget (prediction count).
   * Null when the widget is not publishing (e.g. signed out / unloaded).
   */
  playerPickingStatus: RoundStatus | null;
  setPlayerPickingStatus: (status: RoundStatus | null) => void;
};

const RoundStatusContext = createContext<RoundStatusContextValue | null>(null);

export function RoundStatusProvider({ children }: { children: ReactNode }) {
  const [playerPickingStatus, setPlayerPickingStatusState] =
    useState<RoundStatus | null>(null);

  const setPlayerPickingStatus = useCallback((status: RoundStatus | null) => {
    setPlayerPickingStatusState(status);
  }, []);

  const value = useMemo(
    () => ({ playerPickingStatus, setPlayerPickingStatus }),
    [playerPickingStatus, setPlayerPickingStatus],
  );

  return (
    <RoundStatusContext.Provider value={value}>
      {children}
    </RoundStatusContext.Provider>
  );
}

export function useRoundStatus(): RoundStatusContextValue {
  const ctx = useContext(RoundStatusContext);
  if (!ctx) {
    throw new Error('useRoundStatus must be used within RoundStatusProvider');
  }
  return ctx;
}
