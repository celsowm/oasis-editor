import { createEffect, createSignal, onMount, on } from "solid-js";
import { unwrap } from "solid-js/store";
import { debounce } from "@/utils/throttle.js";
import type { EditorDocument, EditorState } from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";

/** Current persistence status indicator. */
export type PersistenceStatus = "Saved" | "Saving..." | "Error" | "Initial";

/** Return value of the {@link useEditorPersistence} hook. */
export interface UseEditorPersistenceResult {
  status: () => PersistenceStatus;
}

/** Minimal persistence interface for saving and loading documents. */
export interface DocumentPersistence {
  saveDocument(doc: EditorDocument): Promise<void>;
  loadDocument(): Promise<EditorDocument | null>;
}

/**
 * SolidJS hook that manages auto-saving the editor document via a persistence backend.
 * @param state - The editor state to watch for changes.
 * @param onLoaded - Callback invoked when a previously saved document is loaded.
 * @param options - Configuration including the persistence backend and logger.
 * @returns The persistence status.
 */
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
      const rawDoc = JSON.parse(JSON.stringify(unwrap(doc)));
      await persistence.saveDocument(rawDoc);
      setStatus("Saved");
    } catch (err) {
      options.logger?.error("persistence:autosave failed", err);
      setStatus("Error");
    }
  }, 1000);

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
