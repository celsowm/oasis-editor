import { splitProps, type JSX } from "solid-js";
import { ToolIcon } from "@/ui/utils/customIcons.js";

export interface FloatingActionButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  active?: boolean;
}

export function FloatingActionButton(
  props: FloatingActionButtonProps,
): JSX.Element {
  const [local, others] = splitProps(props, [
    "type",
    "icon",
    "label",
    "active",
    "class",
    "classList",
  ]);

  return (
    <button
      type={local.type ?? "button"}
      class={`oasis-editor-plugin-floating-action ${local.class ?? ""}`}
      classList={{
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
