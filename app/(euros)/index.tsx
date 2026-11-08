import { Redirect } from 'expo-router';

/** Deep-link / route group → Super Six Euros tab. */
export default function EurosRedirect() {
  return <Redirect href="/(super-six)/euros" />;
}
