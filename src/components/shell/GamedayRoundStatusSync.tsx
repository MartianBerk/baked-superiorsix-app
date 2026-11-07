import { useEffect } from 'react';

import {
  getGameMeta,
  getLiveScores,
  type LiveScoreFixture,
  type LiveScorePlayer,
  type LiveScoresBoard,
  type PredictionChoice,
} from '@/api/superiorsix';
import { useAuth } from '@/auth';
import type { PerfectSixHolder } from '@/components/shell/potBanner';
import { isPickCurrentlyCorrect } from '@/features/scores/pickOutcome';
import { LIVE_POLL_MS, LOCK_BEFORE_KICKOFF_MS } from '@/features/scores/liveScoreDisplay';

import {
  buildPlayerRoundStatus,
  countSelectedPredictions,
  resolvePlayerRoundPhase,
} from './playerRoundStatus';
import { useRoundStatus } from './RoundStatusContext';

function isKickoffLocked(minKickoff: string | null | undefined, now: Date): boolean {
  if (!minKickoff) {
    return false;
  }
  const kickoffMs = Date.parse(minKickoff);
  if (!Number.isFinite(kickoffMs)) {
    return false;
  }
  return now.getTime() + LOCK_BEFORE_KICKOFF_MS >= kickoffMs;
}

function displayName(row: LiveScorePlayer): string {
  if (typeof row.nickname === 'string' && row.nickname.trim()) {
    return row.nickname.trim();
  }
  if (typeof row.first_name === 'string' && row.first_name.trim()) {
    return row.first_name.trim();
  }
  if (row.name.trim()) {
    return row.name.trim();
  }
  return 'Player';
}

function fixtureAsMatch(fixture: LiveScoreFixture) {
  return {
    id: fixture.id,
    home_team: fixture.home_team,
    away_team: fixture.away_team,
    home_score: fixture.home_score,
    away_score: fixture.away_score,
    status: fixture.status,
    match_minute: fixture.match_minute,
    game_number: fixture.game_number,
    match_date: fixture.match_date,
    subround_id: fixture.subround_id,
  };
}

function countCorrectOnBoard(
  player: LiveScorePlayer | undefined,
  fixtures: LiveScoreFixture[],
  now: Date,
): number {
  if (!player) {
    return 0;
  }
  const byId = new Map(
    player.matches.map((row) => [row.match_id, row.prediction] as const),
  );
  let correct = 0;
  for (const fixture of fixtures) {
    const prediction = byId.get(fixture.id) ?? null;
    if (isPickCurrentlyCorrect(prediction, fixtureAsMatch(fixture), now)) {
      correct += 1;
    }
  }
  return correct;
}

function perfectSixHolders(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
  slateSize: number,
  now: Date,
): PerfectSixHolder[] {
  const need = slateSize > 0 ? slateSize : 6;
  return board.scores
    .filter(
      (row) => countCorrectOnBoard(row, board.matches, now) >= need,
    )
    .map((row) => ({
      displayName: displayName(row),
      isViewer: viewerAuthId != null && row.auth_id === viewerAuthId,
    }));
}

function selectedCountForViewer(
  player: LiveScorePlayer | undefined,
): number {
  if (!player) {
    return 0;
  }
  return countSelectedPredictions(
    player.matches.map((row) => row.prediction as PredictionChoice | null),
  );
}

/**
 * Single publisher for the shell n/X strip on every player tab.
 * Derives picking vs live/finished + counts from `/game/meta` + `/game/livescores`.
 * Matches may still push optimistic picking counts while the draft is open.
 */
export function GamedayRoundStatusSync() {
  const { isAuthenticated, session } = useAuth();
  const { setPlayerPickingStatus } = useRoundStatus();
  const viewerAuthId = session?.userId ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      setPlayerPickingStatus(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (ms: number) => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        void refresh();
      }, ms);
    };

    async function refresh() {
      try {
        const meta = await getGameMeta();
        const subround = meta.subround;
        if (!subround) {
          if (!cancelled) {
            setPlayerPickingStatus(
              buildPlayerRoundStatus({
                phase: 'picking',
                slateSize: 0,
                selectedCount: 0,
                correctCount: 0,
              }),
            );
          }
          schedule(60_000);
          return;
        }

        const board = await getLiveScores({ subroundId: subround.id });
        if (cancelled) {
          return;
        }

        const now = new Date();
        const slateSize =
          board.matches.length > 0
            ? board.matches.length
            : board.match_count > 0
              ? board.match_count
              : (subround.match_count ?? 0);
        const viewer = board.scores.find(
          (row) => row.auth_id === viewerAuthId,
        );
        const kickoffLocked = isKickoffLocked(
          board.min_kickoff ?? subround.min_kickoff,
          now,
        );
        const phase = resolvePlayerRoundPhase({
          boardLive: board.live,
          subroundOver: subround.is_over,
          kickoffLocked,
        });
        const selectedCount = selectedCountForViewer(viewer);
        const correctCount = countCorrectOnBoard(viewer, board.matches, now);
        const perfectSix = perfectSixHolders(
          board,
          viewerAuthId,
          slateSize,
          now,
        );

        setPlayerPickingStatus(
          buildPlayerRoundStatus({
            phase,
            slateSize,
            selectedCount,
            correctCount,
            perfectSix,
          }),
        );

        schedule(board.live ? LIVE_POLL_MS : 30_000);
      } catch {
        if (!cancelled) {
          schedule(60_000);
        }
      }
    }

    void refresh();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isAuthenticated, viewerAuthId, setPlayerPickingStatus]);

  return null;
}
