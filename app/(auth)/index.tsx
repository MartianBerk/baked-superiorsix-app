import { UserWidget } from '@/features/auth/UserWidget';

/** Auth route group — same login/session widget as the profile tab. */
export default function AuthScreen() {
  return <UserWidget />;
}
