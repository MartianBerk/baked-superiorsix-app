import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  fetchMatchDetail,
  type MatchDetailPayload,
  type TeamResultCode,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { colors } from '@/theme';

type Props = {
  matchId: number;
  /** Optional footer (e.g. player Home/Draw/Away picker). */
  children?: ReactNode;
};

function ResultPips({ results }: { results: TeamResultCode[] | undefined }) {
  if (!results || results.length === 0) {
    return <Text style={styles.dash}>—</Text>;
  }
  return (
    <View style={styles.pips}>
      {results.map((result, index) => (
        <View
          key={`${result}-${index}`}
          style={[
            styles.pip,
            result === 'WIN' && styles.pipWin,
            result === 'DRAW' && styles.pipDraw,
            result === 'LOSE' && styles.pipLose,
          ]}
          accessibilityLabel={result}
        >
          <Text style={styles.pipLabel}>
            {result === 'WIN' ? 'W' : result === 'DRAW' ? 'D' : 'L'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DetailRow({
  title,
  home,
  away,
}: {
  title: string;
  home: ReactNode;
  away: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>{home}</View>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.side, styles.sideAway]}>{away}</View>
    </View>
  );
}

/**
 * Expand panel: league position, recent form, head-to-head.
 * Loads from `GET /game/matchdetail?id=`; stubs politely on failure.
 * Form / table maps are keyed by team_xref display names.
 */
export function MatchDetailPanel({ matchId, children }: Props) {
  const [detail, setDetail] = useState<MatchDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const payload = await fetchMatchDetail({ matchId });
          if (!cancelled) {
            setDetail(payload);
          }
        } catch (err) {
          if (!cancelled) {
            setDetail(null);
            setError(
              err instanceof ApiError
                ? err.message
                : 'Match detail unavailable.',
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        {children}
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.stub}>
          {error ?? 'Match detail unavailable.'}
        </Text>
        {children}
      </View>
    );
  }

  // Maps are keyed by xref; keep provider names available on the payload.
  const homeKey = detail.home_team_xref;
  const awayKey = detail.away_team_xref;
  const homePos = detail.league_position[homeKey] ?? '—';
  const awayPos = detail.league_position[awayKey] ?? '—';

  return (
    <View style={styles.wrap}>
      <DetailRow
        title="League Position"
        home={<Text style={styles.value}>{homePos}</Text>}
        away={<Text style={styles.value}>{awayPos}</Text>}
      />
      <DetailRow
        title="Performance"
        home={<ResultPips results={detail.team_performance[homeKey]} />}
        away={<ResultPips results={detail.team_performance[awayKey]} />}
      />
      <DetailRow
        title="Head To Head"
        home={<ResultPips results={detail.head_to_head[homeKey]} />}
        away={<ResultPips results={detail.head_to_head[awayKey]} />}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 2,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
    minWidth: 0,
  },
  sideAway: {
    alignItems: 'flex-end',
  },
  title: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
    minWidth: 88,
  },
  value: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  dash: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  stub: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  pips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipWin: {
    backgroundColor: colors.resultWin,
  },
  pipDraw: {
    backgroundColor: colors.menuActive,
  },
  pipLose: {
    backgroundColor: colors.resultLose,
  },
  pipLabel: {
    color: colors.text,
    fontSize: 8,
    fontWeight: '800',
  },
});
