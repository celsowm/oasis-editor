import { createSignal, onCleanup, onMount, Show, type JSX, createEffect } from "solid-js";
import { Portal } from "solid-js/web";

export interface ToolbarDropdownProps {
  label: string;
  icon: string;
  children: JSX.Element;
  tooltip?: string;
  testId?: string;
}

export function ToolbarDropdown(props: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const updateCoords = () => {
    if (buttonRef && isOpen()) {
      const rect = buttonRef.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
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
    <div class="oasis-editor-2-toolbar-dropdown">
      <button
        ref={buttonRef}
        type="button"
        class="oasis-editor-2-tool-button oasis-editor-2-tool-button-dropdown"
        classList={{ "oasis-editor-2-tool-button-active": isOpen() }}
        onClick={() => setIsOpen(!isOpen())}
        title={props.tooltip}
        data-testid={props.testId}
      >
        <i data-lucide={props.icon} />
        <Show when={props.label}>
          <span class="oasis-editor-2-tool-button-label">{props.label}</span>
        </Show>
        <i data-lucide="chevron-down" class="oasis-editor-2-dropdown-chevron" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            class="oasis-editor-2-toolbar-dropdown-menu"
            style={{
              position: "absolute",
              top: `${coords().top + 4}px`,
              left: `${coords().left}px`,
            }}
            onClick={(e) => {
               // Close if a button inside is clicked
               if ((e.target as HTMLElement).closest('button')) {
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
