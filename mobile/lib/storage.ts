// Thin storage abstraction. In RN, backed by AsyncStorage. In any
// pure-Node context (tests, scripts), falls back to an in-memory Map.

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const isReactNative =
  typeof navigator !== 'undefined' &&
  (navigator as { product?: string }).product === 'ReactNative';

function memoryBackend(): Storage {
  const map = new Map<string, string>();
  return {
    async getItem(k) { return map.has(k) ? (map.get(k) as string) : null; },
    async setItem(k, v) { map.set(k, v); },
    async removeItem(k) { map.delete(k); },
  };
}

let backend: Storage;
if (isReactNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    backend = require('@react-native-async-storage/async-storage').default as Storage;
  } catch {
    backend = memoryBackend();
  }
} else {
  backend = memoryBackend();
}

export const storage = backend;
