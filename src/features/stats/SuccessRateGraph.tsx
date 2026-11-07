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
  /** Day scores from the previous closed round (n−1) — dotted overlay. */
  previousScores?: AggregateScorePoint[];
  playerName: string;
  correct: number;
  matches: number;
  successRate: number;
  /** Percentage-point delta vs previous round (n−1). */
  rateDelta?: number | null;
};

type Point = { x: number; y: number; score: number; label: string };

const GRAPH_HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 16;
const PAD_TOP = 22;
const PAD_BOTTOM = 36;

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
 * Current-round correct-picks chart with a muted dotted last-round overlay.
 * Series share ordinal match-day slots (day 1…n) so rounds compare visually
 * even when calendar dates differ. Straight segments only.
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

  const chart = useMemo(() => {
    const current = sortScores(scores);
    const previous = sortScores(previousScores);
    const slotCount = Math.max(current.length, previous.length, 1);
    const plotW = plotWidth - PAD_LEFT - PAD_RIGHT;
    const plotH = GRAPH_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const rawMax = Math.max(
      0,
      ...current.map((p) => p.score),
      ...previous.map((p) => p.score),
    );
    const yMax = Math.max(2, rawMax + (rawMax > 0 ? 1 : 0));
    const baselineY = PAD_TOP + plotH;

    const xAt = (index: number) =>
      slotCount === 1
        ? PAD_LEFT + plotW / 2
        : PAD_LEFT + (plotW * index) / (slotCount - 1);

    const yAt = (score: number) =>
      PAD_TOP + plotH - (plotH * score) / yMax;

    const currentCoords: Point[] = current.map((point, index) => ({
      x: xAt(index),
      y: yAt(point.score),
      score: point.score,
      label: formatScoreDayLabel(point.date),
    }));

    const previousCoords: Point[] = previous.map((point, index) => ({
      x: xAt(index),
      y: yAt(point.score),
      score: point.score,
      label: formatScoreDayLabel(point.date),
    }));

    // Prefer current-round day labels; fill trailing slots from previous if needed.
    const xLabels: string[] = [];
    for (let i = 0; i < slotCount; i++) {
      if (current[i]) {
        xLabels.push(formatScoreDayLabel(current[i].date));
      } else if (previous[i]) {
        xLabels.push(formatScoreDayLabel(previous[i].date));
      } else {
        xLabels.push(`Day ${i + 1}`);
      }
    }

    const currentLine = straightLinePath(currentCoords);
    const previousLine = straightLinePath(previousCoords);
    const areaPath = areaUnderPath(currentLine, currentCoords, baselineY);
    const yTicks = Array.from({ length: yMax + 1 }, (_, i) => i);

    return {
      currentCoords,
      previousCoords,
      currentLine,
      previousLine,
      areaPath,
      yMax,
      plotH,
      baselineY,
      yTicks,
      xLabels,
      slotCount,
      xAt,
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
  const showAllXLabels = chart.slotCount <= 6;

  return (
    <View
      style={styles.card}
      accessibilityLabel={`${playerName} current round graph with last round overlay`}
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

      {chart.hasPrevious ? (
        <View style={styles.legend} accessibilityRole="text">
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendThis]} />
            <Text style={styles.legendLabel}>This round</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendLast]} />
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
            return (
              <Line
                key={`y-${tick}`}
                x1={PAD_LEFT}
                y1={y}
                x2={plotWidth - PAD_RIGHT}
                y2={y}
                stroke={colors.border}
                strokeWidth={tick === 0 ? 1.25 : StyleSheet.hairlineWidth * 2}
                strokeDasharray={tick === 0 ? undefined : '3 5'}
              />
            );
          })}

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

          {/* Last round (underneath current): muted dotted straight segments */}
          {chart.previousCoords.slice(0, -1).map((coord, index) => {
            const next = chart.previousCoords[index + 1];
            return (
              <Line
                key={`prev-seg-${coord.label}-${index}`}
                x1={coord.x}
                y1={coord.y}
                x2={next.x}
                y2={next.y}
                stroke={colors.textMuted}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="5 5"
                opacity={0.9}
              />
            );
          })}

          {chart.previousCoords.map((coord) => (
            <Circle
              key={`prev-dot-${coord.label}-${coord.x}`}
              cx={coord.x}
              cy={coord.y}
              r={3.5}
              fill={colors.menuBar}
              stroke={colors.textMuted}
              strokeWidth={1.75}
            />
          ))}

          {chart.currentLine ? (
            <Path
              d={chart.currentLine}
              stroke={colors.accentBright}
              strokeWidth={2.75}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {chart.currentCoords.map((coord) => (
            <Circle
              key={`halo-${coord.label}-${coord.x}`}
              cx={coord.x}
              cy={coord.y}
              r={7}
              fill={colors.accentBright}
              opacity={0.18}
            />
          ))}

          {chart.currentCoords.map((coord) => (
            <Circle
              key={`dot-${coord.label}-${coord.x}`}
              cx={coord.x}
              cy={coord.y}
              r={4.25}
              fill={colors.background}
              stroke={colors.accentBright}
              strokeWidth={2}
            />
          ))}

          {chart.currentCoords.map((coord) => (
            <SvgText
              key={`val-${coord.label}-${coord.x}`}
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
                key={`xl-${label}-${index}`}
                x={chart.xAt(index)}
                y={GRAPH_HEIGHT - 10}
                fill={colors.textMuted}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {label}
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
    marginBottom: 10,
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
  legendLast: {
    backgroundColor: colors.textMuted,
    opacity: 0.75,
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
