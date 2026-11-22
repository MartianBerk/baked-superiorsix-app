import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { CalendarIcon } from '@/components/icons/CalendarIcon';
import { formatKickoffDateLabels } from '@/features/matches/formatMatchDate';
import { colors } from '@/theme';

import { scoreListChrome } from './scoreListChrome';

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
 * Display-only earliest-kickoff label (`Sat 07 Nov 3pm`) — not navigable.
 * Surface matches match-list `scoreListChrome.sectionCard` (not scrubber /
 * Liquid Glass). Calendar icon + date; overflow drops weekday only.
 * When `live`, text pulses red like legacy Scores date picker.
 */
export function KickoffDateDisplay({ kickoffIso, live = false, style }: Props) {
  const pulse = useMemo(() => new Animated.Value(0), []);
  const [slotWidth, setSlotWidth] = useState(0);
  const [fullTextWidth, setFullTextWidth] = useState(0);
  const [dropWeekday, setDropWeekday] = useState(false);

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

  useEffect(() => {
    setSlotWidth(0);
    setFullTextWidth(0);
    setDropWeekday(false);
  }, [kickoffIso]);

  useEffect(() => {
    if (slotWidth <= 0 || fullTextWidth <= 0) {
      return;
    }
    setDropWeekday(fullTextWidth > slotWidth + 0.5);
  }, [slotWidth, fullTextWidth]);

  if (!kickoffIso) {
    return null;
  }

  const { full, withoutWeekday } = formatKickoffDateLabels(kickoffIso);
  const label = dropWeekday ? withoutWeekday : full;
  const color = live
    ? pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [LIVE_RED, LIVE_RED_DIM],
      })
    : colors.text;
  const iconColor = live ? LIVE_RED : colors.textMuted;

  const onSlotLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setSlotWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  };

  const onMeasureLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setFullTextWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  };

  return (
    <View
      style={[scoreListChrome.sectionCard, styles.row, style]}
      accessibilityRole="text"
      accessibilityLabel={`Earliest kickoff ${label}${live ? ', live' : ''}`}
    >
      <CalendarIcon size={16} color={iconColor} />
      <View style={styles.textSlot} onLayout={onSlotLayout}>
        {/* Unconstrained measure of the full label (native + web via onLayout). */}
        <Text
          style={[styles.label, styles.measure]}
          onLayout={onMeasureLayout}
          numberOfLines={1}
        >
          {full}
        </Text>
        <Animated.Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    // Same inset as `scoreListChrome.row` so the fill matches list cards.
    paddingHorizontal: 12,
    paddingVertical: 5,
    // Align beside SubroundScrubber; call sites often zero margin via scrubberFlush.
    minHeight: 7.5 * 2 + 33,
    marginBottom: 6,
  },
  textSlot: {
    flexShrink: 1,
    minWidth: 0,
    position: 'relative',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    // Do not constrain — natural width for overflow compare.
  },
});
