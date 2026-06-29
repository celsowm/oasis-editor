import { Show, createUniqueId, splitProps, type JSX } from "solid-js";

export interface CheckboxProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  label: string;
  description?: string;
  error?: string;
  onChange?: (checked: boolean) => void;
}

export function Checkbox(props: CheckboxProps): JSX.Element {
  const fallbackId = createUniqueId();
  const [local, others] = splitProps(props, [
    "label",
    "description",
    "error",
    "onChange",
    "class",
    "id",
  ]);
  const id = (): string => local.id ?? fallbackId;
  const descriptionId = (): string => `${id()}-description`;
  const errorId = (): string => `${id()}-error`;

  return (
    <label class={`oasis-editor-ui-checkbox ${local.class ?? ""}`} for={id()}>
      <input
        id={id()}
        type="checkbox"
        class="oasis-editor-ui-checkbox-input"
        aria-invalid={local.error ? "true" : undefined}
        aria-describedby={[
          local.description ? descriptionId() : null,
          local.error ? errorId() : null,
        ]
          .filter(Boolean)
          .join(" ")}
        onChange={(event): void | undefined =>
          local.onChange?.(event.currentTarget.checked)
        }
        {...others}
      />
      <span class="oasis-editor-ui-checkbox-copy">
        <span class="oasis-editor-ui-field-label">{local.label}</span>
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
      </span>
    </label>
  );
}
