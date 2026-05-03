import { createEffect, createSignal, onMount, on } from "solid-js";
import { unwrap } from "solid-js/store";
import { persistenceService } from "../services/PersistenceService.js";
import { debounce } from "../../utils/throttle.js";
import type { Editor2Document, Editor2State } from "../../core/model.js";

export type PersistenceStatus = "Saved" | "Saving..." | "Error" | "Initial";

export interface UseEditor2PersistenceResult {
  status: () => PersistenceStatus;
}

export function useEditor2Persistence(
  state: Editor2State,
  onLoaded: (doc: Editor2Document) => void,
): UseEditor2PersistenceResult {
  const [status, setStatus] = createSignal<PersistenceStatus>("Initial");
  const [isInitialized, setIsInitialized] = createSignal(false);

  const debouncedSave = debounce(async (doc: Editor2Document) => {
    if (!isInitialized()) return;

    setStatus("Saving...");
    try {
      // unwrap is essential to convert Solid Proxies to plain objects for IndexedDB
      // We also use a deep clone via JSON to be absolutely sure no reactive artifacts or non-serializable
      // properties remain in the object tree.
      const rawDoc = JSON.parse(JSON.stringify(unwrap(doc)));
      await persistenceService.saveDocument(rawDoc);
      setStatus("Saved");
    } catch (err) {
      console.error("Failed to autosave", err);
      setStatus("Error");
    }
  }, 1000);

  // Watch for document changes. We place this at the top level to ensure proper Solid ownership.
  // The check for isInitialized() ensures we don't save during the initial load phase.
  createEffect(
    on(
      () => state.document,
      (doc) => {
        if (isInitialized()) {
          debouncedSave(doc);
        }
      },
      { defer: true },
    ),
  );

  onMount(async () => {
    try {
      const loadedDoc = await persistenceService.loadDocument();
      if (loadedDoc) {
        onLoaded(loadedDoc);
      }
    } catch (err) {
      console.error("Failed to load persisted document", err);
    } finally {
      setIsInitialized(true);
      setStatus("Saved");
    }
  });

  return { status };
}
