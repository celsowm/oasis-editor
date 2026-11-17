import { createEffect, onCleanup, type Accessor } from "solid-js";

export interface DismissOptions {
  /** Anchor first, followed by the panel(s). Refs may be portalled. */
  refs: Accessor<Array<HTMLElement | undefined>>;
  open: Accessor<boolean>;
  onDismiss: (reason: "outside" | "escape") => void;
  isInside?: (target: Node) => boolean;
  canDismissOnEscape?: () => boolean;
  /** Dismiss when Escape is pressed. Defaults to true. */
  closeOnEscape?: boolean;
}

const registries = new WeakMap<Window, Set<DismissOptions>>();

function inside(surface: DismissOptions, node: Node): boolean {
  return surface.refs().some(el => el?.contains(node)) || Boolean(surface.isInside?.(node));
}

/** A portalled child still belongs to the surface containing its anchor.
 * This also handles compact Ribbon overflow, whose items are reparented
 * imperatively rather than rendered in a PopoverBranch context. */
function containsBranch(surface: DismissOptions, nodes: Node[], active: DismissOptions[], visited = new Set<DismissOptions>()): boolean {
  if (visited.has(surface)) return false;
  visited.add(surface);
  if (nodes.some(node => inside(surface, node))) return true;
  return active.some(child => {
    if (child === surface || visited.has(child)) return false;
    const anchor = child.refs()[0];
    return Boolean(anchor && inside(surface, anchor) && containsBranch(child, nodes, active, visited));
  });
}

function register(win: Window, surface: DismissOptions): () => void {
  let registry = registries.get(win);
  if (!registry) {
    registry = new Set<DismissOptions>();
    registries.set(win, registry);
  }
  const entries = registry;
  // Each open surface carries its own cleanup. Attach a single dispatch
  // listener per window and retain its identity for the last cleanup.
  const handlers = windowHandlers.get(win) ?? {
    pointer: (event: Event): void => {
      const active = [...entries].filter(item => item.open());
      const path = event.composedPath();
      const candidates = path.length ? path : [event.target];
      const nodes = candidates.filter((node): node is Node =>
        node != null && typeof (node as Node).nodeType === "number");
      if (!nodes.length) return;
      // Resolve all containment before a close unmounts a portalled child.
      const outside = active.filter(item => !containsBranch(item, nodes, active)).reverse();
      for (const item of outside) if (entries.has(item) && item.open()) item.onDismiss("outside");
    },
    key: (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      const active = [...entries].filter(item => item.open());
      const top = active[active.length - 1];
      if (!top || top.closeOnEscape === false || top.canDismissOnEscape?.() === false) return;
      event.preventDefault();
      top.onDismiss("escape");
    },
  };
  if (!entries.size) {
    windowHandlers.set(win, handlers);
    // Canvas prevents pointerdown's default action to own the caret. That
    // suppresses compatibility mousedown events. Capture the actual pointer
    // before the editor or a host widget can cancel or stop it. Keep mousedown
    // as a fallback for legacy/synthetic mouse-only consumers.
    win.addEventListener("pointerdown", handlers.pointer, true);
    win.addEventListener("mousedown", handlers.pointer, true);
    win.addEventListener("keydown", handlers.key);
  }
  entries.add(surface);
  return () => {
    entries.delete(surface);
    if (entries.size) return;
    win.removeEventListener("pointerdown", handlers.pointer, true);
    win.removeEventListener("mousedown", handlers.pointer, true);
    win.removeEventListener("keydown", handlers.key);
    registries.delete(win);
    windowHandlers.delete(win);
  };
}

const windowHandlers = new WeakMap<Window, {
  pointer: (event: Event) => void;
  key: (event: KeyboardEvent) => void;
}>();

/** Shared non-modal dismissal. Never prevent or stop pointer events: the
 * first outside click must still reach its intended target. */
export function useDismiss(options: DismissOptions): void {
  createEffect((): void => {
    if (!options.open()) return;
    const win = options.refs().find(Boolean)?.ownerDocument.defaultView ?? window;
    onCleanup(register(win, options));
  });
}
