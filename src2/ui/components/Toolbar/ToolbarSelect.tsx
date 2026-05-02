import { splitProps, type JSX } from "solid-js";

interface ToolbarSelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  wide?: boolean;
  small?: boolean;
  tooltip?: string;
}

export function ToolbarSelect(props: ToolbarSelectProps) {
  const [local, others] = splitProps(props, ["wide", "small", "class", "tooltip"]);

  return (
    <select
      class={`oasis-editor-2-tool-select ${local.class || ""}`}
      classList={{
        "oasis-editor-2-tool-select-wide": local.wide,
        "oasis-editor-2-tool-select-small": local.small,
      }}
      title={local.tooltip}
      {...others}
    >
      {others.children}
    </select>
  );
}
