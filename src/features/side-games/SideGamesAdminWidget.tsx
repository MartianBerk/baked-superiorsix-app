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
  sideGameLabel,
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
import { utcDayKey } from '@/features/matches/formatMatchDate';
import { colors } from '@/theme';

import { useSideGamesOpen } from './SideGamesOpenContext';

const ADMIN_ROLE = 'admin';

type PendingConfirm =
  | {
      kind: 'open';
      tournament: SideGameKind;
      message: string;
      buyInPence: number;
      entrantIds: string[];
    }
  | {
      kind: 'end';
      tournament: SideGameKind;
      message: string;
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
 * Admin Tournament activate: tournament picker, roster multi-select, buy-in,
 * open/end via SS-141 APIs. No start-date picker — Euros open sends today
 * when the BE still requires `start_date`.
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
  /** Winners for close (multi-select from active roster). */
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
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
  /** Only one side game may be open at a time (product rule). */
  const anyOpen = eurosIsOpen || worldcupIsOpen;
  const selectedIsOpen =
    tournament === 'euros' ? eurosIsOpen : worldcupIsOpen;
  const otherOpenKind: SideGameKind | null = (() => {
    if (tournament === 'euros' && worldcupIsOpen) {
      return 'worldcup';
    }
    if (tournament === 'worldcup' && eurosIsOpen) {
      return 'euros';
    }
    return null;
  })();
  const openKinds = useMemo(() => {
    const kinds: SideGameKind[] = [];
    if (eurosIsOpen) {
      kinds.push('euros');
    }
    if (worldcupIsOpen) {
      kinds.push('worldcup');
    }
    return kinds;
  }, [eurosIsOpen, worldcupIsOpen]);

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
        setWinnerIds([]);
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

  const toggleWinner = (authId: string) => {
    setWinnerIds((prev) =>
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
    if (anyOpen) {
      const openLabel = eurosIsOpen
        ? 'Euros'
        : worldcupIsOpen
          ? 'World Cup'
          : 'A tournament';
      setError(
        `${openLabel} is already open. End it before opening another.`,
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

    const pot = formatPounds(buyInPence * selectedIds.length);
    const names = selectedPlayers.map(playerLabel).join(', ');
    const label = sideGameLabel(tournament);
    setPendingConfirm({
      kind: 'open',
      tournament,
      buyInPence,
      entrantIds: [...selectedIds],
      message: `Open ${label} with buy-in ${formatPounds(buyInPence)} × ${selectedIds.length} = ${pot}. Entrants: ${names}. Proceed?`,
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
        // BE still requires start_date; tournament calendar is authoritative —
        // send today without exposing a picker.
        const created = await openEurosTournament(token, {
          startDate: utcDayKey(new Date()),
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
          `Euros open · ${created.entrant_count} entrants · pot ${formatPounds(created.prize_pot_pence)}.`,
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

  const requestEnd = (kind: SideGameKind) => {
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
    const isOpen = kind === 'euros' ? eurosIsOpen : worldcupIsOpen;
    if (!isOpen) {
      setError(`${sideGameLabel(kind)} is not open.`);
      return;
    }
    if (winnerIds.length === 0) {
      setError('Select at least one winner.');
      return;
    }
    const winnerNames = activePlayers
      .filter((p) => winnerIds.includes(p.auth_id))
      .map(playerLabel);
    setPendingConfirm({
      kind: 'end',
      tournament: kind,
      winnerIds: [...winnerIds],
      message: `End ${sideGameLabel(kind)}. Winners (${winnerNames.length}): ${winnerNames.join(', ')}. Proceed?`,
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
        const closed = await endEurosTournament(token, {
          winnerIds: confirm.winnerIds,
        });
        setEurosMeta({
          open: false,
          buy_in_pence: closed.buy_in_pence,
          entrant_count: closed.entrant_count,
          prize_pot_pence: closed.prize_pot_pence,
          tournament: closed,
        });
        setNote(
          `Euros ended with ${confirm.winnerIds.length} winner(s).`,
        );
      } else {
        const meta = await endWorldcupTournament(token, {
          winnerIds: confirm.winnerIds,
        });
        setWorldcupMeta(meta);
        setNote(
          `World Cup ended with ${confirm.winnerIds.length} winner(s).`,
        );
      }
      setWinnerIds([]);
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
        <LoginForm />
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

        <View
          style={styles.statusBox}
          accessibilityRole="summary"
          accessibilityLabel={
            anyOpen
              ? `Open tournament: ${openKinds
                  .map((k) => (k === 'euros' ? 'Euros' : 'World Cup'))
                  .join(' and ')}`
              : 'No tournament open'
          }
        >
          <Text style={styles.statusLabel}>Status</Text>
          {eurosIsOpen ? (
            <Text style={styles.statusOpen}>
              Open: Euros · {eurosMeta?.entrant_count ?? 0} entrants · pot{' '}
              {formatPounds(eurosMeta?.prize_pot_pence ?? 0)}
            </Text>
          ) : (
            <Text style={styles.statusClosed}>Euros: closed</Text>
          )}
          {worldcupIsOpen ? (
            <Text style={styles.statusOpen}>
              Open: World Cup · {worldcupMeta?.participant_count ?? 0}{' '}
              entrants · pot {formatPounds(worldcupMeta?.pot_pence ?? 0)}
            </Text>
          ) : (
            <Text style={styles.statusClosed}>World Cup: closed</Text>
          )}
          {anyOpen ? (
            <Text style={styles.statusHint}>
              Only one tournament can be open. End the open one before
              activating the other.
            </Text>
          ) : null}
        </View>

        <View style={styles.pickerRow}>
          {(
            [
              ['euros', 'Euros'],
              ['worldcup', 'World Cup'],
            ] as const
          ).map(([value, label]) => {
            const on = tournament === value;
            const isOpen =
              value === 'euros' ? eurosIsOpen : worldcupIsOpen;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Select ${label}${isOpen ? ', currently open' : ''}`}
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
                  {isOpen ? ' · open' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {anyOpen ? (
          <View style={styles.block}>
            {otherOpenKind && !selectedIsOpen ? (
              <Text style={styles.blockHint}>
                {sideGameLabel(otherOpenKind)} is open. Open is blocked until
                you end it.
              </Text>
            ) : null}
            {openKinds.map((kind) => {
              const label = sideGameLabel(kind);
              return (
                <View key={kind} style={styles.endCard}>
                  <Text style={styles.endCardTitle}>{label}</Text>
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
                      const on = winnerIds.includes(player.auth_id);
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
                              <Text style={styles.playerMeta}>
                                {player.email}
                              </Text>
                            ) : null}
                          </View>
                          <SelectionToggleIcon selected={on} size={24} />
                        </Pressable>
                      );
                    })
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`End ${label}`}
                    disabled={
                      busy ||
                      pendingConfirm != null ||
                      winnerIds.length === 0
                    }
                    onPress={() => requestEnd(kind)}
                    style={({ pressed }) => [
                      styles.button,
                      styles.buttonDanger,
                      (busy ||
                        pendingConfirm != null ||
                        winnerIds.length === 0) &&
                        styles.buttonDisabled,
                      pressed &&
                        !busy &&
                        pendingConfirm == null &&
                        winnerIds.length > 0 &&
                        styles.pressed,
                    ]}
                  >
                    {busy &&
                    pendingConfirm?.kind === 'end' &&
                    pendingConfirm.tournament === kind ? (
                      <ActivityIndicator color={colors.text} />
                    ) : (
                      <Text style={styles.buttonText}>End {label}</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Open tournament</Text>
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
                <Text style={styles.buttonText}>
                  Open {tournament === 'euros' ? 'Euros' : 'World Cup'}
                </Text>
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
  statusBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusOpen: {
    color: colors.accentBright,
    fontSize: 14,
    fontWeight: '700',
  },
  statusClosed: {
    color: colors.textMuted,
    fontSize: 13,
  },
  statusHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  blockHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  endCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.menuBar,
  },
  endCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
