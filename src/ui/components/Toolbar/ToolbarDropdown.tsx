import { createSignal, onCleanup, onMount, Show, type JSX, createEffect } from "solid-js";
import { Portal } from "solid-js/web";

export interface ToolbarDropdownProps {
  label: string;
  icon: string;
  children: JSX.Element;
  tooltip?: string;
  testId?: string;
  hideChevron?: boolean;
  menuClass?: string;
}

export function ToolbarDropdown(props: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const ariaLabel = () => (props as any)["aria-label"] || props.tooltip || props.label || "";

  const updateCoords = () => {
    if (buttonRef && isOpen()) {
      const rect = buttonRef.getBoundingClientRect();
      const menuWidth = menuRef?.offsetWidth || 240;
      const viewportPadding = 8;
      const preferredLeft = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - menuWidth - viewportPadding;
      setCoords({
        top: rect.bottom + window.scrollY,
        left: Math.max(window.scrollX + viewportPadding, Math.min(preferredLeft, maxLeft)),
      });
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (buttonRef && !buttonRef.contains(event.target as Node) && 
        menuRef && !menuRef.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  createEffect(() => {
    if (isOpen()) {
      updateCoords();
      requestAnimationFrame(updateCoords);
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    } else {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    }
  });

  onMount(() => {
    window.addEventListener("mousedown", handleClickOutside);
  });

  onCleanup(() => {
    window.removeEventListener("mousedown", handleClickOutside);
    window.removeEventListener("resize", updateCoords);
    window.removeEventListener("scroll", updateCoords, true);
  });

  return (
    <div class="oasis-editor-toolbar-dropdown">
      <button
        ref={buttonRef}
        type="button"
        class="oasis-editor-tool-button oasis-editor-tool-button-dropdown"
        classList={{ "oasis-editor-tool-button-active": isOpen() }}
        onClick={() => setIsOpen(!isOpen())}
        title={props.tooltip}
        aria-label={ariaLabel()}
        data-testid={props.testId}
      >
        <i data-lucide={props.icon} />
        <Show when={props.label}>
          <span class="oasis-editor-tool-button-label">{props.label}</span>
        </Show>
        <Show when={!props.hideChevron}>
          <i data-lucide="chevron-down" class="oasis-editor-dropdown-chevron" />
        </Show>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            class={`oasis-editor-toolbar-dropdown-menu ${props.menuClass || ""}`}
            style={{
              position: "absolute",
              top: `${coords().top + 4}px`,
              left: `${coords().left}px`,
            }}
            onClick={(e) => {
               // Close if a button inside is clicked
               if (
                 (e.target as HTMLElement).closest('button') &&
                 !(e.target as HTMLElement).closest(".oasis-editor-toolbar-list-options")
               ) {
                 setIsOpen(false);
               }
            }}
          >
            {props.children}
          </div>
        </Portal>
      </Show>
    </div>
  );
}
