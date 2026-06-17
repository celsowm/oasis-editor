import { Show, splitProps, type JSX } from "solid-js";
import { ToolIcon } from "@/ui/utils/customIcons.js";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: string;
  iconPosition?: "start" | "end";
  fullWidth?: boolean;
}

export function Button(props: ButtonProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "type",
    "variant",
    "size",
    "icon",
    "iconPosition",
    "fullWidth",
    "class",
    "classList",
    "children",
  ]);
  const iconPosition = () => local.iconPosition ?? "start";

  return (
    <button
      type={local.type ?? "button"}
      class={`oasis-editor-ui-button ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-ui-button-${local.variant ?? "secondary"}`]: true,
        [`oasis-editor-ui-button-${local.size ?? "md"}`]: true,
        "oasis-editor-ui-button-full": local.fullWidth,
        ...local.classList,
      }}
      {...others}
    >
      <Show when={local.icon && iconPosition() === "start"}>
        <ToolIcon name={local.icon!} />
      </Show>
      <span class="oasis-editor-ui-button-label">{local.children}</span>
      <Show when={local.icon && iconPosition() === "end"}>
        <ToolIcon name={local.icon!} />
      </Show>
    </button>
  );
}
