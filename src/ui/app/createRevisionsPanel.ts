import { createSignal } from "solid-js";

const STORAGE_KEY = "oasis-reviewing-pane-v1";

/** Persisted pane state: visibility plus the revision list's scroll offset. */
interface StoredPanelState {
  open: boolean;
  scrollTop: number;
}

const DEFAULT_STATE: StoredPanelState = { open: false, scrollTop: 0 };

function sanitizeScrollTop(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function readStored(): StoredPanelState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    // Legacy format: a bare "true"/"false" written before scroll state existed.
    if (raw === "true") return { open: true, scrollTop: 0 };
    if (raw === "false") return { open: false, scrollTop: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_STATE;
    }
    const record = parsed as Record<string, unknown>;
    return {
      open: record.open === true,
      scrollTop: sanitizeScrollTop(record.scrollTop),
    };
  } catch {
    // Storage can be disabled (private mode) or hold malformed JSON.
    return DEFAULT_STATE;
  }
}

function writeStored(state: StoredPanelState): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is best-effort; the toggle still works for the session.
  }
}

/**
 * The Reviewing Pane's open state and revision-list scroll offset. Kept
 * separate from comment-panel state so the two drawers are independent,
 * mirroring Word's distinct panes. Persisted to localStorage
 * (`oasis-reviewing-pane-v1`) so both pane visibility and its scroll position
 * survive reloads, like Word's reviewing pane. Writes happen in the mutators
 * rather than an effect so the stored value is exact even outside a reactive
 * root. Older builds stored only `"true"`/`"false"`; that legacy shape is still
 * read (with a zero scroll offset) so upgrading keeps the pane's visibility.
 */
export function createRevisionsPanel(): {
  open: () => boolean;
  toggle: () => boolean;
  close: () => void;
  scrollTop: () => number;
  setScrollTop: (value: number) => void;
} {
  const stored = readStored();
  const [open, setOpen] = createSignal(stored.open);
  const [scrollTop, setScrollTopValue] = createSignal(stored.scrollTop);
  const persist = (): void => {
    writeStored({ open: open(), scrollTop: scrollTop() });
  };
  const update = (value: boolean): void => {
    setOpen(value);
    persist();
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
    scrollTop: (): number => scrollTop(),
    setScrollTop: (value: number): void => {
      const next = sanitizeScrollTop(value);
      if (next === scrollTop()) return;
      setScrollTopValue(next);
      persist();
    },
  };
}

export type RevisionsPanelController = ReturnType<typeof createRevisionsPanel>;
