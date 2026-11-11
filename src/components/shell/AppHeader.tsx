import { usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { SuperiorSixLogo } from '@/components/icons/SuperiorSixLogo';
import { useUserTabMode } from '@/features/auth/UserTabModeContext';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { useScoresTabMode } from '@/features/scores/ScoresTabModeContext';
import { colors } from '@/theme';

import { formatPotBannerLine } from './potBanner';
import { useRoundStatus } from './RoundStatusContext';
import { RoundStatusStrip } from './RoundStatusStrip';
import {
  PLACEHOLDER_ROUND_STATUS,
  type RoundStatus,
} from './roundStatus';

type Props = {
  /** Placeholder until round API is wired */
  roundLabel?: string;
  /** Placeholder until prize pot API is wired */
  prizeLabel?: string;
  /**
   * Thin status strip under the logo row.
   * Omit to use live player picking / correct count on every player tab
   * (and fixtures admin selection count).
   * Hidden in scores / leaders / profile admin modes.
   */
  roundStatus?: RoundStatus;
};

function isScoresPath(pathname: string): boolean {
  return pathname.includes('/scores');
}

function isLeadersPath(pathname: string): boolean {
  return pathname.includes('/leaders');
}

function isProfilePath(pathname: string): boolean {
  return pathname.includes('/profile');
}

function isSideGamePath(pathname: string): boolean {
  return pathname.includes('/euros') || pathname.includes('/worldcup');
}

/**
 * Top shell: round value left (`# n`), logo center, pot value right (`£…`),
 * optional perfect-slate pot banner, plus thin round-status strip.
 * Player strip + pot banner on player tabs; fixtures admin also shows the strip.
 */
export function AppHeader({
  roundLabel,
  prizeLabel,
  roundStatus,
}: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { mode: scoresMode } = useScoresTabMode();
  const { mode: leadersMode } = useLeadersTabMode();
  const { mode: profileMode } = useUserTabMode();
  const {
    playerPickingStatus,
    sideGamePickingStatus,
    gamedayHeader,
  } = useRoundStatus();
  const chromeReady = gamedayHeader.metaLoaded;
  const resolvedRound = (
    roundLabel ?? (chromeReady ? gamedayHeader.roundLabel : '')
  ).trim();
  const resolvedPrize = (
    prizeLabel ?? (chromeReady ? gamedayHeader.prizeLabel : '')
  ).trim();
  const headerA11y = [
    resolvedRound ? `Round ${resolvedRound}` : null,
    resolvedPrize ? `prize pot ${resolvedPrize}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const onSideGame = isSideGamePath(pathname);
  // Hide when logged out or Scores / Leaders / Profile admin.
  // Euros / World Cup keep the strip (tournament n / total — dedicated channel).
  // Fixtures admin keeps the strip (selection count + slate difficulty pips).
  const hideStatusStrip =
    !isAuthenticated ||
    (scoresMode === 'admin' && isScoresPath(pathname)) ||
    (leadersMode === 'admin' && isLeadersPath(pathname)) ||
    (profileMode === 'admin' && isProfilePath(pathname));

  // Pot banner stays Super Six–only (not tournament perfect-slate).
  const hidePotBanner = hideStatusStrip || onSideGame;

  // Tournament tabs never read Super Six gameday banner counts.
  const status: RoundStatus | null =
    roundStatus ??
    (isAuthenticated && !hideStatusStrip
      ? onSideGame
        ? (sideGamePickingStatus ?? {
            phase: 'picking' as const,
            selectedCount: 0,
            slateSize: 0,
          })
        : (playerPickingStatus ?? PLACEHOLDER_ROUND_STATUS)
      : null);

  const potHolders = status?.perfectSix;
  const potLine = formatPotBannerLine(
    potHolders ?? [],
    status?.slateSize ?? 6,
  );
  const viewerHasPot = (potHolders ?? []).some((h) => h.isViewer);
  const showPotBanner =
    isAuthenticated && !hidePotBanner && potLine != null;

  return (
    <View
      style={[
        styles.outer,
        { paddingTop: Math.max(insets.top, 10) },
      ]}
      accessibilityLabel={headerA11y || 'Superior Six'}
    >
      <View style={styles.card}>
        <View style={styles.bar}>
          <View style={styles.side}>
            {resolvedRound ? (
              <Text style={styles.value}>{resolvedRound}</Text>
            ) : null}
          </View>

          <View style={styles.logoWrap} pointerEvents="none">
            <SuperiorSixLogo width={54} height={54} />
          </View>

          <View style={[styles.side, styles.sideRight]}>
            {resolvedPrize ? (
              <Text style={styles.value}>{resolvedPrize}</Text>
            ) : null}
          </View>
        </View>

        {showPotBanner && potLine ? (
          <View
            style={styles.potBanner}
            accessibilityRole="summary"
            accessibilityLabel={potLine}
          >
            <Text
              style={[
                styles.potBannerText,
                viewerHasPot
                  ? styles.potBannerTextViewer
                  : styles.potBannerTextOthers,
              ]}
            >
              {potLine}
            </Text>
          </View>
        ) : null}

        {hideStatusStrip || status == null ? null : (
          <RoundStatusStrip status={status} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: '3%',
    // Match wrap/scrubber vertical rhythm on Matches + Scores (12).
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  potBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  potBannerText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  /** Same green as RoundStatusStrip “6 / 6 correct”. */
  potBannerTextViewer: {
    color: colors.accentBright,
  },
  /** Other players only on 6/6. */
  potBannerTextOthers: {
    color: colors.amber,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  logoWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
