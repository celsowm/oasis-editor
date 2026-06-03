import React, { useEffect, useRef } from "react";
import { mount, type OasisMountInstance } from "../../ui/mount.js";
import type { OasisEditorAppProps } from "../../ui/OasisEditorApp.js";

export type ReactOasisEditorProps = OasisEditorAppProps;

export const OasisEditor: React.FC<ReactOasisEditorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<OasisMountInstance | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      instanceRef.current = mount(containerRef.current, props);
    }

    return () => {
      if (instanceRef.current) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, []); // Only mount once

  // In a real adapter, we might want to sync props updates here
  // But for a thin wrapper, this is the starting point.

  return <div ref={containerRef} className={props.ui?.class} style={props.ui?.style} />;
};
