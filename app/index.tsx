import { Redirect } from 'expo-router';

/** Default entry → Super Six shell (auth gate later). */
export default function Index() {
  return <Redirect href="/(super-six)" />;
}
