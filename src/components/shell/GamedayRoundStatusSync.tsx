import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import {
  getLiveScores,
  type LiveScoreFixture,
  type LiveScorePlayer,
  type LiveScoresBoard,
  type PredictionChoice,
} from '@/api/superiorsix';
import { useAuth } from '@/auth';
import {
  splitPotLeadersFromMatchingPredictions,
  type PerfectSixHolder,
} from '@/components/shell/potBanner';
import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
import { isPickCurrentlyCorrect } from '@/features/scores/pickOutcome';
import { LOCK_BEFORE_KICKOFF_MS } from '@/features/scores/liveScoreDisplay';

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

function scoredBoardRows(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
  now: Date,
) {
  return board.scores.map((row) => ({
    displayName: displayName(row),
    isViewer: viewerAuthId != null && row.auth_id === viewerAuthId,
    correct: countCorrectOnBoard(row, board.matches, now),
  }));
}

function predictionBoardRows(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
) {
  return board.scores.map((row) => {
    const predictions: Record<number, PredictionChoice | null> = {};
    for (const match of row.matches) {
      predictions[match.match_id] = match.prediction as PredictionChoice | null;
    }
    return {
      displayName: displayName(row),
      isViewer: viewerAuthId != null && row.auth_id === viewerAuthId,
      predictions,
    };
  });
}

function perfectSixHolders(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
  slateSize: number,
  now: Date,
): PerfectSixHolder[] {
  const need = slateSize > 0 ? slateSize : 6;
  return scoredBoardRows(board, viewerAuthId, now)
    .filter((row) => row.correct >= need)
    .map((row) => ({
      displayName: row.displayName,
      isViewer: row.isViewer,
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

function isFixturesPath(pathname: string): boolean {
  if (
    pathname.includes('/scores') ||
    pathname.includes('/leaders') ||
    pathname.includes('/profile') ||
    pathname.includes('/euros') ||
    pathname.includes('/worldcup')
  ) {
    return false;
  }
  return true;
}

function isSideGamePath(pathname: string): boolean {
  return pathname.includes('/euros') || pathname.includes('/worldcup');
}

/**
 * Single publisher for the shell n/X strip on Super Six player tabs.
 * Derives picking vs live/finished + counts from cached `/game/meta` + `/game/livescores`.
 * Meta is fetched only by `refreshGameMeta` (initial load, auth change, pull-to-refresh).
 * This effect refreshes livescores when meta or strip ownership changes — no `getGameMeta` here.
 * Matches may still push optimistic picking counts while the draft is open.
 * Skips fixtures admin on the fixtures tab, and Euros / World Cup tabs
 * (those publish tournament n / total from SideGamePlayerWidget).
 */
export function GamedayRoundStatusSync() {
  const { isAuthenticated, session } = useAuth();
  const { mode: fixturesMode } = useFixturesTabMode();
  const pathname = usePathname();
  const { setPlayerPickingStatus, gameMeta, gamedayHeader } = useRoundStatus();
  const viewerAuthId = session?.userId ?? null;
  const fixturesAdminOwnsStrip =
    fixturesMode === 'admin' && isFixturesPath(pathname);
  const sideGameOwnsStrip = isSideGamePath(pathname);

  useEffect(() => {
    if (!isAuthenticated) {
      setPlayerPickingStatus(null);
      return;
    }
    // Fixtures admin owns the strip only on the fixtures tab itself.
    if (fixturesAdminOwnsStrip) {
      return;
    }
    // Tournament tabs publish their own n / total Selections.
    if (sideGameOwnsStrip) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      if (!gamedayHeader.metaLoaded) {
        return;
      }
      try {
        const subround = gameMeta?.subround;
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
        const scored = scoredBoardRows(board, viewerAuthId, now);
        const correctCount =
          scored.find((row) => row.isViewer)?.correct ??
          countCorrectOnBoard(viewer, board.matches, now);
        const perfectSix = perfectSixHolders(
          board,
          viewerAuthId,
          slateSize,
          now,
        );
        // Split-pot only while picking (identical prediction maps). Live = perfect only.
        const splitPot =
          phase === 'picking' && perfectSix.length === 0
            ? splitPotLeadersFromMatchingPredictions(
                predictionBoardRows(board, viewerAuthId),
                board.matches.map((m) => m.id),
              )
            : null;

        setPlayerPickingStatus(
          buildPlayerRoundStatus({
            phase,
            slateSize,
            selectedCount,
            correctCount,
            perfectSix,
            splitPot,
          }),
        );
      } catch {
        // Leave prior strip; next mount / ownership change retries.
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    fixturesAdminOwnsStrip,
    sideGameOwnsStrip,
    viewerAuthId,
    setPlayerPickingStatus,
    gameMeta,
    gamedayHeader.metaLoaded,
  ]);

  return null;
}
