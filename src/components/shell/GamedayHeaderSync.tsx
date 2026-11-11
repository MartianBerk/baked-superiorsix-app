import { useEffect } from 'react';

import { useAuth } from '@/auth';

import { useRoundStatus } from './RoundStatusContext';

/**
 * Loads shell round / pot once per signed-in user via shared `refreshGameMeta`.
 * Also runs after logout to clear cached meta. Pull-to-refresh on tab bodies
 * calls `refreshGameMeta({ preserveChrome: true })` directly.
 */
export function GamedayHeaderSync() {
  const { refreshGameMeta, clearGamedayMeta } = useRoundStatus();
  const { isAuthenticated, session } = useAuth();
  const userId = session?.userId ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      clearGamedayMeta();
      return;
    }
    void refreshGameMeta();
  }, [isAuthenticated, userId, refreshGameMeta, clearGamedayMeta]);

  return null;
}
