import { type JSX } from "solid-js";

interface ToolbarGroupProps {
  children: JSX.Element;
  class?: string;
}

export function ToolbarGroup(props: ToolbarGroupProps) {
  return (
    <div class={`oasis-editor-toolbar-group ${props.class || ""}`}>
      {props.children}
    </div>
  );
}

export function ToolbarSeparator(props: { hidden?: boolean }) {
  return (
    <div
      class="oasis-editor-toolbar-separator"
      style={{ display: props.hidden ? "none" : undefined }}
    />
  );
}
