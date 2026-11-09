import { Redirect } from 'expo-router';

/** Deep-link / route group → Super Six World Cup tab. */
export default function WorldCupRedirect() {
  return <Redirect href="/(super-six)/worldcup" />;
}
