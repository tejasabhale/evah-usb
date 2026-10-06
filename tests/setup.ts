// Test environment setup for Vitest
if (typeof window === 'undefined') {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };

  const btoaPolyfill = (str: string) => Buffer.from(str, 'binary').toString('base64');
  const atobPolyfill = (b64: string) => Buffer.from(b64, 'base64').toString('binary');

  let clipboardData = '';
  const clipboardMock = {
    writeText: async (t: string) => {
      clipboardData = t;
    },
    readText: async () => clipboardData,
  };

  Object.defineProperty(globalThis, 'window', {
    value: {
      crypto: globalThis.crypto,
      localStorage: localStorageMock,
      navigator: {
        clipboard: clipboardMock,
        userAgent: 'test-env',
      },
      btoa: globalThis.btoa || btoaPolyfill,
      atob: globalThis.atob || atobPolyfill,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    },
    writable: true,
  });

  Object.defineProperty(globalThis, 'navigator', {
    value: {
      clipboard: clipboardMock,
      userAgent: 'test-env',
    },
    writable: true,
  });

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  if (!globalThis.btoa) {
    globalThis.btoa = btoaPolyfill;
  }
  if (!globalThis.atob) {
    globalThis.atob = atobPolyfill;
  }
}
