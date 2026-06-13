import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const distDir = "dist";

await mkdir(distDir, { recursive: true });

await writeFile(
  join(distDir, "react.js"),
  `import React, { useEffect, useRef } from "react";
import { mount } from "oasis-editor";

export function OasisEditor(props) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      instanceRef.current = mount(containerRef.current, props);
      props.onClient?.(instanceRef.current);
    }
    return () => {
      instanceRef.current?.unmount();
      instanceRef.current = null;
    };
  }, []);

  return React.createElement("div", {
    ref: containerRef,
    className: props.ui?.class,
    style: props.ui?.style,
  });
}
`,
);

await writeFile(
  join(distDir, "react.d.ts"),
  `import type React from "react";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";

export type ReactOasisEditorProps = OasisEditorAppProps & {
  /**
   * Receives the mounted Oasis client. Props are mount-only for this adapter;
   * remount the component to apply a new editor configuration.
   */
  onClient?: (client: OasisEditorClient) => void;
};

export declare const OasisEditor: React.FC<ReactOasisEditorProps>;
`,
);

await writeFile(
  join(distDir, "vue.js"),
  `import { defineComponent, onBeforeUnmount, onMounted, ref, h } from "vue";
import { mount } from "oasis-editor";

export const OasisEditor = defineComponent({
  name: "OasisEditor",
  props: {
    config: {
      type: Object,
      default: () => ({}),
    },
    class: String,
    style: [String, Object],
    onClient: Function,
  },
  setup(props) {
    const root = ref(null);
    let instance = null;

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

    return () => h("div", { ref: root, class: props.class, style: props.style });
  },
});
`,
);

await writeFile(
  join(distDir, "vue.d.ts"),
  `import type { DefineComponent } from "vue";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";

export declare const OasisEditor: DefineComponent<{
  config?: OasisEditorAppProps;
  class?: string;
  style?: string | Record<string, unknown>;
  onClient?: (client: OasisEditorClient) => void;
}>;
`,
);
