import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addRound,
  endRound,
  getCurrentRound,
  listPlayers,
  type PlayerProfile,
  type RoundInfo,
} from '@/api';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { SelectionToggleIcon } from '@/components/icons/SelectionToggleIcon';
import { LoginForm } from '@/features/auth/LoginForm';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import {
  formatScrubberDate,
  toLegacyDateParam,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { colors } from '@/theme';

const ADMIN_ROLE = 'admin';

type PendingConfirm =
  | {
      kind: 'start';
      message: string;
      startDate: string;
      buyInPence: number;
    }
  | {
      kind: 'close';
      message: string;
      endDate: string;
      winnerIds: string[];
    };

function playerLabel(player: PlayerProfile): string {
  const nick = player.nickname?.trim();
  const name = `${player.first_name} ${player.last_name}`.trim();
  if (nick && name) {
    return `${name} · ${nick}`;
  }
  return nick || name || player.email || player.auth_id;
}

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`;
}

function parseStakePounds(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100);
}

function formatRoundApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return `${err.message} Round start/close needs the superiorsix admin role.`;
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

/**
 * Admin parent-round start/close. Rendered inside the leaders tab when mode
 * is admin — header + nav stay visible (same pattern as fixtures/users).
 */
export function RoundAdminWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();
  const { setMode } = useLeadersTabMode();

  const [round, setRound] = useState<RoundInfo | null>(null);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [startDate, setStartDate] = useState(utcDayKey(new Date()));
  const [endDate, setEndDate] = useState(utcDayKey(new Date()));
  /** Stake in pounds (legacy UI); converted to `buy_in_pence` on submit. */
  const [stakePounds, setStakePounds] = useState('2');
  /** Selected winner auth_ids (SS-15 endround body). */
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /** In-widget confirm — `Alert.alert` is unreliable on web (Start looked like a no-op). */
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );

  const canManage = isAuthenticated && hasRole(ADMIN_ROLE);

  const activePlayers = useMemo(
    () => players.filter((player) => player.active && !player.retired),
    [players],
  );

  const selectedWinners = useMemo(
    () =>
      activePlayers.filter((player) =>
        selectedWinnerIds.includes(player.auth_id),
      ),
    [activePlayers, selectedWinnerIds],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token) {
        return;
      }
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const [current, roster] = await Promise.all([
          getCurrentRound(token),
          listPlayers(token, true),
        ]);
        setRound(current);
        setPlayers(roster);
        if (current == null) {
          setStartDate(utcDayKey(new Date()));
          setSelectedWinnerIds([]);
        } else {
          setEndDate(utcDayKey(new Date()));
        }
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load round or roster.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (status === 'loading' || !canManage || !token) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void load('initial');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on auth; refresh via pull
  }, [status, canManage, token]);

  const toggleWinner = (authId: string) => {
    setSelectedWinnerIds((prev) =>
      prev.includes(authId)
        ? prev.filter((id) => id !== authId)
        : [...prev, authId],
    );
    setError(null);
    setNote(null);
  };

  const requestStart = () => {
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    if (!token) {
      setError('Not signed in.');
      return;
    }
    if (!canManage) {
      setError('Starting a round needs the superiorsix admin role.');
      return;
    }
    if (round != null) {
      setError(
        'A round is already in progress. Close it before starting another.',
      );
      return;
    }
    const day = startDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setError('Start date must be YYYY-MM-DD.');
      return;
    }
    const buyInPence = parseStakePounds(stakePounds);
    if (buyInPence == null) {
      setError('Enter a valid stake in pounds (e.g. 2 or 2.50).');
      return;
    }

    setPendingConfirm({
      kind: 'start',
      message: `Start on ${formatScrubberDate(day)} with a buy-in of ${formatPounds(buyInPence)}. Proceed?`,
      startDate: day,
      buyInPence,
    });
  };

  const submitStart = async (day: string, buyInPence: number) => {
    if (!token || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    try {
      const created = await addRound(token, {
        startDate: day,
        buyInPence,
      });
      setRound(created);
      setEndDate(utcDayKey(new Date()));
      setSelectedWinnerIds([]);
      setNote(
        `Round ${created.id} started · buy-in ${formatPounds(created.buy_in_pence)}.`,
      );
    } catch (err) {
      setError(formatRoundApiError(err, 'Could not start the round.'));
    } finally {
      setBusy(false);
    }
  };

  const requestClose = () => {
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    if (!token) {
      setError('Not signed in.');
      return;
    }
    if (!canManage) {
      setError('Closing a round needs the superiorsix admin role.');
      return;
    }
    if (round == null) {
      setError('No round in progress.');
      return;
    }
    const day = endDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setError('End date must be YYYY-MM-DD.');
      return;
    }
    if (selectedWinnerIds.length === 0) {
      setError('Select at least one winner.');
      return;
    }

    const winnerNames = selectedWinners.map(playerLabel);
    setPendingConfirm({
      kind: 'close',
      message: `End round ${round.id} on ${formatScrubberDate(day)}. Winners (${winnerNames.length}): ${winnerNames.join(', ')}. Proceed?`,
      endDate: day,
      winnerIds: [...selectedWinnerIds],
    });
  };

  const submitClose = async (day: string, winnerIds: string[]) => {
    if (!token || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    try {
      const closed = await endRound(token, {
        endDate: day,
        winnerIds,
      });
      setRound(null);
      setSelectedWinnerIds([]);
      setStartDate(utcDayKey(new Date()));
      const count = closed.winner_ids?.length ?? winnerIds.length;
      setNote(
        `Round closed on ${formatScrubberDate(day)} with ${count} winner(s).`,
      );
    } catch (err) {
      setError(formatRoundApiError(err, 'Could not close the round.'));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmYes = () => {
    if (!pendingConfirm || busy) {
      return;
    }
    if (pendingConfirm.kind === 'start') {
      void submitStart(pendingConfirm.startDate, pendingConfirm.buyInPence);
      return;
    }
    void submitClose(pendingConfirm.endDate, pendingConfirm.winnerIds);
  };

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <LoginForm heading="Admin sign in" />
      </View>
    );
  }

  if (!canManage) {
    return (
      <View style={styles.center}>
        <View style={styles.wrap}>
          <Text style={styles.heading}>Admin required</Text>
          <Text style={styles.lede}>
            Starting and closing rounds needs the superiorsix admin role.
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => setMode('normal')}
            style={styles.link}
          >
            Back to leaders
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void load('refresh');
          }}
          tintColor={colors.textMuted}
        />
      }
    >
      <View style={styles.wrap}>
        <Text style={styles.kicker}>Admin</Text>
        <Text style={styles.heading}>Round</Text>
        <Text style={styles.lede}>
          Parent game round: start when none is open, or close the active round
          with one or more winners.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {note ? <Text style={styles.saved}>{note}</Text> : null}

        {pendingConfirm ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>{pendingConfirm.message}</Text>
            <View style={styles.confirmRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel confirmation"
                disabled={busy}
                onPress={() => setPendingConfirm(null)}
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.confirmCancel,
                  (pressed || busy) && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm action"
                disabled={busy}
                onPress={onConfirmYes}
                style={({ pressed }) => [
                  styles.confirmButton,
                  pendingConfirm.kind === 'close'
                    ? styles.buttonDanger
                    : styles.confirmYes,
                  (pressed || busy) && styles.pressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.buttonText}>
                    {pendingConfirm.kind === 'close' ? 'Close' : 'Start'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {round == null ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Start round</Text>
            <Text style={styles.label}>Start date (UTC)</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Round start date"
            />
            <Text style={styles.label}>Stake (£)</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="decimal-pad"
              editable={!busy}
              value={stakePounds}
              onChangeText={setStakePounds}
              placeholder="2"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Round stake in pounds"
            />
            <Text style={styles.hint}>
              Sent as buy_in_pence (
              {formatPounds(parseStakePounds(stakePounds) ?? 0)}).
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start round"
              disabled={busy || pendingConfirm != null}
              onPress={requestStart}
              style={({ pressed }) => [
                styles.button,
                (busy || pendingConfirm != null) && styles.buttonDisabled,
                pressed &&
                  !busy &&
                  pendingConfirm == null &&
                  styles.pressed,
              ]}
            >
              {busy && pendingConfirm?.kind === 'start' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonText}>Start round</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Active round</Text>
            <Text style={styles.meta}>
              Round {round.id} · started{' '}
              {formatScrubberDate(utcDayKey(round.start_date))} · buy-in{' '}
              {formatPounds(round.buy_in_pence)}
            </Text>
            <Text style={styles.hint}>
              A new round cannot be started while this one is open.
            </Text>

            <Text style={styles.label}>End date (UTC)</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Round end date"
            />
            <Text style={styles.hint}>
              API uses endDate=
              {toLegacyDateParam(endDate || utcDayKey(new Date()))}.
            </Text>

            <Text style={styles.label}>Winners</Text>
            <Text style={styles.hint}>
              Select at least one. Posted as winner_ids (auth_id).
            </Text>
            {activePlayers.length === 0 ? (
              <Text style={styles.emptyList}>
                No active players on the roster.
              </Text>
            ) : (
              activePlayers.map((player) => {
                const on = selectedWinnerIds.includes(player.auth_id);
                return (
                  <Pressable
                    key={player.auth_id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Toggle winner ${playerLabel(player)}`}
                    disabled={busy}
                    onPress={() => toggleWinner(player.auth_id)}
                    style={({ pressed }) => [
                      styles.playerRow,
                      on && styles.playerRowOn,
                      (pressed || busy) && styles.pressed,
                    ]}
                  >
                    <View style={styles.playerText}>
                      <Text style={styles.playerName}>
                        {playerLabel(player)}
                      </Text>
                      {player.email ? (
                        <Text style={styles.playerMeta}>{player.email}</Text>
                      ) : null}
                    </View>
                    <SelectionToggleIcon selected={on} size={24} />
                  </Pressable>
                );
              })
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close round"
              disabled={
                busy ||
                pendingConfirm != null ||
                selectedWinnerIds.length === 0
              }
              onPress={requestClose}
              style={({ pressed }) => [
                styles.button,
                styles.buttonDanger,
                (busy ||
                  pendingConfirm != null ||
                  selectedWinnerIds.length === 0) &&
                  styles.buttonDisabled,
                pressed &&
                  !busy &&
                  pendingConfirm == null &&
                  selectedWinnerIds.length > 0 &&
                  styles.pressed,
              ]}
            >
              {busy && pendingConfirm?.kind === 'close' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonText}>Close round</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingVertical: 24,
    backgroundColor: colors.background,
  },
  wrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  link: {
    color: colors.accentBright,
    fontSize: 15,
    fontWeight: '500',
  },
  block: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 14,
  },
  confirmBox: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  confirmText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmCancel: {
    backgroundColor: colors.menuActive,
  },
  confirmYes: {
    backgroundColor: colors.accent,
  },
  meta: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  playerRowOn: {
    borderColor: colors.accentBright,
    backgroundColor: colors.menuActive,
  },
  playerText: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  playerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyList: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 14,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDanger: {
    backgroundColor: colors.resultLose,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  error: {
    color: '#E8A0A0',
    fontSize: 13,
    marginBottom: 12,
  },
  saved: {
    color: colors.accentBright,
    fontSize: 13,
    marginBottom: 12,
  },
});
