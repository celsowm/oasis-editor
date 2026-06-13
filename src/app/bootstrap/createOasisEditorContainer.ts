import { render } from "solid-js/web";
import {
  OasisEditorContainer,
  type OasisEditorContainerProps,
} from "../../ui/OasisEditorContainer.js";
import {
  createOasisEditorClient,
  type OasisEditorClient,
} from "../client/OasisEditorClient.js";

export type OasisEditorContainerInstance = OasisEditorClient;

export function createOasisEditorContainer(
  container: HTMLElement,
  props: OasisEditorContainerProps = {},
): OasisEditorContainerInstance {
  const client = createOasisEditorClient();
  const dispose = render(
    () =>
      OasisEditorContainer({
        ...props,
        runtime: { ...props.runtime, client },
      }),
    container,
  );
  client.setDispose(() => {
    dispose();
    container.innerHTML = "";
  });

  return client;
}
