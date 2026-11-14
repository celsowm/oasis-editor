import { createSignal } from "solid-js";

const STORAGE_KEY = "oasis-reviewing-pane-v1";

function readStored(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === "true";
  } catch {
    // Storage can be disabled (private mode); default to closed.
    return false;
  }
}

function writeStored(open: boolean): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, String(open));
  } catch {
    // Persistence is best-effort; the toggle still works for the session.
  }
}

/**
 * The Reviewing Pane's open state. Kept separate from comment-panel state so
 * the two drawers are independent, mirroring Word's distinct panes. Persisted
 * to localStorage (`oasis-reviewing-pane-v1`) so pane visibility survives
 * reloads, like Word's reviewing pane. Writes happen in the mutators rather
 * than an effect so the stored value is exact even outside a reactive root.
 */
export function createRevisionsPanel(): {
  open: () => boolean;
  toggle: () => boolean;
  close: () => void;
} {
  const [open, setOpen] = createSignal(readStored());
  const update = (value: boolean): void => {
    setOpen(value);
    writeStored(value);
  };
  return {
    open: (): boolean => open(),
    toggle: (): boolean => {
      update(!open());
      return true;
    },
    close: (): void => {
      update(false);
    },
  };
}

export type RevisionsPanelController = ReturnType<typeof createRevisionsPanel>;
