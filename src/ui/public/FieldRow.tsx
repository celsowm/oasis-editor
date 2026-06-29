import { splitProps, type JSX } from "solid-js";

export interface FieldRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Cross-axis alignment of the children. Defaults to `flex-end` so labelled
   * fields of different heights line up on their inputs. */
  align?: "start" | "center" | "end" | "stretch";
}

const ALIGN_MAP: Record<NonNullable<FieldRowProps["align"]>, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

/**
 * Horizontal layout row for form fields. Replaces the ad-hoc
 * `<div class="oasis-editor-dialog-row">` flex containers; children (typically
 * `TextField`/`NumberField`/`SelectField`) grow to share the available width.
 */
export function FieldRow(props: FieldRowProps): JSX.Element {
  const [local, others] = splitProps(props, [
    "align",
    "class",
    "style",
    "children",
  ]);
  return (
    <div
      class={`oasis-editor-ui-field-row ${local.class ?? ""}`}
      style={{
        "align-items": ALIGN_MAP[local.align ?? "end"],
        ...(typeof local.style === "object" ? local.style : {}),
      }}
      {...others}
    >
      {local.children}
    </div>
  );
}
