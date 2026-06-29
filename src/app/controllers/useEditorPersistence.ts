import { createEffect, createSignal, onMount, on } from "solid-js";
import { unwrap } from "solid-js/store";
import { debounce } from "@/utils/throttle.js";
import type { EditorDocument, EditorState } from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";

export type PersistenceStatus = "Saved" | "Saving..." | "Error" | "Initial";

export interface UseEditorPersistenceResult {
  status: () => PersistenceStatus;
}

export interface DocumentPersistence {
  saveDocument(doc: EditorDocument): Promise<void>;
  loadDocument(): Promise<EditorDocument | null>;
}

export function useEditorPersistence(
  state: EditorState,
  onLoaded: (doc: EditorDocument) => void,
  options: {
    enabled?: boolean;
    persistence: DocumentPersistence;
    logger?: Pick<EditorLogger, "error">;
  },
): UseEditorPersistenceResult {
  const [status, setStatus] = createSignal<PersistenceStatus>("Initial");
  const [isInitialized, setIsInitialized] = createSignal(false);

  const isEnabled = (): boolean => options.enabled ?? false;
  const persistence = options.persistence;

  const debouncedSave = debounce(async (doc: EditorDocument): Promise<void> => {
    if (!isEnabled() || !isInitialized()) return;

    setStatus("Saving...");
    try {
      // unwrap is essential to convert Solid Proxies to plain objects for IndexedDB
      // We also use a deep clone via JSON to be absolutely sure no reactive artifacts or non-serializable
      // properties remain in the object tree.
      const rawDoc = JSON.parse(JSON.stringify(unwrap(doc)));
      await persistence.saveDocument(rawDoc);
      setStatus("Saved");
    } catch (err) {
      options.logger?.error("persistence:autosave failed", err);
      setStatus("Error");
    }
  }, 1000);

  // Watch for document changes. We place this at the top level to ensure proper Solid ownership.
  // The check for isInitialized() ensures we don't save during the initial load phase.
  createEffect(
    on(
      (): EditorDocument => state.document,
      (doc): void => {
        if (isEnabled() && isInitialized()) {
          debouncedSave(doc);
        }
      },
      { defer: true },
    ),
  );

  onMount(async (): Promise<void> => {
    if (!isEnabled()) {
      setIsInitialized(true);
      setStatus("Saved");
      return;
    }

    try {
      const loadedDoc = await persistence.loadDocument();
      if (loadedDoc) {
        onLoaded(loadedDoc);
      }
    } catch (err) {
      options.logger?.error("persistence:load failed", err);
    } finally {
      setIsInitialized(true);
      setStatus("Saved");
    }
  });

  return { status };
}
