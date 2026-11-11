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
  /** Latest subround sequence — header value (`#n`). */
  roundLabel: string;
  /** Pot = buy_in × full_roster × subround — header value (`£…`). */
  prizeLabel: string;
  /** False until the first `GET /game/meta` finishes (success or failure). */
  metaLoaded: boolean;
};

type RoundStatusContextValue = {
  /**
   * Super Six picking / live strip (Matches, Scores, etc.).
   * Null when signed out / not publishing.
   */
  playerPickingStatus: RoundStatus | null;
  setPlayerPickingStatus: (status: RoundStatus | null) => void;
  /**
   * Euros / World Cup under-header strip only — never reuse Super Six counts.
   * Published by SideGamePlayerWidget while that tab is open.
   */
  sideGamePickingStatus: RoundStatus | null;
  setSideGamePickingStatus: (status: RoundStatus | null) => void;
  /** Shell header round / pot values (SS-26). */
  gamedayHeader: GamedayHeaderChrome;
  setGamedayHeader: (chrome: GamedayHeaderChrome) => void;
};

const DEFAULT_HEADER: GamedayHeaderChrome = {
  roundLabel: '',
  prizeLabel: '',
  metaLoaded: false,
};

const RoundStatusContext = createContext<RoundStatusContextValue | null>(null);

function mergeStatus(
  prev: RoundStatus | null,
  status: RoundStatus | null,
): RoundStatus | null {
  if (status == null) {
    return null;
  }
  // Publishers without difficulty data omit the field — keep prior pips.
  if (status.slateDifficulty !== undefined || prev?.slateDifficulty == null) {
    return status;
  }
  return { ...status, slateDifficulty: prev.slateDifficulty };
}

export function RoundStatusProvider({ children }: { children: ReactNode }) {
  const [playerPickingStatus, setPlayerPickingStatusState] =
    useState<RoundStatus | null>(null);
  const [sideGamePickingStatus, setSideGamePickingStatusState] =
    useState<RoundStatus | null>(null);
  const [gamedayHeader, setGamedayHeaderState] =
    useState<GamedayHeaderChrome>(DEFAULT_HEADER);

  const setPlayerPickingStatus = useCallback((status: RoundStatus | null) => {
    setPlayerPickingStatusState((prev) => mergeStatus(prev, status));
  }, []);

  const setSideGamePickingStatus = useCallback((status: RoundStatus | null) => {
    setSideGamePickingStatusState((prev) => mergeStatus(prev, status));
  }, []);

  const setGamedayHeader = useCallback((chrome: GamedayHeaderChrome) => {
    setGamedayHeaderState((prev) =>
      prev.roundLabel === chrome.roundLabel &&
      prev.prizeLabel === chrome.prizeLabel &&
      prev.metaLoaded === chrome.metaLoaded
        ? prev
        : chrome,
    );
  }, []);

  const value = useMemo(
    () => ({
      playerPickingStatus,
      setPlayerPickingStatus,
      sideGamePickingStatus,
      setSideGamePickingStatus,
      gamedayHeader,
      setGamedayHeader,
    }),
    [
      playerPickingStatus,
      setPlayerPickingStatus,
      sideGamePickingStatus,
      setSideGamePickingStatus,
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
