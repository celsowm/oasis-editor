import { Show, createUniqueId, splitProps, type JSX } from "solid-js";

export interface TextFieldProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  label?: string;
  description?: string;
  error?: string;
  labelClass?: string;
  controlClass?: string;
  onChange?: (value: string) => void;
}

export function TextField(props: TextFieldProps): JSX.Element {
  const fallbackId = createUniqueId();
  const [local, others] = splitProps(props, [
    "label",
    "description",
    "error",
    "labelClass",
    "controlClass",
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
      <input
        id={id()}
        class={`oasis-editor-ui-input ${local.controlClass ?? ""}`}
        aria-invalid={local.error ? "true" : undefined}
        aria-describedby={[
          local.description ? descriptionId() : null,
          local.error ? errorId() : null,
        ]
          .filter(Boolean)
          .join(" ")}
        onInput={(event): void | undefined =>
          local.onChange?.(event.currentTarget.value)
        }
        {...others}
      />
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
