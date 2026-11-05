import { AdminWidget } from '@/features/admin/AdminWidget';
import { UserWidget } from '@/features/auth/UserWidget';
import { useUserTabMode } from '@/features/auth/UserTabModeContext';

/**
 * User tab body: normal profile/login or admin invite/roster.
 * Mode is local shell state — header + bottom nav stay put.
 */
export default function ProfileScreen() {
  const { mode } = useUserTabMode();
  return mode === 'admin' ? <AdminWidget /> : <UserWidget />;
}
