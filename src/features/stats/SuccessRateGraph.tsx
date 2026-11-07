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

type Props = {
  /** Day scores for the logged-in player within the previous closed round. */
  scores: AggregateScorePoint[];
  playerName: string;
  correct: number;
  matches: number;
  successRate: number;
};

const GRAPH_HEIGHT = 200;
const PAD_LEFT = 28;
const PAD_RIGHT = 14;
const PAD_TOP = 18;
const PAD_BOTTOM = 28;

/**
 * Polished day-by-day correct-picks graph for the signed-in player.
 * Visual language loosely mirrors legacy supersixapp LineGraph (green wash,
 * light stroke) while using Superior Six theme tokens.
 */
export function SuccessRateGraph({
  scores,
  playerName,
  correct,
  matches,
  successRate,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(Math.max(windowWidth - 48, 280), 520);

  const chart = useMemo(() => {
    const points = [...scores].sort((a, b) => a.date.localeCompare(b.date));
    const plotW = width - PAD_LEFT - PAD_RIGHT;
    const plotH = GRAPH_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const yMax = Math.max(1, ...points.map((p) => p.score), 2);

    const coords = points.map((point, index) => {
      const x =
        points.length === 1
          ? PAD_LEFT + plotW / 2
          : PAD_LEFT + (plotW * index) / (points.length - 1);
      const y = PAD_TOP + plotH - (plotH * point.score) / yMax;
      return { x, y, point };
    });

    let linePath = '';
    coords.forEach((coord, index) => {
      linePath += index === 0 ? `M ${coord.x} ${coord.y}` : ` L ${coord.x} ${coord.y}`;
    });

    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x} ${PAD_TOP + plotH} L ${coords[0].x} ${PAD_TOP + plotH} Z`
        : '';

    const yTicks = Array.from({ length: yMax + 1 }, (_, i) => i);

    return { coords, linePath, areaPath, yMax, plotH, yTicks, points };
  }, [scores, width]);

  if (scores.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No previous-round scores yet</Text>
        <Text style={styles.emptyBody}>
          Your correct-pick graph appears after the first closed round.
        </Text>
      </View>
    );
  }

  const rateLabel = `${Math.round(successRate)}%`;

  return (
    <View style={styles.card} accessibilityLabel={`${playerName} previous round graph`}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Previous round</Text>
          <Text style={styles.title} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        <View style={styles.summary}>
          <Text style={styles.rate}>{rateLabel}</Text>
          <Text style={styles.correct}>
            {correct}/{matches}
          </Text>
        </View>
      </View>

      <Svg width={width} height={GRAPH_HEIGHT}>
        <Defs>
          <LinearGradient id="statsGraphWash" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.95" />
            <Stop offset="1" stopColor={colors.accentBright} stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="statsAreaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.text} stopOpacity="0.28" />
            <Stop offset="1" stopColor={colors.text} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        <Path
          d={`M 0 0 H ${width} V ${GRAPH_HEIGHT} H 0 Z`}
          fill="url(#statsGraphWash)"
        />

        {chart.yTicks.map((tick) => {
          const y =
            PAD_TOP + chart.plotH - (chart.plotH * tick) / chart.yMax;
          return (
            <Line
              key={`y-${tick}`}
              x1={PAD_LEFT}
              y1={y}
              x2={width - PAD_RIGHT}
              y2={y}
              stroke={colors.text}
              strokeOpacity={0.18}
              strokeWidth={1}
            />
          );
        })}

        {chart.coords.map((coord) => (
          <Line
            key={`x-${coord.point.date}`}
            x1={coord.x}
            y1={PAD_TOP}
            x2={coord.x}
            y2={PAD_TOP + chart.plotH}
            stroke={colors.text}
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}

        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP + chart.plotH}
          x2={width - PAD_RIGHT}
          y2={PAD_TOP + chart.plotH}
          stroke={colors.background}
          strokeWidth={1.5}
        />
        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={PAD_TOP + chart.plotH}
          stroke={colors.background}
          strokeWidth={1.5}
        />

        {chart.yTicks.map((tick) => {
          const y =
            PAD_TOP + chart.plotH - (chart.plotH * tick) / chart.yMax;
          return (
            <SvgText
              key={`yl-${tick}`}
              x={PAD_LEFT - 8}
              y={y + 3}
              fill={colors.text}
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
            stroke={colors.text}
            strokeWidth={2.25}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {chart.coords.map((coord) => (
          <Circle
            key={`dot-${coord.point.date}`}
            cx={coord.x}
            cy={coord.y}
            r={4.5}
            fill={colors.text}
            stroke={colors.accent}
            strokeWidth={1.5}
          />
        ))}

        {chart.coords.map((coord, index) => {
          const show =
            chart.coords.length <= 5 ||
            index === 0 ||
            index === chart.coords.length - 1 ||
            index % 2 === 0;
          if (!show) {
            return null;
          }
          return (
            <SvgText
              key={`xl-${coord.point.date}`}
              x={coord.x}
              y={GRAPH_HEIGHT - 8}
              fill={colors.text}
              fontSize="9"
              fontWeight="600"
              textAnchor="middle"
              opacity={0.9}
            >
              {formatScoreDayLabel(coord.point.date)}
            </SvgText>
          );
        })}
      </Svg>

      <Text style={styles.caption}>Correct picks by match day</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingTop: 12,
    paddingHorizontal: 10,
    paddingBottom: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
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
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summary: {
    alignItems: 'flex-end',
  },
  rate: {
    color: colors.accentBright,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  correct: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  caption: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 6,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
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
