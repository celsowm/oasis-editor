import { Show, splitProps, type JSX } from "solid-js";

interface ToolbarButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  label?: string;
  active?: boolean;
  tooltip?: string;
  wide?: boolean;
}

export function ToolbarButton(props: ToolbarButtonProps) {
  const [local, others] = splitProps(props, ["icon", "label", "active", "tooltip", "wide", "class", "classList"]);

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
      {...others}
    >
      <Show when={local.icon}>
        <i data-lucide={local.icon} />
      </Show>
      <Show when={local.label}>
        <span>{local.label}</span>
      </Show>
      <Show when={!local.icon && !local.label}>
        {others.children}
      </Show>
    </button>
  );
}
