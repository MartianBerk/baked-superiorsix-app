import { useEffect, useRef } from 'react';

import { useAuth } from '@/auth';
import { useUserTabMode } from '@/features/auth/UserTabModeContext';
import { useLeadersTabMode } from '@/features/leaders/LeadersTabModeContext';
import { useFixturesTabMode } from '@/features/matches/FixturesTabModeContext';
import { useScoresTabMode } from '@/features/scores/ScoresTabModeContext';

/**
 * On login / logout / user switch, force every dual-mode tab back to normal
 * so admin screens do not stick across sessions or accounts.
 */
export function DualModeAuthReset() {
  const { status, session } = useAuth();
  const { setMode: setProfileMode } = useUserTabMode();
  const { setMode: setFixturesMode } = useFixturesTabMode();
  const { setMode: setScoresMode } = useScoresTabMode();
  const { setMode: setLeadersMode } = useLeadersTabMode();

  const identityKey =
    status === 'signedIn' && session?.userId ? session.userId : null;
  const prevIdentityRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    const prev = prevIdentityRef.current;
    prevIdentityRef.current = identityKey;
    // First settled auth state — contexts already default to normal.
    if (prev === undefined) {
      return;
    }
    if (prev === identityKey) {
      return;
    }
    setProfileMode('normal');
    setFixturesMode('normal');
    setScoresMode('normal');
    setLeadersMode('normal');
  }, [
    status,
    identityKey,
    setProfileMode,
    setFixturesMode,
    setScoresMode,
    setLeadersMode,
  ]);

  return null;
}
