import { render } from "solid-js/web";
import {
  OasisEditorContainer,
  type OasisEditorContainerProps,
} from "@/ui/OasisEditorContainer.js";
import {
  createOasisEditorClient,
  type OasisEditorClient,
} from "@/app/client/OasisEditorClient.js";

/** An Oasis editor container instance created via {@link createOasisEditorContainer}. */
export type OasisEditorContainerInstance = OasisEditorClient;

/**
 * Mounts the Oasis editor container component into a container element and
 * returns the public editor client API.
 *
 * @param container - The DOM element to mount into.
 * @param props - Optional container props.
 * @returns The editor client API.
 */
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
