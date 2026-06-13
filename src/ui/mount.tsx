import { render } from "solid-js/web";
import { OasisEditorAppLazy } from "./OasisEditorAppLazy.js";
import type { OasisEditorAppProps } from "./OasisEditorApp.js";
import {
  createOasisEditorClient,
  type OasisEditorClient,
} from "../app/client/OasisEditorClient.js";

export interface OasisMountInstance extends OasisEditorClient {
  unmount: () => void;
}

/**
 * Public vanilla JS mount function.
 * Wraps the Solid.js entry point for framework-agnostic usage.
 */
export function mount(
  target: HTMLElement,
  props: OasisEditorAppProps = {},
): OasisMountInstance {
  const client = createOasisEditorClient();
  const dispose = render(
    () => (
      <OasisEditorAppLazy {...props} runtime={{ ...props.runtime, client }} />
    ),
    target,
  );
  const unmountDom = () => {
    dispose();
    target.innerHTML = "";
  };
  client.setDispose(unmountDom);

  return Object.assign(client, { unmount: () => client.dispose() });
}
