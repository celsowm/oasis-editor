import { Show, createUniqueId, splitProps, type JSX } from "solid-js";
import { StatusText } from "./StatusText.js";

export interface FormFieldProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: string;
  for?: string;
  description?: string;
  error?: string;
  labelClass?: string;
}

export function FormField(props: FormFieldProps): JSX.Element {
  const fallbackId = createUniqueId();
  const [local, others] = splitProps(props, [
    "label",
    "for",
    "description",
    "error",
    "labelClass",
    "class",
    "classList",
    "children",
  ]);
  const descriptionId = () => local.for ?? `${fallbackId}-description`;
  const errorId = () => local.for ?? `${fallbackId}-error`;

  return (
    <div
      class={`oasis-editor-ui-field ${local.class ?? ""}`}
      classList={local.classList}
      {...others}
    >
      <Show when={local.label}>
        <label
          class={`oasis-editor-ui-field-label ${local.labelClass ?? ""}`}
          for={local.for}
        >
          {local.label}
        </label>
      </Show>
      {local.children}
      <Show when={local.description}>
        <StatusText id={descriptionId()} class="oasis-editor-ui-field-description">
          {local.description}
        </StatusText>
      </Show>
      <Show when={local.error}>
        <StatusText
          id={errorId()}
          tone="danger"
          class="oasis-editor-ui-field-error"
        >
          {local.error}
        </StatusText>
      </Show>
    </div>
  );
}
