import React, { useEffect, useRef } from "react";
import type { OasisEditorAppProps, OasisEditorClient } from "oasis-editor";
import { createOasisMountController } from "./mountController.js";

export type ReactOasisEditorProps = OasisEditorAppProps & {
  /**
   * Receives the mounted Oasis client. Props are mount-only for this adapter;
   * remount the component to apply a new editor configuration.
   */
  onClient?: (client: OasisEditorClient) => void;
};

export const OasisEditor: React.FC<ReactOasisEditorProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = createOasisMountController();
    if (containerRef.current) {
      controller.mount(containerRef.current, props, props.onClient);
    }
    return (): void => {
      controller.unmount();
    };
  }, []); // mount-only — remount component to apply new config

  return React.createElement("div", {
    ref: containerRef,
    className: props.ui?.class,
    style: props.ui?.style,
  });
};
