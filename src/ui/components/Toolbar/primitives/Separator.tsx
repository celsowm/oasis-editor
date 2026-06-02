import { type JSX } from "solid-js";

/** Vertical divider between toolbar item groups. */
export function Separator(props: { hidden?: boolean }): JSX.Element {
  return (
    <div
      class="oasis-editor-toolbar-separator"
      style={{ display: props.hidden ? "none" : undefined }}
    />
  );
}
