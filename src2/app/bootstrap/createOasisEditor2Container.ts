import { render } from "solid-js/web";
import { OasisEditor2Container, type OasisEditor2ContainerProps } from "../../ui/OasisEditor2Container.js";

export interface OasisEditor2ContainerInstance {
  dispose: () => void;
}

export function createOasisEditor2Container(
  container: HTMLElement,
  props: OasisEditor2ContainerProps = {},
): OasisEditor2ContainerInstance {
  const dispose = render(() => OasisEditor2Container(props), container);

  return {
    dispose,
  };
}
