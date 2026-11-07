import { useEffect } from 'react';

import {
  getGameCurrentRound,
  isNoRoundInProgressError,
  listGameSubrounds,
  type GameCurrentRound,
  type Subround,
} from '@/api/superiorsix';

import {
  formatPrizePounds,
  formatRoundLabel,
  prizePotPence,
} from '@/features/scores/gamedayHeader';

import { useRoundStatus } from './RoundStatusContext';

/** Prefer explicit subround fields; else max sequence from the subround list. */
function resolveSubroundNumber(
  round: GameCurrentRound | null,
  subrounds: Subround[],
): number | null {
  const fromRound = round?.subround ?? round?.matches ?? null;
  if (fromRound != null && fromRound >= 1) {
    return Math.trunc(fromRound);
  }
  if (subrounds.length === 0) {
    return null;
  }
  let max = 0;
  for (const row of subrounds) {
    if (row.sequence > max) {
      max = row.sequence;
    }
  }
  return max >= 1 ? max : null;
}

/**
 * Keeps shell Round / Prize pot labels in sync with SS-16 currentround +
 * latest subround. Pot = buy_in_pence × full_roster × subround_number.
 */
export function GamedayHeaderSync() {
  const { setGamedayHeader } = useRoundStatus();

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      let round: GameCurrentRound | null = null;
      let subrounds: Subround[] = [];
      try {
        round = await getGameCurrentRound();
      } catch {
        round = null;
      }
      try {
        subrounds = await listGameSubrounds();
      } catch (err) {
        if (!isNoRoundInProgressError(err)) {
          // Leave placeholders on unexpected failures.
        }
        subrounds = [];
      }
      if (cancelled) {
        return;
      }

      const subroundNumber = resolveSubroundNumber(round, subrounds);
      const buyIn = round?.buy_in_pence ?? null;
      const roster = round?.players ?? null;

      let prizeLabel = '£X';
      if (
        buyIn != null &&
        roster != null &&
        subroundNumber != null &&
        buyIn >= 0 &&
        roster >= 0 &&
        subroundNumber >= 1
      ) {
        prizeLabel = formatPrizePounds(
          prizePotPence(buyIn, roster, subroundNumber),
        );
      } else if (round?.jackpot != null && round.jackpot > 0) {
        // Fallback while SS-16 still only ships legacy jackpot.
        prizeLabel = formatPrizePounds(round.jackpot);
      }

      setGamedayHeader({
        roundLabel: formatRoundLabel(subroundNumber),
        prizeLabel,
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
  }, [setGamedayHeader]);

  return null;
}
