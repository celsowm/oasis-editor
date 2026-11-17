import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot } from "solid-js";
import { createRevisionsPanel } from "@/ui/app/createRevisionsPanel.js";

const KEY = "oasis-reviewing-pane-v1";

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  clear(): void {
    this.items.clear();
  }
}

let storage: MemoryStorage;

function stored(): unknown {
  const raw = storage.getItem(KEY);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
});

function withPanel<T>(
  run: (panel: ReturnType<typeof createRevisionsPanel>) => T,
): T {
  return createRoot((dispose) => {
    try {
      return run(createRevisionsPanel());
    } finally {
      dispose();
    }
  });
}

describe("createRevisionsPanel persistence", () => {
  it("starts closed with no stored state and persists toggle/close", () => {
    withPanel((panel) => {
      expect(panel.open()).toBe(false);
      expect(panel.scrollTop()).toBe(0);
      expect(storage.getItem(KEY)).toBeNull();
      expect(panel.toggle()).toBe(true);
      expect(panel.open()).toBe(true);
      expect(stored()).toEqual({ open: true, scrollTop: 0 });
      expect(panel.toggle()).toBe(true);
      expect(panel.open()).toBe(false);
      expect(stored()).toEqual({ open: false, scrollTop: 0 });
      panel.close();
      expect(stored()).toEqual({ open: false, scrollTop: 0 });
    });
  });

  it("restores a stored open state", () => {
    storage.setItem(KEY, JSON.stringify({ open: true, scrollTop: 0 }));
    withPanel((panel) => {
      expect(panel.open()).toBe(true);
      // Initialization does not rewrite the stored value.
      expect(stored()).toEqual({ open: true, scrollTop: 0 });
    });
  });

  it("ignores malformed stored values", () => {
    storage.setItem(KEY, "not-a-boolean");
    withPanel((panel) => {
      expect(panel.open()).toBe(false);
    });
  });

  it("round-trips the scroll offset across controller instances", () => {
    withPanel((panel) => {
      panel.toggle();
      panel.setScrollTop(120);
      expect(panel.scrollTop()).toBe(120);
      expect(stored()).toEqual({ open: true, scrollTop: 120 });
    });
    withPanel((panel) => {
      expect(panel.open()).toBe(true);
      expect(panel.scrollTop()).toBe(120);
    });
  });

  it("keeps the scroll offset when the pane closes", () => {
    withPanel((panel) => {
      panel.toggle();
      panel.setScrollTop(200);
      panel.close();
      expect(panel.open()).toBe(false);
      expect(panel.scrollTop()).toBe(200);
      expect(stored()).toEqual({ open: false, scrollTop: 200 });
    });
  });

  it("reads the legacy bare boolean and upgrades it on the next write", () => {
    storage.setItem(KEY, "true");
    withPanel((panel) => {
      expect(panel.open()).toBe(true);
      expect(panel.scrollTop()).toBe(0);
      panel.setScrollTop(48);
      expect(stored()).toEqual({ open: true, scrollTop: 48 });
    });
    storage.setItem(KEY, "false");
    withPanel((panel) => {
      expect(panel.open()).toBe(false);
      expect(panel.scrollTop()).toBe(0);
    });
  });

  it("falls back to closed and zero for malformed JSON shapes", () => {
    for (const raw of ["null", "[]", '"open"', "{oops"]) {
      storage.setItem(KEY, raw);
      withPanel((panel) => {
        expect(panel.open()).toBe(false);
        expect(panel.scrollTop()).toBe(0);
      });
    }
    storage.setItem(KEY, JSON.stringify({ open: "yes", scrollTop: -10 }));
    withPanel((panel) => {
      expect(panel.open()).toBe(false);
      expect(panel.scrollTop()).toBe(0);
    });
    storage.setItem(KEY, JSON.stringify({ open: true, scrollTop: "9" }));
    withPanel((panel) => {
      expect(panel.open()).toBe(true);
      expect(panel.scrollTop()).toBe(0);
    });
  });

  it("sanitizes non-finite and negative scroll offsets", () => {
    withPanel((panel) => {
      panel.toggle();
      panel.setScrollTop(Number.NaN);
      expect(panel.scrollTop()).toBe(0);
      panel.setScrollTop(-5);
      expect(panel.scrollTop()).toBe(0);
      panel.setScrollTop(Number.POSITIVE_INFINITY);
      expect(panel.scrollTop()).toBe(0);
      expect(stored()).toEqual({ open: true, scrollTop: 0 });
    });
  });

  it("keeps working when localStorage throws", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get(): never {
        throw new Error("storage blocked");
      },
    });
    withPanel((panel) => {
      expect(panel.open()).toBe(false);
      expect(panel.scrollTop()).toBe(0);
      expect(panel.toggle()).toBe(true);
      expect(panel.open()).toBe(true);
      panel.setScrollTop(64);
      expect(panel.scrollTop()).toBe(64);
      panel.close();
      expect(panel.open()).toBe(false);
    });
  });
});
