import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  addPrediction,
  isNoRoundInProgressError,
  listGameSubrounds,
  type LiveScoreFixture,
  type LiveScoresBoard,
  type PredictionChoice,
  type Subround,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { useLiveScoresBoard } from '@/components/shell/LiveScoresContext';
import {
  splitPotLeadersFromMatchingPredictions,
  type PerfectSixHolder,
  type SplitPotPredictionMap,
} from '@/components/shell/potBanner';
import {
  buildPlayerRoundStatus,
  resolvePlayerRoundPhase,
} from '@/components/shell/playerRoundStatus';
import { useRoundStatus } from '@/components/shell/RoundStatusContext';
import { KickoffDateDisplay } from '@/features/scores/KickoffDateDisplay';
import { isPostponedStatus } from '@/features/scores/liveScoreDisplay';
import { colors } from '@/theme';

import { scoreListChrome } from '@/features/scores/scoreListChrome';

import { aggregateSelectionDifficulty } from './matchDifficulty';
import {
  MatchPredictRow,
  teamColumnWidthForMatches,
  type PlayerMatch,
} from './MatchPredictRow';
import { SubroundScrubber } from './SubroundScrubber';

/**
 * FE subround lock: all picks lock once `now + 10m >= min_kickoff`
 * (matches BE `/user/addprediction` cutoff for the match’s subround).
 */
const CUTOFF_MS = 10 * 60 * 1000;

function isPastCutoff(matchDateIso: string, now: Date = new Date()): boolean {
  const kickoff = new Date(matchDateIso).getTime();
  if (!Number.isFinite(kickoff)) {
    return false;
  }
  return now.getTime() + CUTOFF_MS >= kickoff;
}

function sortPlayerMatches(matches: PlayerMatch[]): PlayerMatch[] {
  return [...matches].sort((a, b) => {
    const aNum = a.game_number ?? 99;
    const bNum = b.game_number ?? 99;
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    return a.match_date.localeCompare(b.match_date) || a.id - b.id;
  });
}

/** Prefer open-for-editing with matches; else latest active; else latest. */
function pickPlayerSubround(
  list: Subround[],
  preferredId: number | null,
): Subround | null {
  const withMatches = list.filter((row) => row.match_count > 0);
  if (withMatches.length === 0) {
    return null;
  }
  if (preferredId != null) {
    const preferred = withMatches.find((row) => row.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }
  const open = withMatches.find((row) => row.is_open_for_editing && !row.is_over);
  if (open) {
    return open;
  }
  const active = withMatches.filter((row) => !row.is_over);
  if (active.length > 0) {
    return active[active.length - 1];
  }
  return withMatches[withMatches.length - 1];
}

function fixtureToPlayerMatch(fixture: LiveScoreFixture): PlayerMatch {
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
    league_id: fixture.league_id,
    league_code: fixture.league_code,
    difficulty: fixture.difficulty ?? null,
  };
}

function mergeBoardFixtures(
  existing: PlayerMatch[],
  boardMatches: LiveScoreFixture[],
): PlayerMatch[] {
  if (boardMatches.length === 0) {
    return existing;
  }
  const difficultyById = new Map(
    existing.map((m) => [m.id, m.difficulty] as const),
  );
  return sortPlayerMatches(
    boardMatches.map((fixture) =>
      fixtureToPlayerMatch({
        ...fixture,
        difficulty:
          fixture.difficulty ?? difficultyById.get(fixture.id) ?? null,
      }),
    ),
  );
}

/** Viewer picks from one livescores board (avoids N× getprediction). */
function draftFromBoard(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
): Record<number, PredictionChoice | null> {
  const next: Record<number, PredictionChoice | null> = {};
  if (!viewerAuthId) {
    return next;
  }
  const mine = board.scores.find((row) => row.auth_id === viewerAuthId);
  if (!mine) {
    return next;
  }
  for (const row of mine.matches) {
    next[row.match_id] = row.prediction;
  }
  return next;
}

function displayNameFromLiveScore(row: {
  name: string;
  nickname?: string | null;
  first_name?: string;
}): string {
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

type PredictionRow = {
  displayName: string;
  isViewer: boolean;
  predictions: SplitPotPredictionMap;
};

function scoredFromBoard(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
) {
  return board.scores.map((row) => ({
    displayName: displayNameFromLiveScore(row),
    isViewer: viewerAuthId != null && row.auth_id === viewerAuthId,
    correct: row.score,
  }));
}

function predictionRowsFromBoard(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
): PredictionRow[] {
  return board.scores.map((row) => {
    const predictions: Record<number, PredictionChoice | null> = {};
    for (const match of row.matches) {
      predictions[match.match_id] = match.prediction;
    }
    return {
      displayName: displayNameFromLiveScore(row),
      isViewer: viewerAuthId != null && row.auth_id === viewerAuthId,
      predictions,
    };
  });
}

function perfectSixFromBoard(
  board: LiveScoresBoard,
  viewerAuthId: string | null | undefined,
  slateSize: number,
): PerfectSixHolder[] {
  const need = slateSize > 0 ? slateSize : 6;
  return scoredFromBoard(board, viewerAuthId)
    .filter((row) => row.correct >= need)
    .map((row) => ({
      displayName: row.displayName,
      isViewer: row.isViewer,
    }));
}

/**
 * Player fixtures: Super Six slate with Home/Draw/Away, plus gameday live
 * behaviour (10m lock, collapse expands, score lines, shared livescores
 * poll via LiveScoresProvider, red date flash while in-play).
 */
export function MatchPlayerWidget() {
  const { status, isAuthenticated, token, hasRole, session } = useAuth();
  const { setPlayerPickingStatus, refreshGameMeta } = useRoundStatus();

  const [subrounds, setSubrounds] = useState<Subround[]>([]);
  const [matchesBySubround, setMatchesBySubround] = useState<
    Record<number, PlayerMatch[]>
  >({});
  const [selectedSubroundId, setSelectedSubroundId] = useState<number | null>(
    null,
  );
  const selectedSubroundIdRef = useRef<number | null>(null);

  const [draft, setDraft] = useState<Record<number, PredictionChoice | null>>(
    {},
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  /** Wall clock for lock / score-line / badge timing. */
  const [now, setNow] = useState(() => new Date());
  const [boardLive, setBoardLive] = useState(false);
  const [viewerCorrect, setViewerCorrect] = useState<number | null>(null);
  const [perfectSix, setPerfectSix] = useState<PerfectSixHolder[]>([]);
  /** Other players’ prediction maps from livescores; viewer overlaid from draft. */
  const [predictionRows, setPredictionRows] = useState<PredictionRow[]>([]);

  const { board: sharedBoard, fetchLiveScores } = useLiveScoresBoard(
    selectedSubroundId,
    { wakeOnNextKickoff: true },
  );

  const canPredict = isAuthenticated && hasRole('player');

  const selectedSubround = useMemo(
    () => subrounds.find((row) => row.id === selectedSubroundId) ?? null,
    [subrounds, selectedSubroundId],
  );

  const matches = useMemo(
    () =>
      selectedSubroundId != null
        ? (matchesBySubround[selectedSubroundId] ?? [])
        : [],
    [selectedSubroundId, matchesBySubround],
  );

  /** Shared team-name column so H/D/A badges line up across rows. */
  const teamColumnWidth = useMemo(
    () => teamColumnWidthForMatches(matches),
    [matches],
  );

  /** Lock every Home/Draw/Away once earliest kickoff in this subround hits cutoff. */
  const subroundLocked = useMemo(() => {
    const minKickoff = selectedSubround?.min_kickoff;
    if (minKickoff) {
      return isPastCutoff(minKickoff, now);
    }
    return false;
  }, [selectedSubround, now]);

  /** Header “n / X Selections” — optimistic from local draft for this slate. */
  const pickedCount = useMemo(() => {
    let count = 0;
    for (const match of matches) {
      if (draft[match.id] != null) {
        count += 1;
      }
    }
    return count;
  }, [matches, draft]);

  /** Prefer loaded fixtures; fall back to subround.match_count from list API. */
  const slateSize =
    matches.length > 0
      ? matches.length
      : (selectedSubround?.match_count ?? 0);

  const slateDifficulty = useMemo(
    () => aggregateSelectionDifficulty(matches.map((m) => m.difficulty)),
    [matches],
  );

  useEffect(() => {
    // Header n/X + pot banner: signed-in only. Persist across tabs (do not
    // clear on unmount) so Scores / Leaders / Profile keep the same strip.
    // Same builder as Scores / GamedayRoundStatusSync.
    if (!isAuthenticated) {
      setPlayerPickingStatus(null);
      return;
    }
    const phase = resolvePlayerRoundPhase({
      boardLive,
      subroundOver: selectedSubround?.is_over === true,
      kickoffLocked: subroundLocked,
    });
    const slateMatchIds = matches.map((m) => m.id);
    const splitPot =
      phase === 'picking' && perfectSix.length === 0
        ? splitPotLeadersFromMatchingPredictions(
            predictionRows.map((row) =>
              row.isViewer ? { ...row, predictions: draft } : row,
            ),
            slateMatchIds,
          )
        : null;
    setPlayerPickingStatus(
      buildPlayerRoundStatus({
        phase,
        slateSize,
        selectedCount: pickedCount,
        correctCount: viewerCorrect ?? 0,
        perfectSix,
        splitPot,
        // Banner pips = selected slate matches (always), not prediction gate.
        slateDifficulty,
      }),
    );
  }, [
    isAuthenticated,
    subroundLocked,
    boardLive,
    selectedSubround?.is_over,
    viewerCorrect,
    pickedCount,
    slateSize,
    slateDifficulty,
    perfectSix,
    predictionRows,
    draft,
    matches,
    setPlayerPickingStatus,
  ]);

  const applyLiveBoard = useCallback(
    (board: LiveScoresBoard) => {
      setBoardLive(board.live);
      const authId = session?.userId;
      // Prefer the board payload so this callback stays stable across scrub
      // (matches.length in deps was recreating loadCatalog → full-page reload).
      const boardSlateSize =
        board.matches.length > 0 ? board.matches.length : board.match_count;
      setPerfectSix(perfectSixFromBoard(board, authId, boardSlateSize));
      setPredictionRows(predictionRowsFromBoard(board, authId));
      if (authId) {
        const mine = board.scores.find((row) => row.auth_id === authId);
        setViewerCorrect(mine != null ? mine.score : null);
      } else {
        setViewerCorrect(null);
      }
      const targetId =
        board.subround?.id ?? selectedSubroundIdRef.current ?? null;
      if (targetId == null) {
        return;
      }
      setMatchesBySubround((prev) => ({
        ...prev,
        [targetId]: mergeBoardFixtures(prev[targetId] ?? [], board.matches),
      }));
      if (canPredict) {
        setDraft(draftFromBoard(board, authId));
      } else {
        setDraft({});
      }
    },
    [session?.userId, canPredict],
  );

  // Provider live poll / kickoff wake updates shared board — mirror into widget.
  useEffect(() => {
    if (sharedBoard) {
      applyLiveBoard(sharedBoard);
    }
  }, [sharedBoard, applyLiveBoard]);

  /** Shared `livescores?subroundId=` — joins strip / Scores in-flight cache. */
  const loadSlate = useCallback(
    async (
      subroundId: number | null,
      opts?: { quiet?: boolean; force?: boolean; signal?: AbortSignal },
    ) => {
      if (subroundId == null) {
        setBoardLive(false);
        setViewerCorrect(null);
        setPerfectSix([]);
        setDraft({});
        return;
      }
      if (!opts?.quiet) {
        setPredictionsLoading(true);
      }
      try {
        const board = await fetchLiveScores(subroundId, {
          force: Boolean(opts?.quiet) || Boolean(opts?.force),
          signal: opts?.signal,
        });
        applyLiveBoard(board);
      } catch (err) {
        if (
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return;
        }
        if (!opts?.quiet) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load selected matches.',
          );
        }
      } finally {
        if (!opts?.quiet) {
          setPredictionsLoading(false);
        }
      }
    },
    [applyLiveBoard, fetchLiveScores],
  );

  const loadCatalog = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      setRowError(null);
      try {
        if (mode === 'refresh') {
          await refreshGameMeta({ preserveChrome: true });
        }
        let listed: Subround[] = [];
        let noRound = false;
        try {
          listed = await listGameSubrounds();
        } catch (err) {
          if (isNoRoundInProgressError(err)) {
            noRound = true;
          } else {
            throw err;
          }
        }

        const navigable = listed
          .filter((row) => row.match_count > 0)
          .sort((a, b) => a.sequence - b.sequence);

        setSubrounds(navigable);

        if (noRound) {
          setMatchesBySubround({});
          setSelectedSubroundId(null);
          setDraft({});
          setBoardLive(false);
          setError(null);
          return;
        }

        const next = pickPlayerSubround(
          navigable,
          selectedSubroundIdRef.current,
        );
        setSelectedSubroundId(next?.id ?? null);
        await loadSlate(next?.id ?? null, {
          force: mode === 'refresh',
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not load selected matches.';
        setError(message);
        setSubrounds([]);
        setMatchesBySubround({});
        setSelectedSubroundId(null);
        setDraft({});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadSlate, refreshGameMeta],
  );

  useEffect(() => {
    selectedSubroundIdRef.current = selectedSubroundId;
  }, [selectedSubroundId]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    const ac = new AbortController();
    queueMicrotask(() => {
      if (!ac.signal.aborted) {
        void loadCatalog('initial');
      }
    });
    return () => {
      ac.abort();
    };
  }, [status, loadCatalog]);

  useEffect(() => {
    if (!subroundLocked) {
      return;
    }
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, [subroundLocked]);

  // Live poll + next-kickoff wake live in LiveScoresProvider.

  const onSelectSubround = useCallback(
    (next: Subround) => {
      setSelectedSubroundId(next.id);
      setError(null);
      setRowError(null);
      void loadSlate(next.id);
    },
    [loadSlate],
  );

  const onPredict = useCallback(
    async (match: PlayerMatch, choice: PredictionChoice) => {
      if (!token || !canPredict) {
        return;
      }
      if (draft[match.id] === choice) {
        return;
      }
      if (subroundLocked || isPostponedStatus(match.status)) {
        setRowError(
          isPostponedStatus(match.status)
            ? 'This match is postponed.'
            : 'Past cutoff for this subround\'s predictions.',
        );
        return;
      }
      setBusyId(match.id);
      setRowError(null);
      const previous = draft[match.id] ?? null;
      setDraft((prev) => ({ ...prev, [match.id]: choice }));
      try {
        const saved = await addPrediction(token, match.id, choice);
        setDraft((prev) => ({ ...prev, [match.id]: saved.prediction }));
      } catch (err) {
        setDraft((prev) => ({ ...prev, [match.id]: previous }));
        setRowError(
          err instanceof ApiError
            ? err.message
            : 'Could not save prediction.',
        );
      } finally {
        setBusyId(null);
      }
    },
    [token, canPredict, draft, subroundLocked],
  );

  if (status === 'loading' || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  const showSubroundScrubber =
    subrounds.length > 0 && selectedSubroundId != null;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void loadCatalog('refresh');
          }}
          tintColor={colors.textMuted}
        />
      }
    >
      <View style={styles.wrap}>
        <View style={styles.scrubberRow}>
          {showSubroundScrubber ? (
            <View style={styles.subroundCol}>
              <SubroundScrubber
                subrounds={subrounds}
                selectedId={selectedSubroundId}
                onChange={onSelectSubround}
                labelMode="sequence"
                style={styles.scrubberFlush}
              />
            </View>
          ) : null}
          <View
            style={showSubroundScrubber ? styles.dateCol : styles.dateColFull}
          >
            <KickoffDateDisplay
              kickoffIso={
                selectedSubround?.min_kickoff ?? matches[0]?.match_date
              }
              live={boardLive}
              style={styles.scrubberFlush}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rowError ? <Text style={styles.error}>{rowError}</Text> : null}

        {matches.length > 0 && isAuthenticated && !canPredict ? (
          <Text style={styles.lede}>
            Predictions need the superiorsix player role and an accepted roster
            invite.
          </Text>
        ) : null}

        {/* Like Scores: scrubber stays mounted; only the section below reloads. */}
        {predictionsLoading && matches.length === 0 ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : null}

        {matches.length > 0
          ? matches.map((match) => (
              <View key={match.id} style={scoreListChrome.sectionCard}>
                <MatchPredictRow
                  match={match}
                  prediction={draft[match.id] ?? null}
                  busy={busyId === match.id}
                  locked={subroundLocked}
                  canPredict={canPredict}
                  teamColumnWidth={teamColumnWidth}
                  now={now}
                  isFirst
                  onPredict={(choice) => {
                    void onPredict(match, choice);
                  }}
                />
              </View>
            ))
          : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 32,
  },
  wrap: {
    paddingHorizontal: '3%',
    // Header already owns the top gap (AppHeader paddingBottom 12).
    paddingTop: 0,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    // Same 12px rhythm as header → scrubber.
    marginBottom: 12,
  },
  /** Left subround scrubber — 40% of scrubber row. */
  subroundCol: {
    flexGrow: 2,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  /** Right date chip — 60% of scrubber row. */
  dateCol: {
    flexGrow: 3,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  dateColFull: {
    flex: 1,
    minWidth: 0,
  },
  scrubberFlush: {
    marginBottom: 0,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  error: {
    color: '#E8A0A0',
    fontSize: 13,
    marginBottom: 10,
  },
  listLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
