import { splitProps, type JSX } from "solid-js";

export interface ActionRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "between";
  wrap?: boolean;
}

export function ActionRow(props: ActionRowProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "align",
    "wrap",
    "class",
    "classList",
    "children",
  ]);

  return (
    <div
      class={`oasis-editor-ui-action-row ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-ui-action-row-${local.align ?? "start"}`]: true,
        "oasis-editor-ui-action-row-nowrap": local.wrap === false,
        ...local.classList,
      }}
      {...others}
    >
      {local.children}
    </div>
  );
}
