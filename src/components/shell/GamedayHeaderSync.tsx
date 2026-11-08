import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { getGameMeta, type GameMeta } from '@/api/superiorsix';

import {
  formatPrizePounds,
  formatRoundLabel,
  prizePotPence,
} from '@/features/scores/gamedayHeader';

import { useRoundStatus } from './RoundStatusContext';

function isSideGamePath(pathname: string): boolean {
  return pathname.includes('/euros') || pathname.includes('/worldcup');
}

/**
 * Keeps shell Round / Prize pot labels in sync with SS-16 `GET /game/meta`.
 * Prefers BE `prize_pot_pence` / `round_number`; falls back to FE formula
 * buy_in × full_roster × slate (14×£2 → £28 / £56 / £84…).
 * Skips while on Euros / World Cup tabs (those publish their own pot).
 */
export function GamedayHeaderSync() {
  const pathname = usePathname();
  const { setGamedayHeader } = useRoundStatus();

  useEffect(() => {
    if (isSideGamePath(pathname)) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      let meta: GameMeta | null = null;
      try {
        meta = await getGameMeta();
      } catch {
        meta = null;
      }
      if (cancelled) {
        return;
      }

      if (!meta || meta.round_number < 1) {
        setGamedayHeader({ roundLabel: '# N', prizeLabel: '£X' });
        return;
      }

      let prizePence = meta.prize_pot_pence;
      if (
        prizePence <= 0 &&
        meta.buy_in_pence >= 0 &&
        meta.n_players >= 0 &&
        meta.round_number >= 1
      ) {
        prizePence = prizePotPence(
          meta.buy_in_pence,
          meta.n_players,
          meta.round_number,
        );
      }

      setGamedayHeader({
        roundLabel: formatRoundLabel(meta.round_number),
        prizeLabel: formatPrizePounds(prizePence),
      });
    }

    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname, setGamedayHeader]);

  return null;
}
