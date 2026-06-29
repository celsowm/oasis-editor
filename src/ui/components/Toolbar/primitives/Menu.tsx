import { Show, createSignal, type JSX } from "solid-js";
import { Popover } from "./Popover.js";

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
  keepMounted?: boolean;
  children: JSX.Element;
}

/**
 * A dropdown: an icon/label trigger button that opens a portalled panel.
 * Replaces ToolbarDropdown; built on the shared Popover primitive.
 */
export function Menu(props: MenuProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const ariaLabel = (): string => props.tooltip || props.label || "";

  return (
    <div class="oasis-editor-toolbar-dropdown">
      <Popover
        open={open()}
        onOpenChange={setOpen}
        keepMounted={props.keepMounted}
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
            aria-haspopup="menu"
            aria-expanded={api.open}
            data-testid={props.testId}
          >
            <Show when={props.icon}>
              <i data-lucide={props.icon} />
            </Show>
            <Show when={props.label}>
              <span class="oasis-editor-tool-button-label">{props.label}</span>
            </Show>
            <Show when={!props.hideChevron}>
              <i
                data-lucide="chevron-down"
                class="oasis-editor-dropdown-chevron"
              />
            </Show>
          </button>
        )}
      >
        <div
          onClick={(event): void => {
            // Close when an actionable button inside is clicked, but keep open
            // for nested dropdowns and inline list-option panels.
            const el = event.target as HTMLElement;
            if (
              el.closest("button") &&
              !el.closest(".oasis-editor-tool-button-dropdown") &&
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
