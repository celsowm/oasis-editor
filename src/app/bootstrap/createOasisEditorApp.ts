import { render } from "solid-js/web";
import { OasisEditorAppLazy } from "@/ui/OasisEditorAppLazy.js";
import type { OasisEditorAppProps } from "@/ui/OasisEditorApp.js";
import {
  createOasisEditorClient,
  type OasisEditorClient,
} from "@/app/client/OasisEditorClient.js";

/** An Oasis editor instance created via {@link createOasisEditor}. */
export type OasisEditorInstance = OasisEditorClient;

/**
 * Mounts the full Oasis editor application (document shell) into a container
 * element and returns the public editor client API.
 *
 * @param container - The DOM element to mount the editor into.
 * @param props - Optional editor configuration props.
 * @returns The editor client API.
 */
export function createOasisEditor(
  container: HTMLElement,
  props: OasisEditorAppProps = {},
): OasisEditorInstance {
  const client = createOasisEditorClient();
  const dispose = render(
    () =>
      OasisEditorAppLazy({ ...props, runtime: { ...props.runtime, client } }),
    container,
  );
  client.setDispose(() => {
    dispose();
    container.innerHTML = "";
  });

  return client;
}
