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
      expect(storage.getItem(KEY)).toBeNull();
      expect(panel.toggle()).toBe(true);
      expect(panel.open()).toBe(true);
      expect(storage.getItem(KEY)).toBe("true");
      expect(panel.toggle()).toBe(true);
      expect(panel.open()).toBe(false);
      expect(storage.getItem(KEY)).toBe("false");
      panel.close();
      expect(storage.getItem(KEY)).toBe("false");
    });
  });

  it("restores a stored open state", () => {
    storage.setItem(KEY, "true");
    withPanel((panel) => {
      expect(panel.open()).toBe(true);
      // Initialization does not rewrite the stored value.
      expect(storage.getItem(KEY)).toBe("true");
    });
  });

  it("ignores malformed stored values", () => {
    storage.setItem(KEY, "not-a-boolean");
    withPanel((panel) => {
      expect(panel.open()).toBe(false);
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
      expect(panel.toggle()).toBe(true);
      expect(panel.open()).toBe(true);
      panel.close();
      expect(panel.open()).toBe(false);
    });
  });
});
