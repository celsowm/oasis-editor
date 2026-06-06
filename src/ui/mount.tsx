import { render } from "solid-js/web";
import { OasisEditorAppLazy } from "./OasisEditorAppLazy.js";
import type { OasisEditorAppProps } from "./OasisEditorApp.js";

export interface OasisMountInstance {
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
  const dispose = render(() => OasisEditorAppLazy(props), target);

  return {
    unmount: () => {
      dispose();
      target.innerHTML = "";
    },
  };
}
