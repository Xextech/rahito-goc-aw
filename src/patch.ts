// Safely patch window/globalThis to prevent "Cannot set property fetch of #<Window> which has only a getter"
try {
  if (typeof window !== 'undefined') {
    const g = (typeof globalThis !== 'undefined' ? globalThis : window) as any;

    // 1. Ensure FormData exists and has a standard prototype with .keys()
    // This makes sure the condition in formdata-polyfill (typeof FormData === 'undefined' || !FormData.prototype.keys)
    // always evaluates to FALSE, so it completely bypasses trying to overwrite the read-only window.fetch.
    if (typeof g.FormData === 'undefined') {
      class DummyFormData {
        append() {}
        delete() {}
        get() { return null; }
        getAll() { return []; }
        has() { return false; }
        set() {}
      }
      g.FormData = DummyFormData;
    }

    // Double check that FormData.prototype has the required iterator methods
    if (g.FormData && g.FormData.prototype) {
      if (!g.FormData.prototype.keys) {
        g.FormData.prototype.keys = function* () {};
      }
      if (!g.FormData.prototype.values) {
        g.FormData.prototype.values = function* () {};
      }
      if (!g.FormData.prototype.entries) {
        g.FormData.prototype.entries = function* () {};
      }
      if (!g.FormData.prototype[Symbol.iterator]) {
        g.FormData.prototype[Symbol.iterator] = function* () {};
      }
    }

    // Ensure the same properties are reflected directly on window
    if (typeof (window as any).FormData === 'undefined') {
      (window as any).FormData = g.FormData;
    } else {
      const winProto = (window as any).FormData.prototype;
      if (winProto) {
        if (!winProto.keys) winProto.keys = function* () {};
        if (!winProto.values) winProto.values = function* () {};
        if (!winProto.entries) winProto.entries = function* () {};
        if (!winProto[Symbol.iterator]) winProto[Symbol.iterator] = function* () {};
      }
    }
  }
} catch (err) {
  console.warn("Error running global fetch/FormData safety patches:", err);
}

export {};
