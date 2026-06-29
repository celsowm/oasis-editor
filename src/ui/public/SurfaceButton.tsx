import { Show, splitProps, type JSX } from "solid-js";
import { ToolIcon } from "@/ui/utils/customIcons.js";

export interface SurfaceButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  label?: string;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
  active?: boolean;
}

export function SurfaceButton(props: SurfaceButtonProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "type",
    "icon",
    "label",
    "variant",
    "size",
    "active",
    "class",
    "classList",
    "children",
  ]);

  return (
    <button
      type={local.type ?? "button"}
      class={`oasis-editor-ui-surface-button ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-ui-surface-button-${local.variant ?? "ghost"}`]: true,
        [`oasis-editor-ui-surface-button-${local.size ?? "md"}`]: true,
        "is-active": local.active,
        ...local.classList,
      }}
      aria-label={local.label}
      title={local.label}
      {...others}
    >
      <Show when={local.icon}>
        <ToolIcon name={local.icon!} />
      </Show>
      {local.children}
    </button>
  );
}
