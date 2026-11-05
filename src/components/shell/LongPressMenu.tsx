import {
  useCallback,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/theme';

/**
 * Shared long-press delay for every LongPressMenu (all nav buttons inherit this).
 * Do not override per-tab unless product explicitly asks.
 */
export const LONG_PRESS_MS = 500;

export type LongPressMenuOption = {
  id: string;
  label: string;
  onSelect: () => void;
};

type Anchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  /** When empty/undefined, behaves as a plain pressable (no long-press). */
  options?: LongPressMenuOption[] | null;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: { selected?: boolean };
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  children: ReactNode;
};

/**
 * Pressable that optionally opens a small anchored submenu after a long press.
 * Reusable for later bottom-menu tabs (fixtures → admin match builder, etc.).
 * Delay is always {@link LONG_PRESS_MS} (500ms) — shared default, not per-tab.
 */
export function LongPressMenu({
  options,
  onPress,
  accessibilityLabel,
  accessibilityState,
  style,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const slotRef = useRef<ComponentRef<typeof View>>(null);
  const enabled = !!options?.length;

  const measureAndOpen = useCallback(() => {
    const node = slotRef.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      setAnchor(null);
      setOpen(true);
      return;
    }
    node.measureInWindow((x: number, y: number, width: number, height: number) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const onSelect = useCallback((option: LongPressMenuOption) => {
    setOpen(false);
    option.onSelect();
  }, []);

  return (
    <>
      <View ref={slotRef} collapsable={false} style={styles.slot}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={
            enabled ? 'Long press for alternate destinations' : undefined
          }
          onPress={onPress}
          onLongPress={enabled ? measureAndOpen : undefined}
          delayLongPress={LONG_PRESS_MS}
          style={style}
        >
          {children}
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
            style={StyleSheet.absoluteFill}
            onPress={close}
          />
          <MenuCard
            anchor={anchor}
            options={options!}
            onSelect={onSelect}
          />
        </View>
      </Modal>
    </>
  );
}

function MenuCard({
  anchor,
  options,
  onSelect,
}: {
  anchor: Anchor | null;
  options: LongPressMenuOption[];
  onSelect: (option: LongPressMenuOption) => void;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const menuWidth = 148;
  const menuHeight = options.length * 44 + 8;
  const pad = 8;

  let top: number;
  let left: number;

  if (anchor) {
    const preferAbove = anchor.y > menuHeight + pad * 2;
    top = preferAbove
      ? anchor.y - menuHeight - pad
      : anchor.y + anchor.height + pad;
    const centered = anchor.x + anchor.width / 2 - menuWidth / 2;
    left = Math.min(
      Math.max(pad, centered),
      Math.max(pad, windowWidth - menuWidth - pad),
    );
  } else {
    // Fallback when measureInWindow is unavailable (rare on web).
    top = windowHeight - menuHeight - 96;
    left = Math.max(pad, windowWidth - menuWidth - pad * 4);
  }

  return (
    <View style={[styles.menu, { top, left, width: menuWidth }]}>
      {options.map((option, index) => (
        <Pressable
          key={option.id}
          accessibilityRole="menuitem"
          accessibilityLabel={option.label}
          onPress={() => onSelect(option)}
          style={({ pressed }) => [
            styles.option,
            index > 0 && styles.optionBorder,
            pressed && styles.optionPressed,
          ]}
        >
          <Text style={styles.optionLabel}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 21, 37, 0.45)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  optionBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionPressed: {
    backgroundColor: colors.menuActive,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
});
