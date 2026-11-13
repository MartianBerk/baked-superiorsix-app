import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getEurosMeta,
  getWorldcupMeta,
  isEurosOpen,
  isWorldcupOpen,
  type EurosMeta,
  type WorldcupMeta,
} from '@/api/sideGames';

type SideGamesOpenContextValue = {
  eurosOpen: boolean;
  worldcupOpen: boolean;
  eurosMeta: EurosMeta | null;
  worldcupMeta: WorldcupMeta | null;
  refresh: () => Promise<void>;
};

const SideGamesOpenContext = createContext<SideGamesOpenContextValue | null>(
  null,
);

/**
 * Fetches public euros / worldcup meta once on mount so the bottom nav can
 * show at most one trophy tab (`open` from meta). No interval — admin open /
 * close and side-game widgets call `refresh` after state changes.
 */
export function SideGamesOpenProvider({ children }: { children: ReactNode }) {
  const [eurosMeta, setEurosMeta] = useState<EurosMeta | null>(null);
  const [worldcupMeta, setWorldcupMeta] = useState<WorldcupMeta | null>(null);

  const refresh = useCallback(async () => {
    const [eurosSettled, worldcupSettled] = await Promise.allSettled([
      getEurosMeta(),
      getWorldcupMeta(),
    ]);
    if (eurosSettled.status === 'fulfilled') {
      setEurosMeta(eurosSettled.value);
    } else {
      setEurosMeta(null);
    }
    if (worldcupSettled.status === 'fulfilled') {
      setWorldcupMeta(worldcupSettled.value);
    } else {
      setWorldcupMeta(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void refresh();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      eurosOpen: isEurosOpen(eurosMeta),
      worldcupOpen: isWorldcupOpen(worldcupMeta),
      eurosMeta,
      worldcupMeta,
      refresh,
    }),
    [eurosMeta, worldcupMeta, refresh],
  );

  return (
    <SideGamesOpenContext.Provider value={value}>
      {children}
    </SideGamesOpenContext.Provider>
  );
}

export function useSideGamesOpen(): SideGamesOpenContextValue {
  const ctx = useContext(SideGamesOpenContext);
  if (!ctx) {
    throw new Error(
      'useSideGamesOpen must be used within SideGamesOpenProvider',
    );
  }
  return ctx;
}
