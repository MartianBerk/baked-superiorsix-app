import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { Subround } from '@/api/superiorsix';
import { ChevronIcon } from '@/components/icons/ChevronIcon';
import { colors } from '@/theme';

import { SCRUBBER_CHEVRON_SIZE, scrubberChrome } from './scrubberChrome';

type Props = {
  subrounds: Subround[];
  selectedId: number | null;
  onChange: (subround: Subround) => void;
  /** Optional trailing control (e.g. admin “New slate”). */
  trailing?: ReactNode;
  /** Outer wrap style (e.g. clear margin when nested in a side-by-side row). */
  style?: StyleProp<ViewStyle>;
};

/** Centre label: sequence as `# n`. */
export function subroundLabel(subround: Subround): string {
  return `# ${subround.sequence}`;
}

/**
 * Left/right subround scrubber (shared chrome with date scrubber).
 * Highlights the open-for-editing slate.
 */
export function SubroundScrubber({
  subrounds,
  selectedId,
  onChange,
  trailing,
  style,
}: Props) {
  if (subrounds.length === 0 || selectedId == null) {
    return null;
  }

  const index = subrounds.findIndex((row) => row.id === selectedId);
  const selected = index >= 0 ? subrounds[index] : null;
  if (!selected) {
    return null;
  }

  const canLeft = index > 0;
  const canRight = index >= 0 && index < subrounds.length - 1;
  const label = subroundLabel(selected);

  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          scrubberChrome.row,
          styles.rowTight,
          selected.is_open_for_editing && styles.rowEditing,
        ]}
        accessibilityRole="adjustable"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous subround"
          disabled={!canLeft}
          onPress={() => {
            if (canLeft) {
              onChange(subrounds[index - 1]);
            }
          }}
          style={({ pressed }) => [
            scrubberChrome.chevronHit,
            !canLeft && scrubberChrome.chevronDisabled,
            pressed && canLeft && scrubberChrome.pressed,
          ]}
        >
          {canLeft ? (
            <ChevronIcon direction="left" size={SCRUBBER_CHEVRON_SIZE} />
          ) : (
            <View style={scrubberChrome.chevronSpacer} />
          )}
        </Pressable>

        <Text
          style={[
            styles.label,
            selected.is_open_for_editing && styles.labelEditing,
          ]}
          accessibilityLabel={`Subround ${selected.sequence}`}
          numberOfLines={1}
        >
          {label}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next subround"
          disabled={!canRight}
          onPress={() => {
            if (canRight) {
              onChange(subrounds[index + 1]);
            }
          }}
          style={({ pressed }) => [
            scrubberChrome.chevronHit,
            !canRight && scrubberChrome.chevronDisabled,
            pressed && canRight && scrubberChrome.pressed,
          ]}
        >
          {canRight ? (
            <ChevronIcon direction="right" size={SCRUBBER_CHEVRON_SIZE} />
          ) : (
            <View style={scrubberChrome.chevronSpacer} />
          )}
        </Pressable>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
    gap: 6,
  },
  rowTight: {
    marginBottom: 0,
  },
  rowEditing: {
    borderColor: colors.accentBright,
  },
  label: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelEditing: {
    color: colors.accentBright,
  },
});
