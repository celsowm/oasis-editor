import { render } from "solid-js/web";
import { OasisEditor2App } from "../../ui/OasisEditor2App.js";

export interface OasisEditor2Instance {
  dispose: () => void;
}

export function createOasisEditor2(container: HTMLElement): OasisEditor2Instance {
  const dispose = render(OasisEditor2App, container);

  return {
    dispose,
  };
}
