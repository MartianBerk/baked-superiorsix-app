import { installStaticAppUrl } from './install';

// Run at module load so web installs before ExpoRoot reads window.location
// (root index.js imports this ahead of expo-router).
installStaticAppUrl();

export { installStaticAppUrl };
