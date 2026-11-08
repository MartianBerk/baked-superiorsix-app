import { Redirect } from 'expo-router';

/** Deep-link / legacy group → Super Six Euro Wizard tab. */
export default function EuroWizardRedirect() {
  return <Redirect href="/(super-six)/euros" />;
}
