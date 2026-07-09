import { Show, type JSX } from "solid-js";
import { Popover } from "./Popover.js";
import { DropdownChevron } from "./DropdownChevron.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";

export interface WideMenuButtonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: string;
  label: string;
  tooltip?: string;
  testId?: string;
  active?: boolean;
  disabled?: boolean;
  /** A swatch strip under the icon, e.g. the current border colour. */
  indicatorColor?: string | null;
  panelClass?: string;
  children: JSX.Element;
}

/**
 * A dropdown whose trigger lays icon, label and chevron out on a single
 * horizontal line, sized to span a ribbon group's full height. This is the
 * shape Word gives its Picture Border / Picture Effects / Picture Layout
 * buttons, and it is the third trigger geometry in the toolbar — distinct from
 * the icon-only (`normal`) and icon-above-label (`large`) `Button`s.
 *
 * Unlike `Menu`, no click inside the panel is intercepted: consumers own when
 * the popup closes, which nested flyouts need.
 */
export function WideMenuButton(props: WideMenuButtonProps): JSX.Element {
  return (
    <Popover
      open={props.open}
      onOpenChange={props.onOpenChange}
      panelRole="menu"
      panelClass={`oasis-editor-color-menu ${props.panelClass ?? ""}`}
      trigger={(api): JSX.Element => (
        <button
          ref={(el): void => api.ref(el)}
          type="button"
          class="oasis-editor-tool-button oasis-editor-wide-menu-button"
          classList={{
            "oasis-editor-tool-button-active": props.active || api.open,
          }}
          disabled={props.disabled}
          title={props.tooltip ?? props.label}
          aria-label={props.tooltip ?? props.label}
          aria-haspopup="menu"
          aria-expanded={api.open}
          data-testid={props.testId}
          onClick={(): void => api.toggle()}
        >
          <Show when={props.icon}>
            <span class="oasis-editor-wide-menu-button-icon">
              <ToolIcon name={props.icon!} />
              <Show when={props.indicatorColor !== undefined}>
                <span
                  class="oasis-editor-wide-menu-button-indicator"
                  classList={{
                    "oasis-editor-wide-menu-button-indicator-empty":
                      !props.indicatorColor,
                  }}
                  style={{ "background-color": props.indicatorColor ?? "" }}
                />
              </Show>
            </span>
          </Show>
          <span class="oasis-editor-wide-menu-button-label">{props.label}</span>
          <DropdownChevron />
        </button>
      )}
    >
      {props.children}
    </Popover>
  );
}
