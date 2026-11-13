import { Show, createSignal, type JSX } from "solid-js";
import { Popover } from "./Popover.js";
import { DropdownChevron } from "./DropdownChevron.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";

export interface MenuProps {
  icon?: string;
  label?: string;
  tooltip?: string;
  testId?: string;
  active?: boolean;
  disabled?: boolean;
  hideChevron?: boolean;
  ribbonSize?: "normal" | "large";
  /** Extra class for the popover panel. */
  panelClass?: string;
  /** Reposition tall panels so they remain within the viewport vertically. */
  fitViewport?: boolean;
  keepMounted?: boolean;
  /**
   * Role for the trigger button. Nested dropdowns pass `"menuitem"` so the
   * parent `role="menu"` panel only contains menu items (plus its submenu
   * trigger, which is itself a menuitem with `aria-haspopup`).
   */
  role?: JSX.HTMLAttributes<HTMLButtonElement>["role"];
  onOpenChange?: (open: boolean) => void;
  children: JSX.Element;
}

/**
 * A dropdown: an icon/label trigger button that opens a portalled panel.
 * Replaces ToolbarDropdown; built on the shared Popover primitive.
 */
export function Menu(props: MenuProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const updateOpen = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    props.onOpenChange?.(nextOpen);
  };
  const ariaLabel = (): string => props.tooltip || props.label || "";

  return (
    <div class="oasis-editor-toolbar-dropdown">
      <Popover
        open={open()}
        onOpenChange={updateOpen}
        keepMounted={props.keepMounted}
        fitViewport={props.fitViewport}
        panelRole="menu"
        panelClass={`oasis-editor-toolbar-dropdown-menu ${props.panelClass || ""}`}
        onPanelMouseLeave={undefined}
        trigger={(api): JSX.Element => (
          <button
            ref={(el): void => api.ref(el)}
            type="button"
            class="oasis-editor-tool-button oasis-editor-tool-button-dropdown"
            classList={{
              "oasis-editor-tool-button-active": props.active || api.open,
              "oasis-editor-tool-button-ribbon-large":
                props.ribbonSize === "large",
            }}
            onClick={(): void => api.toggle()}
            disabled={props.disabled}
            title={props.tooltip}
            aria-label={ariaLabel()}
            role={props.role}
            aria-haspopup="menu"
            aria-expanded={api.open}
            data-testid={props.testId}
          >
            <Show when={props.icon}>
              <ToolIcon name={props.icon!} />
            </Show>
            <Show when={props.label}>
              <span class="oasis-editor-tool-button-label">{props.label}</span>
            </Show>
            <Show when={!props.hideChevron}>
              <DropdownChevron />
            </Show>
          </button>
        )}
      >
        <div
          onClick={(event): void => {
            // Close when an actionable button inside is clicked, but keep open
            // for nested menu triggers and inline list-option panels.
            const el = event.target as HTMLElement;
            const button = el.closest("button");
            if (
              button &&
              !button.hasAttribute("aria-haspopup") &&
              !el.closest(".oasis-editor-toolbar-list-options")
            ) {
              setOpen(false);
            }
          }}
        >
          {props.children}
        </div>
      </Popover>
    </div>
  );
}
