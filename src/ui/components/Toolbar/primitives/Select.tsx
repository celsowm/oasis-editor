import { createEffect, Show, splitProps, type JSX } from "solid-js";

export interface ToolbarSelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  wide?: boolean;
  small?: boolean;
  tooltip?: string;
  label?: string;
  ribbonSize?: "normal" | "large";
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
    "label",
    "ribbonSize",
  ]);

  const ariaLabel = (): string => local["aria-label"] || local.tooltip || "";

  createEffect((): void => {
    const nextValue = local.value;
    if (!selectRef || nextValue === undefined || nextValue === null) {
      return;
    }
    const serialized = String(nextValue);
    if (selectRef.value !== serialized) {
      selectRef.value = serialized;
    }
  });

  const select = (): JSX.Element => (
    <select
      ref={selectRef}
      class={`oasis-editor-tool-select ${local.class || ""}`}
      classList={{
        "oasis-editor-tool-select-wide": local.wide,
        "oasis-editor-tool-select-small": local.small,
        "oasis-editor-tool-select-ribbon-large": local.ribbonSize === "large",
      }}
      title={local.tooltip}
      aria-label={ariaLabel()}
      value={local.value as string | number | string[] | undefined}
      {...others}
    >
      {others.children}
    </select>
  );

  return (
    <Show when={local.ribbonSize === "large"} fallback={select()}>
      <div class="oasis-editor-tool-select-ribbon-large-wrap">
        <Show when={local.label}>
          <span class="oasis-editor-tool-select-ribbon-large-label">
            {local.label}
          </span>
        </Show>
        {select()}
      </div>
    </Show>
  );
}
