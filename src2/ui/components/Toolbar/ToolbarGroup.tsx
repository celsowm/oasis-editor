import { type JSX } from "solid-js";

interface ToolbarGroupProps {
  children: JSX.Element;
  class?: string;
}

export function ToolbarGroup(props: ToolbarGroupProps) {
  return (
    <div class={`oasis-editor-2-toolbar-group ${props.class || ""}`}>
      {props.children}
    </div>
  );
}

export function ToolbarSeparator() {
  return <div class="oasis-editor-2-toolbar-separator" />;
}
