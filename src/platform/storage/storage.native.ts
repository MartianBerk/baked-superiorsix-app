import * as SecureStore from 'expo-secure-store';

/**
 * Native secure persistence for session tokens.
 * iOS Keychain values are practically capped (~2KB); callers should keep
 * payloads small. Failures are swallowed so a full store does not crash the app
 * — session then lives in memory only until the next successful write.
 */
export async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Size / Keychain errors — leave previous value; in-memory session still works.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
