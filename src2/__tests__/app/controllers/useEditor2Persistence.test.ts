import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import "fake-indexeddb/auto";
import { useEditor2Persistence } from "../../../app/controllers/useEditor2Persistence.js";
import { persistenceService } from "../../../app/services/PersistenceService.js";

describe("useEditor2Persistence", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const req = indexedDB.deleteDatabase("oasis-editor-2-db");
    await new Promise((resolve) => {
      req.onsuccess = resolve;
      req.onerror = resolve;
    });
  });

  afterEach(() => {
    persistenceService.close();
    vi.useRealTimers();
  });

  it("should load document on mount", async () => {
    const mockDoc = { id: "saved-doc", blocks: [] };
    const loadSpy = vi.spyOn(persistenceService, "loadDocument").mockResolvedValue(mockDoc as any);
    const onLoaded = vi.fn();
    
    await createRoot(async (dispose) => {
      useEditor2Persistence({ document: {} } as any, onLoaded);
      
      // Wait for onMount async logic
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(loadSpy).toHaveBeenCalled();
      expect(onLoaded).toHaveBeenCalledWith(mockDoc);
      dispose();
    });
  });

  it("should save document when it changes after initialization", async () => {
    const [doc, setDoc] = createSignal({ id: "doc1" });
    const state = { get document() { return doc(); } };
    const saveSpy = vi.spyOn(persistenceService, "saveDocument").mockResolvedValue(undefined);
    
    await createRoot(async (dispose) => {
      useEditor2Persistence(state as any, vi.fn());
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Now use fake timers for the debounce part
      vi.useFakeTimers();
      
      // Change state
      setDoc({ id: "doc2" } as any);
      
      // Wait for debounce timer (1000ms)
      await vi.advanceTimersByTimeAsync(1000);
      
      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ id: "doc2" }));
      dispose();
    });
  });

  it("should not save document during initial load", async () => {
    const saveSpy = vi.spyOn(persistenceService, "saveDocument");
    
    await createRoot(async (dispose) => {
      useEditor2Persistence({ document: { id: "initial" } } as any, vi.fn());
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(saveSpy).not.toHaveBeenCalled();
      dispose();
    });
  });
});
