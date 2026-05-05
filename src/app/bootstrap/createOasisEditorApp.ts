import { render } from "solid-js/web";
import { OasisEditorApp } from "../../ui/OasisEditorApp.js";

export interface OasisEditorInstance {
  dispose: () => void;
}

export function createOasisEditor(
  container: HTMLElement,
  props: { shell?: "document" | "inline" | "balloon" } = {}
): OasisEditorInstance {
  const dispose = render(() => OasisEditorApp(props), container);

  return {
    dispose,
  };
}
