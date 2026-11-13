import { Show, type JSX } from "solid-js";
import { Popover } from "./Popover.js";
import { DropdownChevron } from "./DropdownChevron.js";

type PanelRole = JSX.HTMLAttributes<HTMLDivElement>["role"];

export interface SplitButtonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tooltip?: string;
  rootClass?: string;
  rootActive?: boolean;
  ribbonSize?: "normal" | "large";
  /** Main (left) button. */
  mainContent: JSX.Element;
  mainLabel?: string;
  mainTestId?: string;
  mainAriaLabel?: string;
  mainPressed?: boolean;
  mainDisabled?: boolean;
  onMain: () => void;
  /** Chevron (right) button. */
  menuTestId?: string;
  menuAriaLabel?: string;
  menuDisabled?: boolean;
  onUnavailableFocus?: () => void;
  /** Popover panel. */
  panelClass?: string;
  panelRole?: PanelRole;
  onPanelMouseLeave?: () => void;
  children: JSX.Element;
}

/**
 * Split button: a main action button plus a chevron that opens a popover.
 * Backs the underline and color controls (same markup/classes preserved).
 */
export function SplitButton(props: SplitButtonProps): JSX.Element {
  // The chevron is a separate control; give it a name that does not collapse to
  // " menu" when the caller only supplied a label.
  const menuLabel = (): string => {
    if (props.menuAriaLabel) return props.menuAriaLabel;
    const base = props.mainAriaLabel ?? props.tooltip ?? props.mainLabel ?? "";
    return base ? `${base} menu` : "menu";
  };
  return (
    <Popover
      open={props.open}
      onOpenChange={props.onOpenChange}
      disabled={props.menuDisabled}
      onUnavailableFocus={props.onUnavailableFocus}
      panelClass={props.panelClass}
      panelRole={props.panelRole}
      onPanelMouseLeave={props.onPanelMouseLeave}
      trigger={(api): JSX.Element => (
        <div
          ref={(el): void => api.ref(el)}
          class={props.rootClass ?? "oasis-editor-color-split"}
          classList={{
            "oasis-editor-color-split-active": props.rootActive ?? api.open,
            "oasis-editor-color-split-ribbon-large":
              props.ribbonSize === "large",
          }}
          title={props.tooltip}
        >
          <button
            type="button"
            class="oasis-editor-color-split-main"
            data-testid={props.mainTestId}
            aria-label={props.mainAriaLabel ?? props.tooltip}
            aria-pressed={props.mainPressed}
            disabled={props.mainDisabled}
            onClick={(): void => props.onMain()}
          >
            {props.mainContent}
            <Show when={props.mainLabel}>
              <span class="oasis-editor-color-split-label">
                {props.mainLabel}
              </span>
            </Show>
          </button>
          <button
            type="button"
            class="oasis-editor-color-split-menu-button"
            classList={{ "oasis-editor-color-split-open": api.open }}
            data-testid={props.menuTestId}
            aria-label={menuLabel()}
            aria-haspopup="menu"
            aria-expanded={api.open}
            disabled={props.menuDisabled}
            onClick={(): void => api.toggle()}
          >
            <Show when={props.mainLabel}>
              <span class="oasis-editor-color-split-menu-label">
                {props.mainLabel}
              </span>
            </Show>
            <DropdownChevron />
          </button>
        </div>
      )}
    >
      {props.children}
    </Popover>
  );
}
