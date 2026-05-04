import { render } from "solid-js/web";
import { OasisEditorContainer, type OasisEditorContainerProps } from "../../ui/OasisEditorContainer.js";

export interface OasisEditorContainerInstance {
  dispose: () => void;
}

export function createOasisEditorContainer(
  container: HTMLElement,
  props: OasisEditorContainerProps = {},
): OasisEditorContainerInstance {
  const dispose = render(() => OasisEditorContainer(props), container);

  return {
    dispose,
  };
}
