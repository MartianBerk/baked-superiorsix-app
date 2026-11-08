import { Redirect } from 'expo-router';

/** Deep-link / legacy group → Super Six World Cup tab. */
export default function QatarHeroRedirect() {
  return <Redirect href="/(super-six)/worldcup" />;
}
