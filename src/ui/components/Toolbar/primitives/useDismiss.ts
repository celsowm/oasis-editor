import { createEffect, onCleanup, type Accessor } from "solid-js";

export interface DismissOptions {
  /** Elements that should NOT trigger a dismiss when clicked (anchor + panel). */
  refs: Accessor<Array<HTMLElement | undefined>>;
  open: Accessor<boolean>;
  onDismiss: () => void;
  /** Dismiss when Escape is pressed. Defaults to true. */
  closeOnEscape?: boolean;
}

/**
 * Click-outside + Escape dismissal for popovers. Listeners are attached only
 * while `open` is true. Replaces the per-component `handleClickOutside` copies.
 */
export function useDismiss(options: DismissOptions): void {
  const handlePointer = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const inside = options
      .refs()
      .some((el) => el != null && el.contains(target));
    if (!inside) {
      options.onDismiss();
    }
  };

  const handleKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      options.onDismiss();
    }
  };

  createEffect(() => {
    if (!options.open()) {
      return;
    }
    window.addEventListener("mousedown", handlePointer);
    if (options.closeOnEscape ?? true) {
      window.addEventListener("keydown", handleKey);
    }
    onCleanup(() => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    });
  });
}
