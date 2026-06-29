import type { JSX } from "solid-js";
import { OasisEditorAppLazy } from "./OasisEditorAppLazy.js";
import type { OasisEditorAppProps } from "./OasisEditorApp.js";

export interface OasisEditorContainerProps extends Omit<
  OasisEditorAppProps,
  "ui"
> {
  ui?: Omit<NonNullable<OasisEditorAppProps["ui"]>, "showChrome">;
}

export function OasisEditorContainer(
  props: OasisEditorContainerProps,
): JSX.Element {
  return (
    <OasisEditorAppLazy {...props} ui={{ ...props.ui, showChrome: false }} />
  );
}
