import { Show, splitProps, type JSX } from "solid-js";
import { ToolIcon } from "@/ui/utils/customIcons.js";

export interface ToolbarButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  label?: string;
  active?: boolean;
  tooltip?: string;
  wide?: boolean;
}

/** Generic toolbar button primitive (icon and/or label, active/disabled). */
export function Button(props: ToolbarButtonProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "icon",
    "label",
    "active",
    "tooltip",
    "wide",
    "aria-label",
    "class",
    "classList",
  ]);

  const ariaLabel = () =>
    local["aria-label"] || local.tooltip || local.label || "";

  return (
    <button
      type="button"
      class={`oasis-editor-tool-button ${local.class || ""}`}
      classList={{
        "oasis-editor-tool-button-active": local.active,
        "oasis-editor-tool-button-wide": local.wide,
        ...local.classList,
      }}
      title={local.tooltip}
      aria-label={ariaLabel()}
      {...others}
    >
      <Show when={local.icon}>
        <ToolIcon name={local.icon!} />
      </Show>
      <Show when={local.label}>
        <span>{local.label}</span>
      </Show>
      <Show when={!local.icon && !local.label}>{others.children}</Show>
    </button>
  );
}
