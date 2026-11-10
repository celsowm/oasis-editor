import { createEffect, onCleanup, type Accessor } from "solid-js";

export interface DismissOptions {
  /** Elements that should NOT trigger a dismiss when clicked (anchor + panel). */
  refs: Accessor<Array<HTMLElement | undefined>>;
  open: Accessor<boolean>;
  onDismiss: (reason: "outside" | "escape") => void;
  isInside?: (target: Node) => boolean;
  canDismissOnEscape?: () => boolean;
  /** Dismiss when Escape is pressed. Defaults to true. */
  closeOnEscape?: boolean;
}

/**
 * Click-outside + Escape dismissal for popovers. Listeners are attached only
 * while `open` is true. Replaces the per-component `handleClickOutside` copies.
 */
export function useDismiss(options: DismissOptions): void {
  const handlePointer = (event: MouseEvent): void => {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const inside = options
      .refs()
      .some((el): boolean => el != null && el.contains(target));
    if (!inside && !options.isInside?.(target)) {
      options.onDismiss("outside");
    }
  };

  const handleKey = (event: KeyboardEvent): void => {
    if (
      event.key === "Escape" &&
      !event.defaultPrevented &&
      (options.canDismissOnEscape?.() ?? true)
    ) {
      event.preventDefault();
      options.onDismiss("escape");
    }
  };

  createEffect((): void => {
    if (!options.open()) {
      return;
    }
    window.addEventListener("mousedown", handlePointer);
    if (options.closeOnEscape ?? true) {
      window.addEventListener("keydown", handleKey);
    }
    onCleanup((): void => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    });
  });
}
