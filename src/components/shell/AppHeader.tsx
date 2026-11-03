import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuIcon } from '@/components/icons/MenuIcon';
import { colors } from '@/theme';

const logo = require('../../../assets/icons/logo.png');

type Props = {
  /** Placeholder until round API is wired */
  roundLabel?: string;
  /** Placeholder until prize pot API is wired */
  prizeLabel?: string;
  /** Show floating user control (Super Six shell). */
  showUserFab?: boolean;
  userHref?: '/(super-six)/profile' | '/(auth)';
};

/**
 * Top shell: round + prize pot stacked top-left; main logo centered;
 * smaller floating user icon top-right.
 * Tournament entry points intentionally omitted (SS-8).
 */
export function AppHeader({
  roundLabel = 'Round N',
  prizeLabel = '£X',
  showUserFab = true,
  userHref = '/(super-six)/profile',
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.bar, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.side}>
        <Text style={styles.roundText}>{roundLabel}</Text>
        <Text style={styles.prizeText}>{prizeLabel}</Text>
      </View>

      <View style={styles.logoWrap} pointerEvents="none">
        <Image
          source={logo}
          style={styles.logo}
          accessibilityLabel="Superior Six"
          resizeMode="contain"
        />
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {showUserFab ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="User profile"
            onPress={() => router.push(userHref)}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            hitSlop={8}
          >
            <MenuIcon name="users" size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  logoWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  logo: {
    width: 80,
    height: 64,
  },
  roundText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  prizeText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.fab,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fabPressed: {
    opacity: 0.75,
  },
});
