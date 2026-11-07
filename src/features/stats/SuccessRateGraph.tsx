import { useEffect, useMemo, useState } from 'react';
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

import { RateDeltaBadge } from './RateDeltaBadge';

type Props = {
  /** Day scores for the logged-in player in the current round (n). */
  scores: AggregateScorePoint[];
  /** Day scores from the previous closed round (n−1) — dotted overlay. */
  previousScores?: AggregateScorePoint[];
  playerName: string;
  correct: number;
  matches: number;
  successRate: number;
  /** Percentage-point delta vs previous round (n−1). */
  rateDelta?: number | null;
};

type Point = { x: number; y: number; score: number; slate: number };

/** Lighter green in the same family as `accentBright` — last-round series. */
const LAST_ROUND_GREEN = '#6ECF82';

const GRAPH_HEIGHT = 228;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PAD_TOP = 18;
const PAD_BOTTOM = 44;

/** Full Super Six pick range — never rescale to the player's local max. */
const Y_MAX = 6;

/** Tip flash opacity range (plain numbers — avoids Animated→SVG bool toast on web). */
const TIP_OPACITY_MIN = 0.25;
const TIP_OPACITY_MAX = 1;

const DOT_PREV = 2.4;
const DOT_CURRENT = 2.6;
const DOT_TIP = 5;
const DOT_TIP_HALO = 9;
const PREV_LINE_OPACITY = 0.42;

/** Straight polyline through points (no curves). */
function straightLinePath(coords: Point[]): string {
  if (coords.length === 0) {
    return '';
  }
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    d += ` L ${coords[i].x} ${coords[i].y}`;
  }
  return d;
}

function areaUnderPath(
  linePath: string,
  coords: Point[],
  baselineY: number,
): string {
  if (!linePath || coords.length === 0) {
    return '';
  }
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function sortScores(scores: AggregateScorePoint[]): AggregateScorePoint[] {
  return [...scores].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * X extent: previous round length is the default end; current progresses into
 * that span. If current has more slates, extend past previous.
 */
function resolveSlotCount(currentLen: number, previousLen: number): number {
  if (previousLen > 0) {
    return Math.max(previousLen, currentLen, 1);
  }
  return Math.max(currentLen, 1);
}

/**
 * Current-round correct-picks chart with a lighter-green dotted last-round overlay.
 * X-axis is slate/subround number (`#1`…). Straight segments only.
 */
export function SuccessRateGraph({
  scores,
  previousScores = [],
  playerName,
  correct,
  matches,
  successRate,
  rateDelta = null,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(Math.max(windowWidth - 48, 280), 520);
  const plotWidth = width - 8;
  const [tipOpacity, setTipOpacity] = useState(TIP_OPACITY_MAX);

  useEffect(() => {
    let direction = -1;
    const id = setInterval(() => {
      setTipOpacity((prev) => {
        const next = prev + direction * 0.08;
        if (next <= TIP_OPACITY_MIN) {
          direction = 1;
          return TIP_OPACITY_MIN;
        }
        if (next >= TIP_OPACITY_MAX) {
          direction = -1;
          return TIP_OPACITY_MAX;
        }
        return next;
      });
    }, 70);
    return () => {
      clearInterval(id);
    };
  }, []);

  const chart = useMemo(() => {
    const current = sortScores(scores);
    const previous = sortScores(previousScores);
    const slotCount = resolveSlotCount(current.length, previous.length);
    const plotW = plotWidth - PAD_LEFT - PAD_RIGHT;
    const plotH = GRAPH_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const yMax = Y_MAX;
    const baselineY = PAD_TOP + plotH;

    const xAt = (index: number) =>
      slotCount === 1
        ? PAD_LEFT + plotW / 2
        : PAD_LEFT + (plotW * index) / (slotCount - 1);

    const yAt = (score: number) =>
      PAD_TOP + plotH - (plotH * Math.min(score, yMax)) / yMax;

    const currentCoords: Point[] = current.map((point, index) => ({
      x: xAt(index),
      y: yAt(point.score),
      score: point.score,
      slate: index + 1,
    }));

    const previousCoords: Point[] = previous.map((point, index) => ({
      x: xAt(index),
      y: yAt(point.score),
      score: point.score,
      slate: index + 1,
    }));

    const xLabels = Array.from({ length: slotCount }, (_, i) => `#${i + 1}`);

    const currentLine = straightLinePath(currentCoords);
    const areaPath = areaUnderPath(currentLine, currentCoords, baselineY);
    const yTicks = Array.from({ length: yMax + 1 }, (_, i) => i);
    const endDot =
      currentCoords.length > 0
        ? currentCoords[currentCoords.length - 1]
        : null;

    return {
      currentCoords,
      previousCoords,
      currentLine,
      areaPath,
      yMax,
      plotH,
      baselineY,
      yTicks,
      xLabels,
      slotCount,
      xAt,
      endDot,
      hasPrevious: previousCoords.length > 0,
    };
  }, [scores, previousScores, plotWidth]);

  if (scores.length === 0 && previousScores.length === 0) {
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
  const showAllXLabels = chart.slotCount <= 8;

  return (
    <View
      style={styles.card}
      accessibilityLabel={`${playerName} current round graph with last round overlay`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>This round</Text>
        <View style={styles.summary}>
          <Text style={styles.rate}>{rateLabel}</Text>
          <RateDeltaBadge delta={rateDelta} size="md" />
          <Text style={styles.correct}>
            {correct}/{matches} correct
          </Text>
        </View>
      </View>

      {chart.hasPrevious ? (
        <View style={styles.legend} accessibilityRole="text">
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendThis]} />
            <Text style={styles.legendLabel}>This round</Text>
          </View>
          <View style={styles.legendItem}>
            <Svg width={20} height={6}>
              <Line
                x1={0}
                y1={3}
                x2={20}
                y2={3}
                stroke={LAST_ROUND_GREEN}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="3.5 3.5"
                opacity={PREV_LINE_OPACITY + 0.15}
              />
            </Svg>
            <Text style={styles.legendLabel}>Last round</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.chartFrame}>
        <Svg width={plotWidth} height={GRAPH_HEIGHT}>
          <Defs>
            <LinearGradient id="statsAreaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={colors.accentBright}
                stopOpacity="0.28"
              />
              <Stop
                offset="0.55"
                stopColor={colors.accent}
                stopOpacity="0.1"
              />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          <Path
            d={`M ${PAD_LEFT} ${PAD_TOP} H ${plotWidth - PAD_RIGHT} V ${chart.baselineY} H ${PAD_LEFT} Z`}
            fill={colors.background}
            opacity={0.55}
          />

          {chart.yTicks.map((tick) => {
            const y =
              PAD_TOP + chart.plotH - (chart.plotH * tick) / chart.yMax;
            if (tick === 0) {
              return (
                <Line
                  key={`y-${tick}`}
                  x1={PAD_LEFT}
                  y1={y}
                  x2={plotWidth - PAD_RIGHT}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1.25}
                />
              );
            }
            return (
              <Line
                key={`y-${tick}`}
                x1={PAD_LEFT}
                y1={y}
                x2={plotWidth - PAD_RIGHT}
                y2={y}
                stroke={colors.border}
                strokeWidth={StyleSheet.hairlineWidth * 2}
                strokeDasharray="3 5"
              />
            );
          })}

          {chart.yTicks.map((tick) => {
            const y =
              PAD_TOP + chart.plotH - (chart.plotH * tick) / chart.yMax;
            return (
              <SvgText
                key={`yl-${tick}`}
                x={PAD_LEFT - 8}
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

          {/* Y-axis title */}
          <SvgText
            x={11}
            y={PAD_TOP + chart.plotH / 2}
            fill={colors.textMuted}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            transform={`rotate(-90, 11, ${PAD_TOP + chart.plotH / 2})`}
          >
            Picks
          </SvgText>

          {chart.areaPath ? (
            <Path d={chart.areaPath} fill="url(#statsAreaFill)" />
          ) : null}

          {/* Last round: lighter green, dotted, solid (non-flashing) dots */}
          {chart.previousCoords.slice(0, -1).map((coord, index) => {
            const next = chart.previousCoords[index + 1];
            return (
              <Line
                key={`prev-seg-${coord.slate}`}
                x1={coord.x}
                y1={coord.y}
                x2={next.x}
                y2={next.y}
                stroke={LAST_ROUND_GREEN}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeDasharray="5 5"
                opacity={PREV_LINE_OPACITY}
              />
            );
          })}

          {chart.previousCoords.map((coord) => (
            <Circle
              key={`prev-dot-${coord.slate}`}
              cx={coord.x}
              cy={coord.y}
              r={DOT_PREV}
              fill={LAST_ROUND_GREEN}
              opacity={PREV_LINE_OPACITY + 0.2}
            />
          ))}

          {chart.currentLine ? (
            <Path
              d={chart.currentLine}
              stroke={colors.accentBright}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Current: small solid dots for completed slates except the live tip */}
          {chart.currentCoords.slice(0, -1).map((coord) => (
            <Circle
              key={`dot-${coord.slate}`}
              cx={coord.x}
              cy={coord.y}
              r={DOT_CURRENT}
              fill={colors.accentBright}
            />
          ))}

          {/* Current tip: larger flashing end dot */}
          {chart.endDot ? (
            <>
              <Circle
                cx={chart.endDot.x}
                cy={chart.endDot.y}
                r={DOT_TIP_HALO}
                fill={colors.accentBright}
                opacity={0.12 + tipOpacity * 0.28}
              />
              <Circle
                cx={chart.endDot.x}
                cy={chart.endDot.y}
                r={DOT_TIP}
                fill={colors.accentBright}
                opacity={tipOpacity}
              />
            </>
          ) : null}

          {chart.xLabels.map((label, index) => {
            const show =
              showAllXLabels ||
              index === 0 ||
              index === chart.xLabels.length - 1 ||
              index % 2 === 0;
            if (!show) {
              return null;
            }
            return (
              <SvgText
                key={`xl-${label}`}
                x={chart.xAt(index)}
                y={GRAPH_HEIGHT - 18}
                fill={colors.textMuted}
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}

          {/* X-axis title */}
          <SvgText
            x={(PAD_LEFT + plotWidth - PAD_RIGHT) / 2}
            y={GRAPH_HEIGHT - 4}
            fill={colors.textMuted}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
          >
            Round
          </SvgText>
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
    marginBottom: 10,
    gap: 12,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
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
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 18,
    height: 3,
    borderRadius: 1,
  },
  legendThis: {
    backgroundColor: colors.accentBright,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: 11,
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
