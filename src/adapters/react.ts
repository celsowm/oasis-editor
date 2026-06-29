import React, { useEffect, useRef } from "react";
import { mount } from "oasis-editor";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";

export type ReactOasisEditorProps = OasisEditorAppProps & {
  /**
   * Receives the mounted Oasis client. Props are mount-only for this adapter;
   * remount the component to apply a new editor configuration.
   */
  onClient?: (client: OasisEditorClient) => void;
};

export const OasisEditor: React.FC<ReactOasisEditorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof mount> | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      instanceRef.current = mount(containerRef.current, props);
      props.onClient?.(instanceRef.current);
    }
    return () => {
      instanceRef.current?.unmount();
      instanceRef.current = null;
    };
  }, []); // mount-only — remount component to apply new config

  return React.createElement("div", {
    ref: containerRef,
    className: props.ui?.class,
    style: props.ui?.style,
  });
};
