import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

import { formatRateDelta } from './formatStats';

const ARROW_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>`;
const ARROW_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>`;

/** Slightly brighter than `resultLose` so small delta icons stay readable. */
const DELTA_DOWN = '#C04545';

type Props = {
  /** Percentage-point delta vs previous round (n − (n−1)). */
  delta: number | null;
  /** Compact list row vs larger graph summary. */
  size?: 'sm' | 'md';
};

/**
 * Inline n vs n−1 success-rate delta: green-up / red-down chevron + label
 * (`up 10%` / `down 5%`). Unchanged / missing → muted em dash.
 */
export function RateDeltaBadge({ delta, size = 'sm' }: Props) {
  if (delta == null || !Number.isFinite(delta)) {
    return (
      <Text
        style={[styles.unchanged, size === 'md' && styles.unchangedMd]}
        accessibilityLabel="No previous-round comparison"
      >
        —
      </Text>
    );
  }

  const rounded = Math.round(delta);
  if (rounded === 0) {
    return (
      <Text
        style={[styles.unchanged, size === 'md' && styles.unchangedMd]}
        accessibilityLabel="Unchanged vs previous round"
      >
        —
      </Text>
    );
  }

  const up = rounded > 0;
  const color = up ? colors.accentBright : DELTA_DOWN;
  const icon = (up ? ARROW_UP : ARROW_DOWN).replaceAll('CURRENT', color);
  const label = formatRateDelta(rounded);
  const iconSize = size === 'md' ? 16 : 13;

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${label} versus previous round`}
    >
      <SvgXml xml={icon} width={iconSize} height={iconSize} />
      <Text
        style={[
          styles.label,
          { color },
          size === 'md' && styles.labelMd,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelMd: {
    fontSize: 14,
  },
  unchanged: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  unchangedMd: {
    fontSize: 14,
  },
});
