import { useEffect, useMemo } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/theme';

import {
  formatKickoffLabel,
  formatScrubberDate,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { scrubberChrome } from '@/features/matches/scrubberChrome';

type Props = {
  /** ISO kickoff (usually subround `min_kickoff`). */
  kickoffIso: string | null | undefined;
  /** Flash red while Super Six matches are in play (not between fixtures). */
  live?: boolean;
  style?: StyleProp<ViewStyle>;
};

const LIVE_RED = '#910909';
const LIVE_RED_DIM = '#5a0707';

/**
 * Display-only earliest-kickoff banner (`Sat 07 Nov 3pm`) — not navigable.
 * When `live`, pulses red like legacy Scores date picker.
 */
export function KickoffDateDisplay({ kickoffIso, live = false, style }: Props) {
  const pulse = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!live) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [live, pulse]);

  if (!kickoffIso) {
    return null;
  }
  const label = `${formatScrubberDate(utcDayKey(kickoffIso))} ${formatKickoffLabel(kickoffIso)}`;
  const color = live
    ? pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [LIVE_RED, LIVE_RED_DIM],
      })
    : colors.text;

  return (
    <View
      style={[scrubberChrome.row, style]}
      accessibilityRole="text"
      accessibilityLabel={`Earliest kickoff ${label}${live ? ', live' : ''}`}
    >
      {/* Spacers match scrubber side slots so the label centres with the slate scrubber. */}
      <View style={scrubberChrome.sideHit}>
        <View style={scrubberChrome.sideSpacer} />
      </View>
      <Animated.Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Animated.Text>
      <View style={scrubberChrome.sideHit}>
        <View style={scrubberChrome.sideSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
