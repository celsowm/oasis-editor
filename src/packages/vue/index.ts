import { defineComponent, onMounted, onBeforeUnmount, ref, h } from "vue";
import { mount, type OasisMountInstance } from "../../ui/mount.js";
import type { OasisEditorAppProps } from "../../ui/OasisEditorApp.js";
import type { OasisEditorClient } from "../../app/client/OasisEditorClient.js";

export const OasisEditor = defineComponent({
  name: "OasisEditor",
  props: {
    // Basic props - in a real impl we'd define all props or use a catch-all
    config: {
      type: Object as () => OasisEditorAppProps,
      default: () => ({}),
    },
    class: String,
    style: [String, Object],
    onClient: Function as unknown as () => (client: OasisEditorClient) => void,
  },
  setup(props) {
    const root = ref<HTMLElement | null>(null);
    let instance: OasisMountInstance | null = null;

    onMounted(() => {
      if (root.value) {
        instance = mount(root.value, props.config);
        props.onClient?.(instance);
      }
    });

    onBeforeUnmount(() => {
      if (instance) {
        instance.unmount();
      }
    });

    return () =>
      h("div", { ref: root, class: props.class, style: props.style });
  },
});
