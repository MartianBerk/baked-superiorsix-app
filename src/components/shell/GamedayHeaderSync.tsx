import { useEffect } from 'react';

import { getGameMeta, type GameMeta } from '@/api/superiorsix';

import {
  formatPrizePounds,
  formatRoundLabel,
  prizePotPence,
} from '@/features/scores/gamedayHeader';

import { useRoundStatus } from './RoundStatusContext';

/**
 * Loads shell Round / Prize pot labels once from SS-16 `GET /game/meta`.
 * No interval — pot/round change only on remount / refresh, not every 60s.
 * Prefers BE `prize_pot_pence` / `round_number`; falls back to FE formula
 * buy_in × full_roster × slate (14×£2 → £28 / £56 / £84…).
 * Runs on all Super Six tabs (including Euros / World Cup) — tournament pot
 * lives on the scrubber row only, not the app header.
 */
export function GamedayHeaderSync() {
  const { setGamedayHeader } = useRoundStatus();

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, [setGamedayHeader]);

  return null;
}
