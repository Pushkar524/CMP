import '@testing-library/jest-dom';

// Polyfills for browser environment in jsdom
if (typeof window !== 'undefined') {
  // Mock localStorage
  const storageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = String(value);
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
  });

  // Mock window.alert
  window.alert = () => {};

  // Mock matchMedia
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {},
    };
  };

  // Mock crypto subtle digest if needed
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.subtle) {
    window.crypto.subtle = {
      digest: async (algo, data) => new Uint8Array(32).buffer,
    };
  }
}
