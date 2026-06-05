import { render } from "solid-js/web";
import {
  OasisEditorApp,
  type OasisEditorAppProps,
} from "../../ui/OasisEditorApp.js";

export interface OasisEditorInstance {
  dispose: () => void;
}

export function createOasisEditor(
  container: HTMLElement,
  props: OasisEditorAppProps = {},
): OasisEditorInstance {
  const dispose = render(() => OasisEditorApp(props), container);

  return {
    dispose,
  };
}
