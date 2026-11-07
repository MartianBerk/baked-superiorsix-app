import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { AggregateScorePoint } from '@/api/superiorsix';
import { colors } from '@/theme';

import { formatScoreDayLabel } from './formatStats';
import { RateDeltaBadge } from './RateDeltaBadge';

type Props = {
  /** Day scores for the logged-in player in the current round (n). */
  scores: AggregateScorePoint[];
  playerName: string;
  correct: number;
  matches: number;
  successRate: number;
  /** Percentage-point delta vs previous round (n−1). */
  rateDelta?: number | null;
};

type Point = { x: number; y: number; score: number; date: string };

const GRAPH_HEIGHT = 212;
const PAD_LEFT = 34;
const PAD_RIGHT = 16;
const PAD_TOP = 22;
const PAD_BOTTOM = 34;

/** Smooth cubic segments through day points (monotone-friendly mid controls). */
function smoothLinePath(coords: Point[]): string {
  if (coords.length === 0) {
    return '';
  }
  if (coords.length === 1) {
    return `M ${coords[0].x} ${coords[0].y}`;
  }
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const cpx = (a.x + b.x) / 2;
    d += ` C ${cpx} ${a.y}, ${cpx} ${b.y}, ${b.x} ${b.y}`;
  }
  return d;
}

function areaUnderPath(linePath: string, coords: Point[], baselineY: number): string {
  if (!linePath || coords.length === 0) {
    return '';
  }
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

/**
 * Current-round correct-picks chart for the signed-in player.
 * Dark surface + green accent line/area (react-native-svg) — no legacy green wash.
 */
export function SuccessRateGraph({
  scores,
  playerName,
  correct,
  matches,
  successRate,
  rateDelta = null,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(Math.max(windowWidth - 48, 280), 520);

  const chart = useMemo(() => {
    const points = [...scores].sort((a, b) => a.date.localeCompare(b.date));
    const plotW = width - PAD_LEFT - PAD_RIGHT;
    const plotH = GRAPH_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const rawMax = Math.max(0, ...points.map((p) => p.score));
    // Headroom so markers/labels don’t kiss the top edge.
    const yMax = Math.max(2, rawMax + (rawMax > 0 ? 1 : 0));
    const baselineY = PAD_TOP + plotH;

    const coords: Point[] = points.map((point, index) => {
      const x =
        points.length === 1
          ? PAD_LEFT + plotW / 2
          : PAD_LEFT + (plotW * index) / (points.length - 1);
      const y = PAD_TOP + plotH - (plotH * point.score) / yMax;
      return { x, y, score: point.score, date: point.date };
    });

    const linePath = smoothLinePath(coords);
    const areaPath = areaUnderPath(linePath, coords, baselineY);
    const yTicks = Array.from({ length: yMax + 1 }, (_, i) => i);

    return { coords, linePath, areaPath, yMax, plotH, baselineY, yTicks };
  }, [scores, width]);

  if (scores.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No scores yet</Text>
        <Text style={styles.emptyBody}>
          Your correct-pick graph appears once this round has scored match days.
        </Text>
      </View>
    );
  }

  const rateLabel = `${Math.round(successRate)}%`;
  const showAllXLabels = chart.coords.length <= 6;

  return (
    <View
      style={styles.card}
      accessibilityLabel={`${playerName} current round graph`}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>This round</Text>
          <Text style={styles.title} numberOfLines={1}>
            {playerName}
          </Text>
          <Text style={styles.subtitle}>Correct picks by match day</Text>
        </View>
        <View style={styles.summary}>
          <Text style={styles.rate}>{rateLabel}</Text>
          <RateDeltaBadge delta={rateDelta} size="md" />
          <Text style={styles.correct}>
            {correct}/{matches} correct
          </Text>
        </View>
      </View>

      <View style={styles.chartFrame}>
        <Svg width={width - 8} height={GRAPH_HEIGHT}>
          <Defs>
            <LinearGradient id="statsAreaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={colors.accentBright}
                stopOpacity="0.32"
              />
              <Stop
                offset="0.55"
                stopColor={colors.accent}
                stopOpacity="0.12"
              />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Plot floor */}
          <Path
            d={`M ${PAD_LEFT} ${PAD_TOP} H ${width - 8 - PAD_RIGHT} V ${chart.baselineY} H ${PAD_LEFT} Z`}
            fill={colors.background}
            opacity={0.55}
          />

          {/* Horizontal guides only */}
          {chart.yTicks.map((tick) => {
            const y =
              PAD_TOP + chart.plotH - (chart.plotH * tick) / chart.yMax;
            return (
              <Line
                key={`y-${tick}`}
                x1={PAD_LEFT}
                y1={y}
                x2={width - 8 - PAD_RIGHT}
                y2={y}
                stroke={colors.border}
                strokeWidth={tick === 0 ? 1.25 : StyleSheet.hairlineWidth * 2}
                strokeDasharray={tick === 0 ? undefined : '3 5'}
              />
            );
          })}

          {/* Y labels */}
          {chart.yTicks.map((tick) => {
            const y =
              PAD_TOP + chart.plotH - (chart.plotH * tick) / chart.yMax;
            return (
              <SvgText
                key={`yl-${tick}`}
                x={PAD_LEFT - 10}
                y={y + 3.5}
                fill={colors.textMuted}
                fontSize="10"
                fontWeight="600"
                textAnchor="end"
              >
                {tick}
              </SvgText>
            );
          })}

          {chart.areaPath ? (
            <Path d={chart.areaPath} fill="url(#statsAreaFill)" />
          ) : null}

          {chart.linePath ? (
            <Path
              d={chart.linePath}
              stroke={colors.accentBright}
              strokeWidth={2.75}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {chart.coords.map((coord) => (
            <Circle
              key={`halo-${coord.date}`}
              cx={coord.x}
              cy={coord.y}
              r={7}
              fill={colors.accentBright}
              opacity={0.18}
            />
          ))}

          {chart.coords.map((coord) => (
            <Circle
              key={`dot-${coord.date}`}
              cx={coord.x}
              cy={coord.y}
              r={4.25}
              fill={colors.background}
              stroke={colors.accentBright}
              strokeWidth={2}
            />
          ))}

          {chart.coords.map((coord) => (
            <SvgText
              key={`val-${coord.date}`}
              x={coord.x}
              y={coord.y - 11}
              fill={colors.text}
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              {coord.score}
            </SvgText>
          ))}

          {chart.coords.map((coord, index) => {
            const show =
              showAllXLabels ||
              index === 0 ||
              index === chart.coords.length - 1 ||
              index % 2 === 0;
            if (!show) {
              return null;
            }
            return (
              <SvgText
                key={`xl-${coord.date}`}
                x={coord.x}
                y={GRAPH_HEIGHT - 10}
                fill={colors.textMuted}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {formatScoreDayLabel(coord.date)}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    alignItems: 'flex-end',
    gap: 3,
  },
  rate: {
    color: colors.accentBright,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  correct: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chartFrame: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.menuBar,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
