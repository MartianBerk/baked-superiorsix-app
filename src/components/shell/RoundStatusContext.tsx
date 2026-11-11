import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getGameMeta, type GameMeta } from '@/api/superiorsix';

import { headerChromeFromGameMeta } from './gamedayMetaFromApi';
import type { RoundStatus } from './roundStatus';

export type GamedayHeaderChrome = {
  /** Latest subround sequence — header value (`#n`). */
  roundLabel: string;
  /** Pot = buy_in × full_roster × subround — header value (`£…`). */
  prizeLabel: string;
  /** False until the first `GET /game/meta` finishes (success or failure). */
  metaLoaded: boolean;
};

type RefreshGameMetaOptions = {
  /** Keep showing the previous header while refetching (pull-to-refresh). */
  preserveChrome?: boolean;
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
  /** Cached `GET /game/meta` for header + round-status strip (single fetch source). */
  gameMeta: GameMeta | null;
  refreshGameMeta: (options?: RefreshGameMetaOptions) => Promise<void>;
  clearGamedayMeta: () => void;
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
  const [gameMeta, setGameMeta] = useState<GameMeta | null>(null);
  const metaInFlightRef = useRef<Promise<void> | null>(null);

  const setPlayerPickingStatus = useCallback((status: RoundStatus | null) => {
    setPlayerPickingStatusState((prev) => mergeStatus(prev, status));
  }, []);

  const setSideGamePickingStatus = useCallback((status: RoundStatus | null) => {
    setSideGamePickingStatusState((prev) => mergeStatus(prev, status));
  }, []);

  const clearGamedayMeta = useCallback(() => {
    setGameMeta(null);
    setGamedayHeaderState({
      roundLabel: '',
      prizeLabel: '',
      metaLoaded: true,
    });
  }, []);

  const refreshGameMeta = useCallback(async (options?: RefreshGameMetaOptions) => {
    if (metaInFlightRef.current) {
      return metaInFlightRef.current;
    }

    const preserveChrome = options?.preserveChrome ?? false;
    if (!preserveChrome) {
      setGamedayHeaderState({
        roundLabel: '',
        prizeLabel: '',
        metaLoaded: false,
      });
    }

    const task = (async () => {
      try {
        const meta = await getGameMeta();
        setGameMeta(meta);
        setGamedayHeaderState(headerChromeFromGameMeta(meta));
      } catch {
        setGameMeta(null);
        setGamedayHeaderState({
          roundLabel: '',
          prizeLabel: '',
          metaLoaded: true,
        });
      }
    })();

    metaInFlightRef.current = task.finally(() => {
      metaInFlightRef.current = null;
    });
    return metaInFlightRef.current;
  }, []);

  const value = useMemo(
    () => ({
      playerPickingStatus,
      setPlayerPickingStatus,
      sideGamePickingStatus,
      setSideGamePickingStatus,
      gamedayHeader,
      gameMeta,
      refreshGameMeta,
      clearGamedayMeta,
    }),
    [
      playerPickingStatus,
      setPlayerPickingStatus,
      sideGamePickingStatus,
      setSideGamePickingStatus,
      gamedayHeader,
      gameMeta,
      refreshGameMeta,
      clearGamedayMeta,
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
