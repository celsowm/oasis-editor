import { render } from "solid-js/web";
import { OasisEditorAppLazy } from "../../ui/OasisEditorAppLazy.js";
import type { OasisEditorAppProps } from "../../ui/OasisEditorApp.js";

export interface OasisEditorInstance {
  dispose: () => void;
}

export function createOasisEditor(
  container: HTMLElement,
  props: OasisEditorAppProps = {},
): OasisEditorInstance {
  const dispose = render(() => OasisEditorAppLazy(props), container);

  return {
    dispose,
  };
}
