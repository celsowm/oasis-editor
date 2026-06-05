import { defineComponent, onMounted, onBeforeUnmount, ref, h } from "vue";
import { mount, type OasisMountInstance } from "../../ui/mount.js";
import type { OasisEditorAppProps } from "../../ui/OasisEditorApp.js";

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
  },
  setup(props) {
    const root = ref<HTMLElement | null>(null);
    let instance: OasisMountInstance | null = null;

    onMounted(() => {
      if (root.value) {
        instance = mount(root.value, props.config);
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
