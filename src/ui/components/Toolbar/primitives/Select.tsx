import { createEffect, splitProps, type JSX } from "solid-js";

export interface ToolbarSelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  wide?: boolean;
  small?: boolean;
  tooltip?: string;
}

/**
 * HTML select wrapper. Keeps the uncontrolled-with-sync pattern: the value is
 * pushed imperatively in an effect to avoid SolidJS controlled-select pitfalls.
 */
export function Select(props: ToolbarSelectProps): JSX.Element {
  let selectRef: HTMLSelectElement | undefined;
  const [local, others] = splitProps(props, [
    "wide",
    "small",
    "class",
    "tooltip",
    "aria-label",
    "value",
  ]);

  const ariaLabel = () => local["aria-label"] || local.tooltip || "";

  createEffect(() => {
    const nextValue = local.value;
    if (!selectRef || nextValue === undefined || nextValue === null) {
      return;
    }
    const serialized = String(nextValue);
    if (selectRef.value !== serialized) {
      selectRef.value = serialized;
    }
  });

  return (
    <select
      ref={selectRef}
      class={`oasis-editor-tool-select ${local.class || ""}`}
      classList={{
        "oasis-editor-tool-select-wide": local.wide,
        "oasis-editor-tool-select-small": local.small,
      }}
      title={local.tooltip}
      aria-label={ariaLabel()}
      value={local.value as string | number | string[] | undefined}
      {...others}
    >
      {others.children}
    </select>
  );
}
