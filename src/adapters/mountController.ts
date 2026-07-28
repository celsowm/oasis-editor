import { mount } from "oasis-editor";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";

/**
 * Framework-agnostic mount/unmount lifecycle shared by the React and Vue
 * adapters — both wrap the same mount-on-attach, unmount-on-detach shape
 * around their own reactivity hooks.
 */
export interface OasisMountController {
  /**
   * Mounts the editor into the given container.
   * @param container - The DOM element to mount into.
   * @param props - Editor configuration props.
   * @param onClient - Optional callback receiving the mounted client.
   */
  mount(
    container: HTMLElement,
    props: OasisEditorAppProps,
    onClient?: (client: OasisEditorClient) => void,
  ): void;
  /** Unmounts the editor and releases resources. */
  unmount(): void;
}

/**
 * Creates a framework-agnostic mount controller.
 * @returns A new OasisMountController.
 */
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
