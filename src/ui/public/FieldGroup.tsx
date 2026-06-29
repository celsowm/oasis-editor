import { Show, splitProps, type JSX } from "solid-js";

export interface FieldGroupProps
  extends JSX.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: string;
  legendClass?: string;
}

export function FieldGroup(props: FieldGroupProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "legend",
    "legendClass",
    "class",
    "children",
  ]);

  return (
    <fieldset class={`oasis-editor-ui-field-group ${local.class ?? ""}`} {...others}>
      <Show when={local.legend}>
        <legend class={`oasis-editor-ui-field-group-legend ${local.legendClass ?? ""}`}>
          {local.legend}
        </legend>
      </Show>
      {local.children}
    </fieldset>
  );
}
