import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { LiveMatch, PredictionChoice } from '@/api/superiorsix';
import { colors } from '@/theme';

import { PickOutcomeBadge } from './PickOutcomeBadge';
import { isPickCurrentlyCorrect, PICK_BADGE_LABEL } from './pickOutcome';
import { ScoreMatchRow } from './ScoreMatchRow';
import { scoreListChrome } from './scoreListChrome';

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="CURRENT" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

type Props = {
  playerName: string;
  matches: LiveMatch[];
  /** matchId → prediction for this player. */
  predictions: Record<number, PredictionChoice | null>;
  /**
   * Display numerator for n/X (X = slate size): set predictions while picking,
   * correct picks once live/finished — same rules as the header strip.
   */
  score: number;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Wall clock for live score / badge timing (Matches shared clock). */
  now?: Date;
};

/**
 * Collapsible player block for Scores.
 * Collapsed: name left; badges + n/X + chevron on the right
 * (extra gap between last badge and n/X).
 * Expanded: per-match Home | badge | Away (badge-only centre).
 * Slate difficulty lives in the under-header strip, not per player row.
 */
export function PlayerScoreSection({
  playerName,
  matches,
  predictions,
  score,
  expanded,
  onToggleExpand,
  now = new Date(),
}: Props) {
  const chevron = (expanded ? CHEVRON_UP : CHEVRON_DOWN).replaceAll(
    'CURRENT',
    colors.textMuted,
  );
  const slateSize = matches.length > 0 ? matches.length : 6;
  const countLabel = `${score}/${slateSize}`;
  const pickSummary = matches
    .map((match) => {
      const prediction = predictions[match.id] ?? null;
      return prediction != null ? PICK_BADGE_LABEL[prediction] : '—';
    })
    .join(' ');

  return (
    <View style={scoreListChrome.sectionCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${playerName}, picks ${pickSummary}, ${countLabel}${expanded ? ', expanded' : ''}`}
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        <View style={styles.rightCol}>
          <View style={styles.badges}>
            {matches.map((match) => {
              const prediction = predictions[match.id] ?? null;
              if (prediction == null) {
                return (
                  <Text key={match.id} style={styles.pickNone}>
                    —
                  </Text>
                );
              }
              return (
                <PickOutcomeBadge
                  key={match.id}
                  prediction={prediction}
                  correct={isPickCurrentlyCorrect(prediction, match, now)}
                  compact
                />
              );
            })}
          </View>
          <Text style={styles.count}>{countLabel}</Text>
          <View style={styles.chevronSlot}>
            <SvgXml xml={chevron} width={18} height={18} />
          </View>
        </View>
      </Pressable>
      {expanded
        ? matches.map((match) => (
            <ScoreMatchRow
              key={match.id}
              match={match}
              prediction={predictions[match.id] ?? null}
              now={now}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.menuBar,
  },
  headerPressed: {
    backgroundColor: colors.menuActive,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // Extra space between the last badge and n/6 (~1.5× prior 10).
    marginRight: 15,
  },
  pickNone: {
    width: 22,
    height: 22,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  count: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    minWidth: 32,
    textAlign: 'right',
    flexShrink: 0,
  },
  chevronSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
