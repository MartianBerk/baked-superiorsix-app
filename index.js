// Gesture handler must load before other RN imports (Expo Router convention).
import 'react-native-gesture-handler';

// `@expo/metro-runtime` MUST be next to ensure Fast Refresh works on web.
// Mirror expo-router/entry-classic, with a web-only static URL shim imported
// before ExpoRoot reads window.location.
import '@expo/metro-runtime';

// Side-effect import: web build patches history and normalizes to `/`.
import './src/platform/static-url';

import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

renderRootComponent(App);
