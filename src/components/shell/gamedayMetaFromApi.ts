import type { GameMeta } from '@/api/superiorsix';
import {
  formatPrizePounds,
  formatRoundLabel,
  prizePotPence,
} from '@/features/scores/gamedayHeader';

import type { GamedayHeaderChrome } from './RoundStatusContext';

export function headerChromeFromGameMeta(meta: GameMeta | null): GamedayHeaderChrome {
  if (!meta || meta.round_number < 1) {
    return { roundLabel: '', prizeLabel: '', metaLoaded: true };
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

  return {
    roundLabel: formatRoundLabel(meta.round_number),
    prizeLabel: formatPrizePounds(prizePence),
    metaLoaded: true,
  };
}
