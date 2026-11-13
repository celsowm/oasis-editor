import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
  type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";
import {
  usePopoverPosition,
  type PopoverPlacement,
} from "./usePopoverPosition.js";
import { PopoverBranchContext } from "./popoverBranch.js";
import type { PopoverBranch } from "./popoverBranch.js";
import { useDismiss } from "./useDismiss.js";

export interface PopoverTriggerApi {
  /** Attach to the element that the panel should be anchored/positioned to. */
  ref: (el: HTMLElement) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Revoking availability closes an open panel and prevents reopening it. */
  disabled?: boolean;
  /** Restore focus when revocation removes the currently focused panel. */
  onUnavailableFocus?: () => void;
  /** Renders the trigger; must attach `api.ref` to the positioning anchor. */
  trigger: (api: PopoverTriggerApi) => JSX.Element;
  children: JSX.Element;
  placement?: PopoverPlacement;
  panelClass?: string;
  panelRole?: JSX.HTMLAttributes<HTMLDivElement>["role"];
  panelTestId?: string;
  /** Reposition tall panels so they remain within the viewport vertically. */
  fitViewport?: boolean;
  onPanelMouseLeave?: () => void;
  closeOnEscape?: boolean;
  /**
   * Keep the panel mounted (hidden) while closed so nested Solid state — e.g.
   * an open sub-menu inside a metrics/table panel — survives reopening.
   */
  keepMounted?: boolean;
}

/**
 * The single portalled popover primitive. Every dropdown / split / color /
 * grid / spacing menu composes this instead of re-implementing portal +
 * positioning + click-outside.
 */
export function Popover(props: PopoverProps): JSX.Element {
  let anchorRef: HTMLElement | undefined;
  let panelRef: HTMLDivElement | undefined;
  createEffect((): void => {
    if (!props.disabled || !props.open) return;
    const hadFocus = panelRef?.contains(document.activeElement);
    props.onOpenChange(false);
    if (hadFocus) props.onUnavailableFocus?.();
  });
  const parent = useContext(PopoverBranchContext);
  const branch: PopoverBranch = {
    open: () => props.open,
    children: new Set(),
    closeAll: (): void => {
      props.onOpenChange(false);
      parent?.closeAll();
    },
    contains: (target) =>
      props.open &&
      Boolean(
        anchorRef?.contains(target) ||
        panelRef?.contains(target) ||
        [...branch.children].some((child) => child.contains(target)),
      ),
  };
  parent?.children.add(branch);
  onCleanup(() => parent?.children.delete(branch));
  createEffect((): void => {
    if (parent && !parent.open() && props.open) props.onOpenChange(false);
  });
  const hasOpenDescendant = (owner: PopoverBranch): boolean =>
    [...owner.children].some(
      (child) => child.open() || hasOpenDescendant(child),
    );
  const [theme, setTheme] = createSignal<string>();
  const [themeStyle, setThemeStyle] = createSignal<JSX.CSSProperties>({});

  // Portals leave the editor DOM subtree. Carry the owning instance's tokens,
  // including host overrides, rather than inheriting another editor's theme.
  createEffect((): void => {
    if (!props.open || !anchorRef) return;
    const anchor = anchorRef;
    const owner = anchor.closest<HTMLElement>("[data-theme]");
    const syncTheme = (): void => {
      const computed = getComputedStyle(anchor);
      const values: Record<string, string> = {};
      for (const property of Array.from(computed)) {
        if (property.startsWith("--oasis-"))
          values[property] = computed.getPropertyValue(property);
      }
      values["color-scheme"] = computed.colorScheme;
      setTheme(owner?.dataset.theme);
      setThemeStyle(values);
    };
    syncTheme();
    if (!owner) return;
    const observer = new MutationObserver(syncTheme);
    observer.observe(owner, {
      attributes: true,
      attributeFilter: ["data-theme", "style", "class"],
    });
    onCleanup(() => observer.disconnect());
  });

  const coords = usePopoverPosition({
    anchor: (): HTMLElement | undefined => anchorRef,
    panel: (): HTMLDivElement | undefined => panelRef,
    open: (): boolean => props.open,
    placement: props.placement,
    fitViewport: props.fitViewport,
  });

  useDismiss({
    refs: () => [anchorRef, panelRef],
    open: (): boolean => props.open,
    isInside: branch.contains,
    canDismissOnEscape: () => !hasOpenDescendant(branch),
    onDismiss: (reason): void => {
      props.onOpenChange(false);
      if (reason === "escape")
        queueMicrotask(() => {
          const button = anchorRef?.matches("button")
            ? anchorRef
            : anchorRef?.querySelector<HTMLElement>("button");
          button?.focus({ preventScroll: true });
        });
    },
    closeOnEscape: props.closeOnEscape,
  });

  // Arrow-key traversal inside menu-like panels. Tab already moves through the
  // panel; Office menus also respond to Up/Down/Home/End, and users expect that
  // from a control announced with aria-haspopup="menu". Text fields and
  // selects keep their own caret/selection keys.
  const menuItems = (): HTMLElement[] => {
    if (!panelRef) return [];
    return Array.from(
      panelRef.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [role="menuitem"]:not([aria-disabled="true"])',
      ),
    ).filter((element) => !element.closest('[aria-hidden="true"]'));
  };

  const handleMenuKeyDown = (event: KeyboardEvent): void => {
    if (props.panelRole !== "menu") return;
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey
    )
      return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']"))
      return;
    const items = menuItems();
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const index = active ? items.indexOf(active) : -1;
    const nextIndex = (step: number): number =>
      index < 0
        ? step > 0
          ? 0
          : items.length - 1
        : (index + step + items.length) % items.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[nextIndex(1)]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[nextIndex(-1)]?.focus();
        break;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      default:
        break;
    }
  };

  const panel = (portalled: boolean): JSX.Element => (
    <div
      ref={panelRef}
      class={props.panelClass}
      role={props.panelRole}
      data-testid={props.panelTestId}
      onKeyDown={handleMenuKeyDown}
      style={
        portalled
          ? {
              position: "absolute",
              top: `${coords().top}px`,
              left: `${coords().left}px`,
            }
          : { display: "none" }
      }
      aria-hidden={portalled ? undefined : "true"}
      onMouseLeave={props.onPanelMouseLeave}
    >
      <PopoverBranchContext.Provider value={branch}>
        {props.children}
      </PopoverBranchContext.Provider>
    </div>
  );

  return (
    <>
      {props.trigger({
        ref: (el): HTMLElement => (anchorRef = el),
        open: props.open,
        setOpen: (next): void => {
          if (!next || !props.disabled) props.onOpenChange(next);
        },
        toggle: (): void => {
          if (!props.disabled) props.onOpenChange(!props.open);
        },
      })}
      <Show when={props.open}>
        <Portal>
          <div
            class="oasis-editor-portal-theme"
            data-theme={theme()}
            style={themeStyle()}
          >
            {panel(true)}
          </div>
        </Portal>
      </Show>
      <Show when={!props.open && props.keepMounted}>{panel(false)}</Show>
    </>
  );
}
