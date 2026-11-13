import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  getLiveScores,
  type LiveScoresBoard,
} from '@/api/superiorsix';
import { LIVE_POLL_MS } from '@/features/scores/liveScoreDisplay';

type FetchLiveScoresOptions = {
  /** Bypass cache and refetch (PTR / quiet live poll). */
  force?: boolean;
  /**
   * When aborted, this waiter ignores the result. The shared network request
   * keeps running so Strict Mode remounts can join the same in-flight promise.
   */
  signal?: AbortSignal;
};

type WatchOptions = {
  /** Matches: one-shot wake at `next_kickoff` while not live. */
  wakeOnNextKickoff?: boolean;
};

type LiveScoresContextValue = {
  boards: Record<number, LiveScoresBoard>;
  fetchLiveScores: (
    subroundId: number,
    opts?: FetchLiveScoresOptions,
  ) => Promise<LiveScoresBoard>;
  /** Register interest so the provider owns live poll / optional kickoff wake. */
  watchSubround: (
    subroundId: number | null,
    opts?: WatchOptions,
  ) => () => void;
};

type InflightEntry = {
  promise: Promise<LiveScoresBoard>;
};

const LiveScoresContext = createContext<LiveScoresContextValue | null>(null);

/**
 * One fetch/cache for `/game/livescores` per subround — strip, Matches, and
 * Scores join the same in-flight promise instead of triple-hitting the API.
 */
export function LiveScoresProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<Record<number, LiveScoresBoard>>({});
  const boardsRef = useRef(boards);
  boardsRef.current = boards;

  const inFlightRef = useRef(new Map<number, InflightEntry>());
  const watchIdRef = useRef(0);
  const watchesRef = useRef(
    new Map<number, { subroundId: number; wakeOnNextKickoff: boolean }>(),
  );
  const [watchGen, setWatchGen] = useState(0);

  const fetchLiveScores = useCallback(
    async (
      subroundId: number,
      opts?: FetchLiveScoresOptions,
    ): Promise<LiveScoresBoard> => {
      const signal = opts?.signal;
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      if (!opts?.force) {
        const cached = boardsRef.current[subroundId];
        if (cached && !inFlightRef.current.has(subroundId)) {
          return cached;
        }
      }

      let entry = inFlightRef.current.get(subroundId);
      if (!entry) {
        const controller = new AbortController();
        const promise = getLiveScores({
          subroundId,
          signal: controller.signal,
        })
          .then((board) => {
            setBoards((prev) => ({ ...prev, [subroundId]: board }));
            return board;
          })
          .finally(() => {
            const current = inFlightRef.current.get(subroundId);
            if (current?.promise === promise) {
              inFlightRef.current.delete(subroundId);
            }
          });
        entry = { promise };
        inFlightRef.current.set(subroundId, entry);
      }

      const board = await entry.promise;
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return board;
    },
    [],
  );

  const watchSubround = useCallback(
    (subroundId: number | null, opts?: WatchOptions) => {
      if (subroundId == null) {
        return () => undefined;
      }
      const id = ++watchIdRef.current;
      watchesRef.current.set(id, {
        subroundId,
        wakeOnNextKickoff: opts?.wakeOnNextKickoff === true,
      });
      setWatchGen((g) => g + 1);
      return () => {
        watchesRef.current.delete(id);
        setWatchGen((g) => g + 1);
      };
    },
    [],
  );

  const watchedSubrounds = useMemo(() => {
    void watchGen;
    const byId = new Map<number, { wakeOnNextKickoff: boolean }>();
    for (const watch of watchesRef.current.values()) {
      const prev = byId.get(watch.subroundId);
      byId.set(watch.subroundId, {
        wakeOnNextKickoff:
          Boolean(prev?.wakeOnNextKickoff) || watch.wakeOnNextKickoff,
      });
    }
    return byId;
  }, [watchGen]);

  // Quiet live poll — one interval per live watched subround.
  useEffect(() => {
    const liveIds: number[] = [];
    for (const subroundId of watchedSubrounds.keys()) {
      if (boards[subroundId]?.live) {
        liveIds.push(subroundId);
      }
    }
    if (liveIds.length === 0) {
      return;
    }
    const id = setInterval(() => {
      for (const subroundId of liveIds) {
        void fetchLiveScores(subroundId, { force: true }).catch(() => {
          // Quiet — leave prior board; next tick retries.
        });
      }
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [boards, watchedSubrounds, fetchLiveScores]);

  // Matches next-kickoff wake (only for watches that opted in).
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [subroundId, opts] of watchedSubrounds) {
      if (!opts.wakeOnNextKickoff) {
        continue;
      }
      const board = boards[subroundId];
      if (!board || board.live || !board.next_kickoff) {
        continue;
      }
      const wait = new Date(board.next_kickoff).getTime() - Date.now();
      if (!Number.isFinite(wait) || wait <= 0 || wait >= 24 * 60 * 60 * 1000) {
        continue;
      }
      timers.push(
        setTimeout(() => {
          void fetchLiveScores(subroundId, { force: true }).catch(() => {
            // Quiet wake failure.
          });
        }, wait + 250),
      );
    }
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [boards, watchedSubrounds, fetchLiveScores]);

  const value = useMemo(
    () => ({
      boards,
      fetchLiveScores,
      watchSubround,
    }),
    [boards, fetchLiveScores, watchSubround],
  );

  return (
    <LiveScoresContext.Provider value={value}>
      {children}
    </LiveScoresContext.Provider>
  );
}

export function useLiveScores(): LiveScoresContextValue {
  const ctx = useContext(LiveScoresContext);
  if (!ctx) {
    throw new Error('useLiveScores must be used within LiveScoresProvider');
  }
  return ctx;
}

/**
 * Subscribe to a subround board + provider-owned live poll / optional kickoff wake.
 */
export function useLiveScoresBoard(
  subroundId: number | null,
  opts?: WatchOptions,
): {
  board: LiveScoresBoard | null;
  boardLive: boolean;
  nextKickoff: string | null;
  fetchLiveScores: (
    id: number,
    fetchOpts?: FetchLiveScoresOptions,
  ) => Promise<LiveScoresBoard>;
} {
  const { boards, fetchLiveScores, watchSubround } = useLiveScores();
  const wakeOnNextKickoff = opts?.wakeOnNextKickoff === true;

  useEffect(() => {
    return watchSubround(subroundId, { wakeOnNextKickoff });
  }, [subroundId, wakeOnNextKickoff, watchSubround]);

  const board = subroundId != null ? (boards[subroundId] ?? null) : null;
  return {
    board,
    boardLive: board?.live === true,
    nextKickoff: board?.next_kickoff ?? null,
    fetchLiveScores,
  };
}
