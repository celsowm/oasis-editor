import { type JSX } from "solid-js";

export interface SeparatorProps {
  hidden?: boolean;
}

/** Vertical divider between toolbar item groups. */
export function Separator(props: SeparatorProps): JSX.Element {
  return (
    <div
      class="oasis-editor-toolbar-separator"
      role="separator"
      aria-orientation="vertical"
      style={{ display: props.hidden ? "none" : undefined }}
    />
  );
}
