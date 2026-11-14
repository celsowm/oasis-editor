import { createSignal } from "solid-js";

/**
 * The Reviewing Pane's open state. Kept separate from comment-panel state so
 * the two drawers are independent, mirroring Word's distinct panes.
 */
export function createRevisionsPanel(): {
  open: () => boolean;
  toggle: () => boolean;
  close: () => void;
} {
  const [open, setOpen] = createSignal(false);
  return {
    open: (): boolean => open(),
    toggle: (): boolean => {
      setOpen((value): boolean => !value);
      return true;
    },
    close: (): void => {
      setOpen(false);
    },
  };
}

export type RevisionsPanelController = ReturnType<typeof createRevisionsPanel>;
