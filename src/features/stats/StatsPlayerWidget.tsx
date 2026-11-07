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

import { PlayerStatsList } from './PlayerStatsList';
import { SuccessRateGraph } from './SuccessRateGraph';
import {
  MOCK_STATS_VIEWER_AUTH_ID,
  withDevAggregateFallback,
  withDevWinnersFallback,
} from './mockStats';
import { WinnersScrubber } from './WinnersScrubber';

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

/**
 * Leaders (player) — previous-round success graph + roster rates + winners
 * archive scrubber. Rates come from SS-18; FE only renders.
 */
export function StatsPlayerWidget() {
  const { isAuthenticated, session } = useAuth();
  const viewerAuthId = session?.userId ?? null;

  const [stats, setStats] = useState<AggregatePlayerStats[]>([]);
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
        const [aggregateLive, winnersLive] = await Promise.all([
          getStatsAggregate(),
          getStatsWinners(),
        ]);
        const aggregate = withDevAggregateFallback(aggregateLive);
        const winners = withDevWinnersFallback(winnersLive);
        const mockInUse = aggregate.usedMock || winners.usedMock;
        const aligned = alignMockViewer(
          aggregate.data,
          viewerAuthId,
          mockInUse,
        );
        setStats(aligned.stats);
        setRounds(winners.data.rounds);
        setUsingMock(mockInUse);
      } catch (err) {
        if (__DEV__) {
          const aggregate = withDevAggregateFallback({ stats: [] });
          const winners = withDevWinnersFallback({ rounds: [] });
          if (aggregate.data.stats.length > 0 || winners.data.rounds.length > 0) {
            const aligned = alignMockViewer(
              aggregate.data,
              viewerAuthId,
              true,
            );
            setStats(aligned.stats);
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
    return stats.find((row) => row.playerid === viewerAuthId) ?? null;
  }, [stats, viewerAuthId]);

  const otherStats = useMemo(() => {
    if (!viewerAuthId) {
      return stats;
    }
    return stats.filter((row) => row.playerid !== viewerAuthId);
  }, [stats, viewerAuthId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ soft: true });
  }, [load]);

  if (loading && stats.length === 0 && rounds.length === 0) {
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

      {!isAuthenticated ? (
        <View style={styles.signInCard}>
          <Text style={styles.signInTitle}>Your previous-round graph</Text>
          <Text style={styles.signInBody}>
            Sign in on the Profile tab to see your correct-pick graph against the
            last closed round.
          </Text>
        </View>
      ) : viewerRow ? (
        <SuccessRateGraph
          scores={viewerRow.scores}
          playerName={viewerRow.name}
          correct={viewerRow.correct}
          matches={viewerRow.matches}
          successRate={viewerRow.success_rate}
        />
      ) : (
        <View style={styles.signInCard}>
          <Text style={styles.signInTitle}>No previous-round row for you</Text>
          <Text style={styles.signInBody}>
            Once a round closes and you have scored predictions, your graph
            appears here.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {isAuthenticated ? 'Other players · previous round' : 'Players · previous round'}
        </Text>
        <PlayerStatsList
          stats={isAuthenticated ? otherStats : stats}
          viewerAuthId={viewerAuthId}
        />
      </View>

      <View style={styles.section}>
        <WinnersScrubber rounds={rounds} />
      </View>
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
