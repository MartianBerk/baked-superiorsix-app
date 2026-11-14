import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  overrideMatchResult,
  type AdminMatch,
} from '@/api/superiorsix';
import { ApiError } from '@/api/errors';
import { colors } from '@/theme';

type Props = {
  match: AdminMatch;
  token: string;
  onSuccess: (updated: AdminMatch) => void;
};

function scoreToInput(value: number | null): string {
  return value == null ? '' : String(value);
}

/** Parse a non-negative integer score from the text field; null if invalid. */
function parseScoreInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) {
    return null;
  }
  return n;
}

/**
 * Matches admin expand footer: home/away score inputs + Submit.
 * Caller only mounts when kickoff is ≥2h ago (`canOverrideMatchScore`).
 */
export function MatchScoreOverridePanel({ match, token, onSuccess }: Props) {
  const [homeScore, setHomeScore] = useState(scoreToInput(match.home_score));
  const [awayScore, setAwayScore] = useState(scoreToInput(match.away_score));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHomeScore(scoreToInput(match.home_score));
    setAwayScore(scoreToInput(match.away_score));
    setError(null);
  }, [match.id, match.home_score, match.away_score]);

  const parsedHome = useMemo(() => parseScoreInput(homeScore), [homeScore]);
  const parsedAway = useMemo(() => parseScoreInput(awayScore), [awayScore]);
  const canSubmit =
    !busy && parsedHome != null && parsedAway != null;

  const onSubmit = async () => {
    if (!canSubmit || parsedHome == null || parsedAway == null) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await overrideMatchResult(token, match.id, {
        home_score: parsedHome,
        away_score: parsedAway,
      });
      onSuccess(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not override match score.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Override result</Text>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label} numberOfLines={1}>
            {match.home_team}
          </Text>
          <TextInput
            style={styles.input}
            value={homeScore}
            onChangeText={setHomeScore}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
            editable={!busy}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={`Home score for ${match.home_team}`}
          />
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.field}>
          <Text style={[styles.label, styles.labelAway]} numberOfLines={1}>
            {match.away_team}
          </Text>
          <TextInput
            style={styles.input}
            value={awayScore}
            onChangeText={setAwayScore}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
            editable={!busy}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={`Away score for ${match.away_team}`}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit score override"
          disabled={!canSubmit}
          onPress={() => {
            void onSubmit();
          }}
          style={({ pressed }) => [
            styles.submit,
            !canSubmit && styles.submitDisabled,
            pressed && canSubmit && styles.submitPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.submitLabel}>Submit</Text>
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 8,
  },
  heading: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  field: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  labelAway: {
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  colon: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    paddingBottom: 10,
  },
  submit: {
    minWidth: 80,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPressed: {
    backgroundColor: colors.accentBright,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: '#E8A0A0',
    fontSize: 12,
    fontWeight: '500',
  },
});
