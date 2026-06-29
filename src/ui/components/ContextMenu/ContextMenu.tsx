import { For, Show, createEffect, onCleanup, onMount } from "solid-js";
import "./ContextMenu.css";
import { JSX } from "solid-js";

export interface ContextMenuItem {
  id: string;
  type?: "item" | "separator";
  label?: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  testId?: string;
  onSelect?: () => void;
}

export interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu(props: ContextMenuProps): JSX.Element {
  let menuRef: HTMLDivElement | undefined;

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!props.isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
    }
  };

  const handleWindowMouseDown = (event: MouseEvent): void => {
    if (!props.isOpen) return;
    if (
      menuRef &&
      event.target instanceof Node &&
      menuRef.contains(event.target)
    ) {
      return;
    }
    props.onClose();
  };

  const handleWindowContextMenu = (event: MouseEvent): void => {
    if (!props.isOpen) return;
    if (
      menuRef &&
      event.target instanceof Node &&
      menuRef.contains(event.target)
    ) {
      return;
    }
    props.onClose();
  };

  const handleScroll = (): void => {
    if (props.isOpen) props.onClose();
  };

  onMount((): void => {
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("mousedown", handleWindowMouseDown, true);
    window.addEventListener("contextmenu", handleWindowContextMenu, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll, true);
  });

  onCleanup((): void => {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("mousedown", handleWindowMouseDown, true);
    window.removeEventListener("contextmenu", handleWindowContextMenu, true);
    window.removeEventListener("scroll", handleScroll, true);
    window.removeEventListener("resize", handleScroll, true);
  });

  // Clamp position within viewport once the menu has rendered.
  createEffect((): void => {
    if (!props.isOpen || !menuRef) return;
    const rect = menuRef.getBoundingClientRect();
    const maxLeft = Math.max(4, window.innerWidth - rect.width - 4);
    const maxTop = Math.max(4, window.innerHeight - rect.height - 4);
    const left = Math.min(props.x, maxLeft);
    const top = Math.min(props.y, maxTop);
    menuRef.style.left = `${left}px`;
    menuRef.style.top = `${top}px`;
  });

  return (
    <Show when={props.isOpen}>
      <div
        ref={menuRef}
        class="oasis-editor-context-menu"
        role="menu"
        data-testid="editor-context-menu"
        style={{ left: `${props.x}px`, top: `${props.y}px` }}
        onContextMenu={(event): void => event.preventDefault()}
      >
        <For each={props.items}>
          {(item): JSX.Element => (
            <Show
              when={item.type !== "separator"}
              fallback={<div class="oasis-editor-context-menu-separator" />}
            >
              <button
                type="button"
                class="oasis-editor-context-menu-item"
                role="menuitem"
                disabled={item.disabled}
                data-testid={item.testId}
                onClick={(): void => {
                  if (item.disabled) return;
                  item.onSelect?.();
                  props.onClose();
                }}
              >
                <Show
                  when={item.icon}
                  fallback={
                    <i style={{ visibility: "hidden" }} data-lucide="check" />
                  }
                >
                  <i data-lucide={item.icon} />
                </Show>
                <span class="oasis-editor-context-menu-label">
                  {item.label}
                </span>
                <Show when={item.shortcut}>
                  <span class="oasis-editor-context-menu-shortcut">
                    {item.shortcut}
                  </span>
                </Show>
              </button>
            </Show>
          )}
        </For>
      </div>
    </Show>
  );
}
