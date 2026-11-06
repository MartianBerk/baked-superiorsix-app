import type { AdminMatch, LeagueInfo } from '@/api/superiorsix';

import {
  formatKickoffLabel,
  kickoffMinuteKey,
  utcDayKey,
} from './formatMatchDate';

/** Preferred league order for count chips (PL → ELC → EL1 → EL2). */
export const LEAGUE_CODE_ORDER = ['PL', 'ELC', 'EL1', 'EL2'] as const;

export type KickoffGroup = {
  key: string;
  label: string;
  /** Sorted count chips like `3 PL`. */
  leagueCounts: { code: string; count: number }[];
  matches: AdminMatch[];
};

export function distinctDayKeys(matches: AdminMatch[]): string[] {
  const keys = new Set<string>();
  for (const match of matches) {
    keys.add(utcDayKey(match.match_date));
  }
  return [...keys].sort();
}

export function groupMatchesByKickoff(
  matches: AdminMatch[],
  dayKey: string,
  leaguesById: Record<number, LeagueInfo>,
): KickoffGroup[] {
  const forDay = matches
    .filter((match) => utcDayKey(match.match_date) === dayKey)
    .sort((a, b) => {
      const byTime = a.match_date.localeCompare(b.match_date);
      if (byTime !== 0) {
        return byTime;
      }
      const aLeague = leaguesById[a.league_id]?.code ?? '';
      const bLeague = leaguesById[b.league_id]?.code ?? '';
      const aOrder = LEAGUE_CODE_ORDER.indexOf(
        aLeague as (typeof LEAGUE_CODE_ORDER)[number],
      );
      const bOrder = LEAGUE_CODE_ORDER.indexOf(
        bLeague as (typeof LEAGUE_CODE_ORDER)[number],
      );
      const ao = aOrder === -1 ? 99 : aOrder;
      const bo = bOrder === -1 ? 99 : bOrder;
      if (ao !== bo) {
        return ao - bo;
      }
      return a.id - b.id;
    });

  const groups = new Map<string, AdminMatch[]>();
  for (const match of forDay) {
    const key = kickoffMinuteKey(match.match_date);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(match);
    } else {
      groups.set(key, [match]);
    }
  }

  return [...groups.entries()].map(([key, groupMatches]) => {
    const counts = new Map<string, number>();
    for (const match of groupMatches) {
      const code = leaguesById[match.league_id]?.code ?? `L${match.league_id}`;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    const leagueCounts = [...counts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => {
        const ao = LEAGUE_CODE_ORDER.indexOf(
          a.code as (typeof LEAGUE_CODE_ORDER)[number],
        );
        const bo = LEAGUE_CODE_ORDER.indexOf(
          b.code as (typeof LEAGUE_CODE_ORDER)[number],
        );
        const aIdx = ao === -1 ? 99 : ao;
        const bIdx = bo === -1 ? 99 : bo;
        if (aIdx !== bIdx) {
          return aIdx - bIdx;
        }
        return a.code.localeCompare(b.code);
      });

    const sample = groupMatches[0]?.match_date ?? `${dayKey}T${key}:00Z`;
    return {
      key,
      label: formatKickoffLabel(sample),
      leagueCounts,
      matches: groupMatches,
    };
  });
}

export function formatGroupHeader(group: KickoffGroup): string {
  const total = group.matches.length;
  const breakdown = group.leagueCounts
    .map(({ count, code }) => `${count} ${code}`)
    .join(', ');
  // e.g. `3pm (6 TOTAL / 3 PL, 3 ELC)`
  return breakdown
    ? `${group.label} (${total} TOTAL / ${breakdown})`
    : `${group.label} (${total} TOTAL)`;
}

/** Six game-number slots: index 0 → game_number 1, … index 5 → game_number 6. */
export type SelectionSlots = (number | null)[];

export function emptySlots(): SelectionSlots {
  return [null, null, null, null, null, null];
}

/** Build slots from saved `use_match` / `game_number` (does not renumber). */
export function selectedMatchIds(matches: AdminMatch[]): SelectionSlots {
  const slots = emptySlots();
  for (const match of matches) {
    if (match.use_match && match.game_number != null) {
      const index = match.game_number - 1;
      if (index >= 0 && index < 6) {
        slots[index] = match.id;
      }
    }
  }
  return slots;
}

/** Lowest freed game number (1–6), or null when full. */
export function nextGameNumber(slots: SelectionSlots): number | null {
  const index = slots.indexOf(null);
  return index === -1 ? null : index + 1;
}

export function slotsEqual(a: SelectionSlots, b: SelectionSlots): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function occupiedCount(slots: SelectionSlots): number {
  return slots.filter((id) => id != null).length;
}

/** Drop a match id from whichever slot it occupies (other slots unchanged). */
export function dropFromSlots(
  slots: SelectionSlots,
  matchId: number,
): SelectionSlots {
  return slots.map((id) => (id === matchId ? null : id));
}

/**
 * Place `matchId` in the lowest free slot. No-op if already selected or full.
 * Returns null when full and not already present.
 */
export function addToLowestSlot(
  slots: SelectionSlots,
  matchId: number,
): SelectionSlots | null {
  if (slots.includes(matchId)) {
    return slots;
  }
  const gameNumber = nextGameNumber(slots);
  if (gameNumber == null) {
    return null;
  }
  const next = [...slots] as SelectionSlots;
  next[gameNumber - 1] = matchId;
  return next;
}

export function selectionsFromSlots(
  slots: SelectionSlots,
): { id: number; game_number: number }[] {
  const out: { id: number; game_number: number }[] = [];
  slots.forEach((id, index) => {
    if (id != null) {
      out.push({ id, game_number: index + 1 });
    }
  });
  return out;
}
