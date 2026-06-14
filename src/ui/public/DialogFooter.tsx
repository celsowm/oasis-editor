import { splitProps, type JSX } from "solid-js";

export interface DialogFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "between";
}

export function DialogFooter(props: DialogFooterProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "align",
    "class",
    "classList",
    "children",
  ]);

  return (
    <div
      class={`oasis-editor-ui-dialog-footer ${local.class ?? ""}`}
      classList={{
        [`oasis-editor-ui-dialog-footer-${local.align ?? "end"}`]: true,
        ...local.classList,
      }}
      {...others}
    >
      {local.children}
    </div>
  );
}
