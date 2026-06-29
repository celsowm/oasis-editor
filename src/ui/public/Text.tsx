import { splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface TextProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "p" | "strong";
  tone?: "default" | "muted" | "danger";
  size?: "sm" | "md";
}

export function Text(props: TextProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "as",
    "tone",
    "size",
    "class",
    "classList",
    "children",
  ]);
  return (
    <Dynamic
      component={local.as ?? "span"}
      class={`oasis-editor-ui-text ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-ui-text-${local.tone ?? "default"}`]: true,
        [`oasis-editor-ui-text-${local.size ?? "md"}`]: true,
        ...local.classList,
      }}
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}
