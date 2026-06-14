import { splitProps, type JSX } from "solid-js";
import { ToolIcon } from "../utils/customIcons.js";

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  active?: boolean;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
}

export function IconButton(props: IconButtonProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "type",
    "icon",
    "label",
    "active",
    "variant",
    "size",
    "class",
    "classList",
  ]);

  return (
    <button
      type={local.type ?? "button"}
      class={`oasis-editor-ui-icon-button ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-ui-icon-button-${local.variant ?? "ghost"}`]: true,
        [`oasis-editor-ui-icon-button-${local.size ?? "md"}`]: true,
        "is-active": local.active,
        ...local.classList,
      }}
      aria-label={local.label}
      title={local.label}
      {...others}
    >
      <ToolIcon name={local.icon} />
    </button>
  );
}
