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
  type HistoricRound,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { colors } from '@/theme';

import { mergeCompareRows, type StatsCompareRow } from './compareStats';
import { PlayerStatsList } from './PlayerStatsList';
import { SuccessRateGraph } from './SuccessRateGraph';
import {
  StatsViewScrubber,
  type StatsViewMode,
} from './StatsViewScrubber';
import { WinnersList } from './WinnersList';

/**
 * Previous-only rows: same graphic shell data, no n vs n−1 deltas / overlay.
 * Used when there is no open round — closed n−1 day series is the solid line.
 */
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
 * Leaders (player) — Performance↔Winners scrubber.
 * Live: `/stats/aggregate?scope=current` (n) + `scope=previous` (n−1) + winners.
 * Empty payloads render blank (no mock fixtures).
 */
export function StatsPlayerWidget() {
  const { isAuthenticated, session } = useAuth();
  const viewerAuthId = session?.userId ?? null;

  const [viewMode, setViewMode] = useState<StatsViewMode>('stats');
  const [compareRows, setCompareRows] = useState<StatsCompareRow[]>([]);
  const [rounds, setRounds] = useState<HistoricRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) {
      setLoading(true);
    }
    setError(null);
    try {
      const [current, previous, winners] = await Promise.all([
        getStatsAggregate({ scope: 'current' }),
        getStatsAggregate({ scope: 'previous' }),
        getStatsWinners(),
      ]);
      if (current.stale_backend) {
        // BE image lacks scope=current — do not paint n−1 as this round.
        setCompareRows([]);
        setError(
          'Stats backend is missing scope=current (need baked-superiorsix #45 on master). Rebuild after merge.',
        );
      } else if (current.stats.length > 0) {
        setCompareRows(mergeCompareRows(current.stats, previous.stats));
      } else if (previous.stats.length > 0) {
        setCompareRows(rowsWithoutDelta(previous.stats));
      } else {
        setCompareRows([]);
      }
      setRounds(winners.rounds);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not load stats. Is baked-superiorsix up?';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
          {/* Logged-out: table only. Logged-in: graph when a rates row exists. */}
          {isAuthenticated && viewerRow ? (
            <SuccessRateGraph
              scores={viewerRow.scores}
              previousScores={viewerRow.previous_scores}
              playerName={viewerRow.name}
              correct={viewerRow.correct}
              matches={viewerRow.matches}
              successRate={viewerRow.success_rate}
              rateDelta={viewerRow.rate_delta}
            />
          ) : null}

          <View style={styles.section}>
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
  section: {
    gap: 8,
  },
});
