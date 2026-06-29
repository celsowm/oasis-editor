import { splitProps, type JSX } from "solid-js";
import { Text } from "./Text.js";

export interface StatusTextProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "muted" | "danger" | "success";
  as?: "span" | "p";
}

export function StatusText(props: StatusTextProps): JSX.Element {
  const [local, others] = splitProps(props, ["tone", "as", "class"]);

  return (
    <Text
      as={local.as ?? "span"}
      tone={local.tone === "success" ? "default" : (local.tone ?? "muted")}
      size="sm"
      class={`oasis-editor-ui-status-text ${local.class ?? ""}`}
      {...others}
    />
  );
}
