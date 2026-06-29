import { defineComponent, onBeforeUnmount, onMounted, ref, h } from "vue";
import { mount } from "oasis-editor";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";

export const OasisEditor = defineComponent({
  name: "OasisEditor",
  props: {
    config: {
      type: Object as () => OasisEditorAppProps,
      default: () => ({}),
    },
    class: String,
    style: [String, Object] as unknown as () =>
      | string
      | Record<string, unknown>,
    onClient: Function as unknown as () => (client: OasisEditorClient) => void,
  },
  setup(props) {
    const root = ref<HTMLElement | null>(null);
    let instance: ReturnType<typeof mount> | null = null;

    onMounted(() => {
      if (root.value) {
        instance = mount(root.value, props.config);
        props.onClient?.(instance);
      }
    });

    onBeforeUnmount(() => {
      instance?.unmount();
      instance = null;
    });

    return () =>
      h("div", { ref: root, class: props.class, style: props.style });
  },
});
