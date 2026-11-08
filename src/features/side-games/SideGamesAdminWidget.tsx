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
  endEurosTournament,
  endWorldcupTournament,
  getAdminEurosMeta,
  getAdminWorldcupSettings,
  isEurosOpen,
  isWorldcupOpen,
  openEurosTournament,
  openWorldcupTournament,
  type EurosMeta,
  type SideGameKind,
  type WorldcupMeta,
} from '@/api/sideGames';
import { listPlayers, type PlayerProfile } from '@/api';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { SelectionToggleIcon } from '@/components/icons/SelectionToggleIcon';
import { LoginForm } from '@/features/auth/LoginForm';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import {
  formatScrubberDate,
  utcDayKey,
} from '@/features/matches/formatMatchDate';
import { colors } from '@/theme';

import { useSideGamesOpen } from './SideGamesOpenContext';

const ADMIN_ROLE = 'admin';

type PendingConfirm =
  | {
      kind: 'open';
      tournament: SideGameKind;
      message: string;
      startDate: string;
      buyInPence: number;
      entrantIds: string[];
    }
  | {
      kind: 'end';
      tournament: SideGameKind;
      message: string;
      endDate: string;
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

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return `${err.message} Side-game activate needs the superiorsix admin role.`;
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

/**
 * Admin Side games activate: tournament picker, roster multi-select, buy-in,
 * open/end via SS-141 APIs.
 */
export function SideGamesAdminWidget() {
  const { status, isAuthenticated, token, hasRole } = useAuth();
  const { setMode } = useLeadersTabMode();
  const { refresh: refreshOpen } = useSideGamesOpen();

  const [tournament, setTournament] = useState<SideGameKind>('euros');
  const [eurosMeta, setEurosMeta] = useState<EurosMeta | null>(null);
  const [worldcupMeta, setWorldcupMeta] = useState<WorldcupMeta | null>(null);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(utcDayKey(new Date()));
  const [endDate, setEndDate] = useState(utcDayKey(new Date()));
  const [stakePounds, setStakePounds] = useState('2');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );

  const canManage = isAuthenticated && hasRole(ADMIN_ROLE);

  const activePlayers = useMemo(
    () => players.filter((player) => player.active && !player.retired),
    [players],
  );

  const selectedPlayers = useMemo(
    () => activePlayers.filter((p) => selectedIds.includes(p.auth_id)),
    [activePlayers, selectedIds],
  );

  const eurosIsOpen = isEurosOpen(eurosMeta);
  const worldcupIsOpen = isWorldcupOpen(worldcupMeta);
  const currentOpen =
    tournament === 'euros' ? eurosIsOpen : worldcupIsOpen;

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
        const [euros, worldcup, roster] = await Promise.all([
          getAdminEurosMeta(token),
          getAdminWorldcupSettings(token),
          listPlayers(token, true),
        ]);
        setEurosMeta(euros);
        setWorldcupMeta(worldcup);
        setPlayers(roster);
        setStartDate(utcDayKey(new Date()));
        setEndDate(utcDayKey(new Date()));
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load side-game admin state.',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on auth
  }, [status, canManage, token]);

  const toggleEntrant = (authId: string) => {
    setSelectedIds((prev) =>
      prev.includes(authId)
        ? prev.filter((id) => id !== authId)
        : [...prev, authId],
    );
    setError(null);
    setNote(null);
  };

  const requestOpen = () => {
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    if (!token) {
      setError('Not signed in.');
      return;
    }
    if (!canManage) {
      setError('Opening a side game needs the superiorsix admin role.');
      return;
    }
    if (currentOpen) {
      setError(
        tournament === 'euros'
          ? 'An Euros tournament is already open. End it first.'
          : 'World Cup is already open. End it first.',
      );
      return;
    }
    if (selectedIds.length === 0) {
      setError('Select at least one entrant from the roster.');
      return;
    }
    const buyInPence = parseStakePounds(stakePounds);
    if (buyInPence == null) {
      setError('Enter a valid buy-in in pounds (e.g. 2 or 2.50).');
      return;
    }
    if (tournament === 'euros') {
      const day = startDate.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        setError('Start date must be YYYY-MM-DD.');
        return;
      }
    }

    const pot = formatPounds(buyInPence * selectedIds.length);
    const names = selectedPlayers.map(playerLabel).join(', ');
    setPendingConfirm({
      kind: 'open',
      tournament,
      startDate: startDate.trim(),
      buyInPence,
      entrantIds: [...selectedIds],
      message:
        tournament === 'euros'
          ? `Open Euro Wizard on ${formatScrubberDate(startDate.trim())} with buy-in ${formatPounds(buyInPence)} × ${selectedIds.length} = ${pot}. Entrants: ${names}. Proceed?`
          : `Open World Cup with buy-in ${formatPounds(buyInPence)} × ${selectedIds.length} = ${pot}. Entrants: ${names}. Proceed?`,
    });
  };

  const submitOpen = async (confirm: Extract<PendingConfirm, { kind: 'open' }>) => {
    if (!token || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    try {
      if (confirm.tournament === 'euros') {
        const created = await openEurosTournament(token, {
          startDate: confirm.startDate,
          buyInPence: confirm.buyInPence,
          entrantIds: confirm.entrantIds,
        });
        setEurosMeta({
          open: true,
          buy_in_pence: created.buy_in_pence,
          entrant_count: created.entrant_count,
          prize_pot_pence: created.prize_pot_pence,
          tournament: created,
        });
        setNote(
          `Euro Wizard open · ${created.entrant_count} entrants · pot ${formatPounds(created.prize_pot_pence)}.`,
        );
      } else {
        const meta = await openWorldcupTournament(token, {
          buyInPence: confirm.buyInPence,
          entrantIds: confirm.entrantIds,
        });
        setWorldcupMeta(meta);
        setNote(
          `World Cup open · ${meta.participant_count} entrants · pot ${formatPounds(meta.pot_pence)}.`,
        );
      }
      setSelectedIds([]);
      await refreshOpen();
    } catch (err) {
      setError(formatApiError(err, 'Could not open the side game.'));
    } finally {
      setBusy(false);
    }
  };

  const requestEnd = () => {
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    if (!token) {
      setError('Not signed in.');
      return;
    }
    if (!canManage) {
      setError('Ending a side game needs the superiorsix admin role.');
      return;
    }
    if (!currentOpen) {
      setError('No open tournament for this side game.');
      return;
    }
    const day = endDate.trim();
    if (tournament === 'euros' && !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setError('End date must be YYYY-MM-DD.');
      return;
    }
    setPendingConfirm({
      kind: 'end',
      tournament,
      endDate: day,
      message:
        tournament === 'euros'
          ? `End Euro Wizard on ${formatScrubberDate(day)}. Proceed?`
          : 'End World Cup (clears open for nav). Proceed?',
    });
  };

  const submitEnd = async (confirm: Extract<PendingConfirm, { kind: 'end' }>) => {
    if (!token || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    setPendingConfirm(null);
    try {
      if (confirm.tournament === 'euros') {
        const closed = await endEurosTournament(token, confirm.endDate);
        setEurosMeta({
          open: false,
          buy_in_pence: closed.buy_in_pence,
          entrant_count: closed.entrant_count,
          prize_pot_pence: closed.prize_pot_pence,
          tournament: closed,
        });
        setNote(`Euro Wizard ended on ${formatScrubberDate(confirm.endDate)}.`);
      } else {
        const meta = await endWorldcupTournament(token);
        setWorldcupMeta(meta);
        setNote('World Cup ended.');
      }
      await refreshOpen();
    } catch (err) {
      setError(formatApiError(err, 'Could not end the side game.'));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmYes = () => {
    if (!pendingConfirm || busy) {
      return;
    }
    if (pendingConfirm.kind === 'open') {
      void submitOpen(pendingConfirm);
      return;
    }
    void submitEnd(pendingConfirm);
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
            Activating side games needs the superiorsix admin role.
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

  const buyInPreview = parseStakePounds(stakePounds) ?? 0;
  const potPreview = buyInPreview * selectedIds.length;

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
        <Text style={styles.heading}>Side games</Text>
        <Text style={styles.lede}>
          Activate Euro Wizard or World Cup: pick the tournament, select
          entrants, set buy-in. Pot is static (buy-in × entrants).
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
                  pendingConfirm.kind === 'end'
                    ? styles.buttonDanger
                    : styles.confirmYes,
                  (pressed || busy) && styles.pressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.buttonText}>
                    {pendingConfirm.kind === 'end' ? 'End' : 'Open'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Tournament</Text>
        <View style={styles.pickerRow}>
          {(
            [
              ['euros', 'Euros'],
              ['worldcup', 'World Cup'],
            ] as const
          ).map(([value, label]) => {
            const on = tournament === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Select ${label}`}
                disabled={busy}
                onPress={() => {
                  setTournament(value);
                  setError(null);
                  setNote(null);
                  setPendingConfirm(null);
                }}
                style={({ pressed }) => [
                  styles.pickerChip,
                  on && styles.pickerChipOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.pickerText, on && styles.pickerTextOn]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.meta}>
          {tournament === 'euros'
            ? eurosIsOpen
              ? `Open · ${eurosMeta?.entrant_count ?? 0} entrants · pot ${formatPounds(eurosMeta?.prize_pot_pence ?? 0)}`
              : 'Closed'
            : worldcupIsOpen
              ? `Open · ${worldcupMeta?.participant_count ?? 0} entrants · pot ${formatPounds(worldcupMeta?.pot_pence ?? 0)}`
              : 'Closed'}
        </Text>

        {!currentOpen ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Open tournament</Text>
            {tournament === 'euros' ? (
              <>
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
                  accessibilityLabel="Tournament start date"
                />
              </>
            ) : null}
            <Text style={styles.label}>Buy-in (£)</Text>
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
              accessibilityLabel="Buy-in in pounds"
            />
            <Text style={styles.hint}>
              Pot preview:{' '}
              {formatPounds(buyInPreview)} × {selectedIds.length} ={' '}
              {formatPounds(potPreview)}.
            </Text>

            <Text style={styles.label}>Entrants</Text>
            <Text style={styles.hint}>
              Multi-select active roster. Posted as entrant_ids (auth_id).
              Grants {tournament === 'euros' ? 'euros' : 'worldcup'} on open.
            </Text>
            {activePlayers.length === 0 ? (
              <Text style={styles.emptyList}>
                No active players on the roster.
              </Text>
            ) : (
              activePlayers.map((player) => {
                const on = selectedIds.includes(player.auth_id);
                return (
                  <Pressable
                    key={player.auth_id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Toggle entrant ${playerLabel(player)}`}
                    disabled={busy}
                    onPress={() => toggleEntrant(player.auth_id)}
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
              accessibilityLabel="Open tournament"
              disabled={
                busy ||
                pendingConfirm != null ||
                selectedIds.length === 0
              }
              onPress={requestOpen}
              style={({ pressed }) => [
                styles.button,
                (busy ||
                  pendingConfirm != null ||
                  selectedIds.length === 0) &&
                  styles.buttonDisabled,
                pressed &&
                  !busy &&
                  pendingConfirm == null &&
                  selectedIds.length > 0 &&
                  styles.pressed,
              ]}
            >
              {busy && pendingConfirm?.kind === 'open' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonText}>Open tournament</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Active tournament</Text>
            <Text style={styles.hint}>
              Bottom-nav trophy shows while open. End to hide it.
            </Text>
            {tournament === 'euros' ? (
              <>
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
                  accessibilityLabel="Tournament end date"
                />
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End tournament"
              disabled={busy || pendingConfirm != null}
              onPress={requestEnd}
              style={({ pressed }) => [
                styles.button,
                styles.buttonDanger,
                (busy || pendingConfirm != null) && styles.buttonDisabled,
                pressed &&
                  !busy &&
                  pendingConfirm == null &&
                  styles.pressed,
              ]}
            >
              {busy && pendingConfirm?.kind === 'end' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonText}>End tournament</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: '3%',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  wrap: {
    paddingHorizontal: '3%',
    paddingTop: 4,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  link: {
    color: colors.accentBright,
    marginTop: 12,
    fontWeight: '600',
  },
  error: {
    color: '#E8A0A0',
    marginBottom: 10,
    fontSize: 13,
  },
  saved: {
    color: colors.accentBright,
    marginBottom: 10,
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pickerChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.menuBar,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pickerChipOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
  },
  pickerText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  pickerTextOn: {
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  block: {
    marginTop: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 17,
  },
  emptyList: {
    color: colors.textMuted,
    fontSize: 13,
    marginVertical: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.menuBar,
    marginTop: 6,
  },
  playerRowOn: {
    borderColor: colors.accentBright,
    backgroundColor: colors.menuActive,
  },
  playerText: {
    flex: 1,
  },
  playerName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  playerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonDanger: {
    backgroundColor: colors.resultLose,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
  confirmBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  confirmText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancel: {
    backgroundColor: colors.menuBar,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  confirmYes: {
    backgroundColor: colors.accent,
  },
});
