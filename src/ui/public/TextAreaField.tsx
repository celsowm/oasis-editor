import { createUniqueId, splitProps, type JSX } from "solid-js";
import { FormField } from "./FormField.js";

export interface TextAreaFieldProps extends Omit<
  JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> {
  label?: string;
  description?: string;
  error?: string;
  labelClass?: string;
  controlClass?: string;
  onChange?: (value: string) => void;
}

export function TextAreaField(props: TextAreaFieldProps): JSX.Element {
  const fallbackId = createUniqueId();
  const [local, others] = splitProps(props, [
    "label",
    "description",
    "error",
    "labelClass",
    "controlClass",
    "onChange",
    "class",
    "id",
  ]);
  const id = (): string => local.id ?? fallbackId;
  const describedBy = (): string =>
    [
      local.description ? `${id()}-description` : null,
      local.error ? `${id()}-error` : null,
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <FormField
      class={local.class}
      label={local.label}
      for={id()}
      labelClass={local.labelClass}
      description={local.description}
      error={local.error}
    >
      <textarea
        id={id()}
        class={`oasis-editor-ui-input oasis-editor-ui-textarea ${local.controlClass ?? ""}`}
        aria-invalid={local.error ? "true" : undefined}
        aria-describedby={describedBy() || undefined}
        onInput={(event): void | undefined => local.onChange?.(event.currentTarget.value)}
        {...others}
      />
    </FormField>
  );
}
