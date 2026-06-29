import { type JSX } from "solid-js";
import { Popover } from "./Popover.js";

type PanelRole = JSX.HTMLAttributes<HTMLDivElement>["role"];

export interface SplitButtonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tooltip?: string;
  rootClass?: string;
  rootActive?: boolean;
  /** Main (left) button. */
  mainContent: JSX.Element;
  mainTestId?: string;
  mainAriaLabel?: string;
  mainPressed?: boolean;
  onMain: () => void;
  /** Chevron (right) button. */
  menuTestId?: string;
  menuAriaLabel?: string;
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
  return (
    <Popover
      open={props.open}
      onOpenChange={props.onOpenChange}
      panelClass={props.panelClass}
      panelRole={props.panelRole}
      onPanelMouseLeave={props.onPanelMouseLeave}
      trigger={(api): JSX.Element => (
        <div
          ref={(el): void => api.ref(el)}
          class={props.rootClass ?? "oasis-editor-color-split"}
          classList={{
            "oasis-editor-color-split-active": props.rootActive ?? api.open,
          }}
          title={props.tooltip}
        >
          <button
            type="button"
            class="oasis-editor-color-split-main"
            data-testid={props.mainTestId}
            aria-label={props.mainAriaLabel ?? props.tooltip}
            aria-pressed={props.mainPressed}
            onClick={(): void => props.onMain()}
          >
            {props.mainContent}
          </button>
          <button
            type="button"
            class="oasis-editor-color-split-menu-button"
            classList={{ "oasis-editor-color-split-open": api.open }}
            data-testid={props.menuTestId}
            aria-label={props.menuAriaLabel ?? `${props.tooltip ?? ""} menu`}
            aria-haspopup="menu"
            aria-expanded={api.open}
            onClick={(): void => api.toggle()}
          >
            <i data-lucide="chevron-down" />
          </button>
        </div>
      )}
    >
      {props.children}
    </Popover>
  );
}
