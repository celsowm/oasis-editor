import { render } from "solid-js/web";
import { OasisEditorAppLazy } from "@/ui/OasisEditorAppLazy.js";
import type { OasisEditorAppProps } from "@/ui/OasisEditorApp.js";
import {
  createOasisEditorClient,
  type OasisEditorClient,
} from "@/app/client/OasisEditorClient.js";

export type OasisEditorInstance = OasisEditorClient;

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
