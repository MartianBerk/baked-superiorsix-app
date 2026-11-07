import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getStatsAggregate,
  getStatsWinners,
  type AggregatePlayerStats,
  type AggregateStatsResponse,
  type HistoricRound,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { colors } from '@/theme';

import { mergeCompareRows, type StatsCompareRow } from './compareStats';
import { PlayerStatsList } from './PlayerStatsList';
import { SuccessRateGraph } from './SuccessRateGraph';
import {
  MOCK_STATS_VIEWER_AUTH_ID,
  withDevCurrentFallback,
  withDevPreviousFallback,
  withDevWinnersFallback,
} from './mockStats';
import {
  StatsViewScrubber,
  type StatsViewMode,
} from './StatsViewScrubber';
import { WinnersList } from './WinnersList';

/**
 * When TEMP mock data is in play, retarget the demo "you" row to the signed-in
 * auth_id so the graph + list highlight match the session.
 */
function alignMockViewer(
  payload: AggregateStatsResponse,
  viewerAuthId: string | null | undefined,
  usedMock: boolean,
): AggregateStatsResponse {
  if (!usedMock || !viewerAuthId) {
    return payload;
  }
  return {
    stats: payload.stats.map((row) =>
      row.playerid === MOCK_STATS_VIEWER_AUTH_ID
        ? { ...row, playerid: viewerAuthId }
        : row,
    ),
  };
}

function rowsWithoutDelta(previous: AggregatePlayerStats[]): StatsCompareRow[] {
  return previous
    .map((row) => ({
      playerid: row.playerid,
      name: row.name,
      correct: row.correct,
      matches: row.matches,
      success_rate: row.success_rate,
      previous_success_rate: null,
      rate_delta: null,
      scores: row.scores,
      previous_scores: [],
    }))
    .sort(
      (a, b) =>
        b.success_rate - a.success_rate ||
        a.name.localeCompare(b.name) ||
        a.playerid.localeCompare(b.playerid),
    );
}

/**
 * Leaders (player) — Stats↔Winners scrubber; n vs n−1 rate deltas; winners archive.
 * Previous rates from SS-18 `/stats/aggregate`; current (n) from TEMP mock until a
 * current-round aggregate ships (FE still only renders precomputed rates).
 */
export function StatsPlayerWidget() {
  const { isAuthenticated, session } = useAuth();
  const viewerAuthId = session?.userId ?? null;

  const [viewMode, setViewMode] = useState<StatsViewMode>('stats');
  const [compareRows, setCompareRows] = useState<StatsCompareRow[]>([]);
  const [rounds, setRounds] = useState<HistoricRound[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) {
        setLoading(true);
      }
      setError(null);
      try {
        const [previousLive, winnersLive] = await Promise.all([
          getStatsAggregate(),
          getStatsWinners(),
        ]);
        // SS-18 exposes n−1 only. TEMP mock supplies current (n) when the
        // previous payload is also mocked — never mix live n−1 with mock n.
        const previous = withDevPreviousFallback(previousLive);
        const current = previous.usedMock
          ? withDevCurrentFallback({ stats: [] })
          : { data: { stats: [] as AggregatePlayerStats[] }, usedMock: false };
        const winners = withDevWinnersFallback(winnersLive);
        const mockInUse =
          previous.usedMock || current.usedMock || winners.usedMock;

        const alignedCurrent = alignMockViewer(
          current.data,
          viewerAuthId,
          current.usedMock,
        );
        const alignedPrevious = alignMockViewer(
          previous.data,
          viewerAuthId,
          previous.usedMock,
        );

        let rows: StatsCompareRow[];
        if (alignedCurrent.stats.length > 0) {
          rows = mergeCompareRows(alignedCurrent.stats, alignedPrevious.stats);
        } else if (alignedPrevious.stats.length > 0) {
          rows = rowsWithoutDelta(alignedPrevious.stats);
        } else {
          rows = [];
        }

        setCompareRows(rows);
        setRounds(winners.data.rounds);
        setUsingMock(mockInUse);
      } catch (err) {
        if (__DEV__) {
          const previous = withDevPreviousFallback({ stats: [] });
          const current = withDevCurrentFallback({ stats: [] });
          const winners = withDevWinnersFallback({ rounds: [] });
          if (
            current.data.stats.length > 0 ||
            previous.data.stats.length > 0 ||
            winners.data.rounds.length > 0
          ) {
            const alignedCurrent = alignMockViewer(
              current.data,
              viewerAuthId,
              true,
            );
            const alignedPrevious = alignMockViewer(
              previous.data,
              viewerAuthId,
              true,
            );
            setCompareRows(
              mergeCompareRows(alignedCurrent.stats, alignedPrevious.stats),
            );
            setRounds(winners.data.rounds);
            setUsingMock(true);
            setError(null);
            return;
          }
        }
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not load stats. Is baked-superiorsix up?';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [viewerAuthId],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void load();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const viewerRow = useMemo(() => {
    if (!viewerAuthId) {
      return null;
    }
    return compareRows.find((row) => row.playerid === viewerAuthId) ?? null;
  }, [compareRows, viewerAuthId]);

  const listRows = useMemo(() => {
    if (!viewerAuthId) {
      return compareRows;
    }
    return compareRows.filter((row) => row.playerid !== viewerAuthId);
  }, [compareRows, viewerAuthId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ soft: true });
  }, [load]);

  if (loading && compareRows.length === 0 && rounds.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accentBright} />
        <Text style={styles.loadingLabel}>Loading stats…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accentBright}
        />
      }
    >
      <StatsViewScrubber mode={viewMode} onChange={setViewMode} />

      {usingMock ? (
        <View style={styles.mockBanner} accessibilityRole="text">
          <Text style={styles.mockBannerText}>
            TEMP __DEV__ mock stats — remove{' '}
            <Text style={styles.mockCode}>src/features/stats/mockStats.ts</Text>{' '}
            when the DB has closed rounds.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading stats"
            onPress={() => void load()}
            style={({ pressed }) => [
              styles.retry,
              pressed && styles.retryPressed,
            ]}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {viewMode === 'stats' ? (
        <>
          {!isAuthenticated ? (
            <View style={styles.signInCard}>
              <Text style={styles.signInTitle}>Your round graph</Text>
              <Text style={styles.signInBody}>
                Sign in on the Profile tab to see your correct-pick graph and
                n vs n−1 rate change.
              </Text>
            </View>
          ) : viewerRow ? (
            <SuccessRateGraph
              scores={viewerRow.scores}
              previousScores={viewerRow.previous_scores}
              playerName={viewerRow.name}
              correct={viewerRow.correct}
              matches={viewerRow.matches}
              successRate={viewerRow.success_rate}
              rateDelta={viewerRow.rate_delta}
            />
          ) : (
            <View style={styles.signInCard}>
              <Text style={styles.signInTitle}>No stats row for you yet</Text>
              <Text style={styles.signInBody}>
                Once this round has scored predictions, your graph and % vs the
                previous round appear here.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {isAuthenticated
                ? 'Other players · vs previous round'
                : 'Players · vs previous round'}
            </Text>
            <PlayerStatsList
              stats={isAuthenticated ? listRows : compareRows}
              viewerAuthId={viewerAuthId}
            />
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <WinnersList rounds={rounds} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: '3%',
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 10,
  },
  loadingLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  mockBanner: {
    backgroundColor: colors.menuActive,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.amber,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mockBannerText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  mockCode: {
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.resultLose,
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: colors.menuActive,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  signInCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  signInTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  signInBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
});
