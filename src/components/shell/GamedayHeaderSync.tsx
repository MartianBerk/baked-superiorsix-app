import { useEffect } from 'react';

import { useAuth } from '@/auth';

import { useRoundStatus } from './RoundStatusContext';

/**
 * Loads public shell round / pot via `GET /game/meta` (no auth required).
 * Refetches when signed-in user identity changes. Pull-to-refresh on tab bodies
 * calls `refreshGameMeta({ preserveChrome: true })` directly.
 */
export function GamedayHeaderSync() {
  const { refreshGameMeta } = useRoundStatus();
  const { isAuthenticated, session } = useAuth();
  const userId = session?.userId ?? null;
  const loadKey = isAuthenticated ? `user:${userId ?? ''}` : 'public';

  useEffect(() => {
    void refreshGameMeta();
  }, [loadKey, refreshGameMeta]);

  return null;
}
