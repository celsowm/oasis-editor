import {
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  h,
  VNode,
  RendererNode,
  RendererElement,
  type PropType,
} from "vue";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";
import { createOasisMountController } from "./mountController.js";

export const OasisEditor = defineComponent({
  name: "OasisEditor",
  props: {
    config: {
      type: Object as () => OasisEditorAppProps,
      default: (): Record<string, never> => ({}),
    },
    class: String,
    style: [String, Object] as PropType<string | Record<string, unknown>>,
    onClient: Function as PropType<(client: OasisEditorClient) => void>,
  },
  setup(props) {
    const root = ref<HTMLElement | null>(null);
    const controller = createOasisMountController();

    onMounted((): void => {
      if (root.value) {
        controller.mount(root.value, props.config, props.onClient);
      }
    });

    onBeforeUnmount((): void => {
      controller.unmount();
    });

    return (): VNode<
      RendererNode,
      RendererElement,
      { [key: string]: unknown }
    > => h("div", { ref: root, class: props.class, style: props.style });
  },
});
