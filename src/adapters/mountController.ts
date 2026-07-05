import { mount } from "oasis-editor";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";

/**
 * Framework-agnostic mount/unmount lifecycle shared by the React and Vue
 * adapters — both wrap the same mount-on-attach, unmount-on-detach shape
 * around their own reactivity hooks.
 */
export interface OasisMountController {
  mount(
    container: HTMLElement,
    props: OasisEditorAppProps,
    onClient?: (client: OasisEditorClient) => void,
  ): void;
  unmount(): void;
}

export function createOasisMountController(): OasisMountController {
  let instance: ReturnType<typeof mount> | null = null;

  return {
    mount(container, props, onClient): void {
      instance = mount(container, props);
      onClient?.(instance);
    },
    unmount(): void {
      instance?.unmount();
      instance = null;
    },
  };
}
