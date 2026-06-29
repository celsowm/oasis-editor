import { For, Show, createUniqueId, splitProps, type JSX } from "solid-js";

export interface SelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<
  JSX.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> {
  label?: string;
  description?: string;
  error?: string;
  labelClass?: string;
  controlClass?: string;
  options: SelectFieldOption[];
  onChange?: (value: string) => void;
}

export function SelectField(props: SelectFieldProps): JSX.Element {
  const fallbackId = createUniqueId();
  const [local, others] = splitProps(props, [
    "label",
    "description",
    "error",
    "labelClass",
    "controlClass",
    "options",
    "onChange",
    "class",
    "classList",
    "id",
  ]);
  const id = (): string => local.id ?? fallbackId;
  const descriptionId = (): string => `${id()}-description`;
  const errorId = (): string => `${id()}-error`;

  return (
    <label
      class={`oasis-editor-ui-field ${local.class ?? ""}`}
      classList={local.classList}
      for={id()}
    >
      <Show when={local.label}>
        <span class={`oasis-editor-ui-field-label ${local.labelClass ?? ""}`}>
          {local.label}
        </span>
      </Show>
      <select
        id={id()}
        class={`oasis-editor-ui-select ${local.controlClass ?? ""}`}
        aria-invalid={local.error ? "true" : undefined}
        aria-describedby={[
          local.description ? descriptionId() : null,
          local.error ? errorId() : null,
        ]
          .filter(Boolean)
          .join(" ")}
        onChange={(event): void | undefined => local.onChange?.(event.currentTarget.value)}
        {...others}
      >
        <For each={local.options}>
          {(option): JSX.Element => (
            <option value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          )}
        </For>
      </select>
      <Show when={local.description}>
        <span id={descriptionId()} class="oasis-editor-ui-field-description">
          {local.description}
        </span>
      </Show>
      <Show when={local.error}>
        <span id={errorId()} class="oasis-editor-ui-field-error">
          {local.error}
        </span>
      </Show>
    </label>
  );
}
