import { splitProps, type JSX } from "solid-js";

export interface ToggleChipProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  label: string;
  /** Optional inline style for the label, e.g. to preview bold/italic effects. */
  labelStyle?: JSX.CSSProperties;
  onChange?: (checked: boolean) => void;
}

/**
 * A compact checkbox styled as a toggleable chip — for dense grids of boolean
 * options (e.g. the font-effect toggles: bold, italic, small-caps...). The
 * underlying control is a native checkbox so it stays accessible and form-aware.
 */
export function ToggleChip(props: ToggleChipProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "label",
    "labelStyle",
    "onChange",
    "class",
    "checked",
  ]);
  return (
    <label
      class={`oasis-editor-ui-toggle-chip ${local.class ?? ""}`}
      classList={{ "is-active": Boolean(local.checked) }}
    >
      <input
        type="checkbox"
        class="oasis-editor-ui-toggle-chip-input"
        checked={local.checked}
        onChange={(event): void | undefined => local.onChange?.(event.currentTarget.checked)}
        {...others}
      />
      <span class="oasis-editor-ui-toggle-chip-label" style={local.labelStyle}>
        {local.label}
      </span>
    </label>
  );
}
