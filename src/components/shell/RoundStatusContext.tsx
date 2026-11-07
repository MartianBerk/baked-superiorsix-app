import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { RoundStatus } from './roundStatus';

export type GamedayHeaderChrome = {
  /** Latest subround sequence — header value (`# n`). */
  roundLabel: string;
  /** Pot = buy_in × full_roster × subround — header value (`£…`). */
  prizeLabel: string;
};

type RoundStatusContextValue = {
  /**
   * Live picking status from the player fixtures widget (prediction count).
   * Null when the widget is not publishing (e.g. signed out / unloaded).
   */
  playerPickingStatus: RoundStatus | null;
  setPlayerPickingStatus: (status: RoundStatus | null) => void;
  /** Shell header round / pot values (SS-26). */
  gamedayHeader: GamedayHeaderChrome;
  setGamedayHeader: (chrome: GamedayHeaderChrome) => void;
};

const DEFAULT_HEADER: GamedayHeaderChrome = {
  roundLabel: '# N',
  prizeLabel: '£X',
};

const RoundStatusContext = createContext<RoundStatusContextValue | null>(null);

export function RoundStatusProvider({ children }: { children: ReactNode }) {
  const [playerPickingStatus, setPlayerPickingStatusState] =
    useState<RoundStatus | null>(null);
  const [gamedayHeader, setGamedayHeaderState] =
    useState<GamedayHeaderChrome>(DEFAULT_HEADER);

  const setPlayerPickingStatus = useCallback((status: RoundStatus | null) => {
    setPlayerPickingStatusState((prev) => {
      if (status == null) {
        return null;
      }
      // Publishers without difficulty data omit the field — keep prior pips.
      if (status.slateDifficulty !== undefined || prev?.slateDifficulty == null) {
        return status;
      }
      return { ...status, slateDifficulty: prev.slateDifficulty };
    });
  }, []);

  const setGamedayHeader = useCallback((chrome: GamedayHeaderChrome) => {
    setGamedayHeaderState((prev) =>
      prev.roundLabel === chrome.roundLabel &&
      prev.prizeLabel === chrome.prizeLabel
        ? prev
        : chrome,
    );
  }, []);

  const value = useMemo(
    () => ({
      playerPickingStatus,
      setPlayerPickingStatus,
      gamedayHeader,
      setGamedayHeader,
    }),
    [
      playerPickingStatus,
      setPlayerPickingStatus,
      gamedayHeader,
      setGamedayHeader,
    ],
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
