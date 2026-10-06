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
      innerWidth: 1280,
      innerHeight: 800,
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

  if (typeof (globalThis as any).FileReader === 'undefined') {
    class MockFileReader {
      onload: ((e?: any) => void) | null = null;
      onerror: ((e?: any) => void) | null = null;
      result: string | ArrayBuffer | null = null;

      readAsDataURL(blob: Blob) {
        if (typeof blob.arrayBuffer === 'function') {
          blob
            .arrayBuffer()
            .then((buffer) => {
              const base64 = Buffer.from(buffer).toString('base64');
              const type = blob.type || 'image/jpeg';
              this.result = `data:${type};base64,${base64}`;
              if (this.onload) this.onload({ target: this });
            })
            .catch((err) => {
              if (this.onerror) this.onerror(err);
            });
        } else {
          this.result = 'data:image/jpeg;base64,bW9ja2RhdGE=';
          if (this.onload) this.onload({ target: this });
        }
      }
    }
    (globalThis as any).FileReader = MockFileReader;
  }
}
