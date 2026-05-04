import { render } from "solid-js/web";
import { OasisEditorApp } from "../../ui/OasisEditorApp.js";

export interface OasisEditorInstance {
  dispose: () => void;
}

export function createOasisEditor(container: HTMLElement): OasisEditorInstance {
  const dispose = render(OasisEditorApp, container);

  return {
    dispose,
  };
}
