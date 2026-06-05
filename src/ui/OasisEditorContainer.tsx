import { OasisEditorApp, type OasisEditorAppProps } from "./OasisEditorApp.js";

export interface OasisEditorContainerProps extends Omit<
  OasisEditorAppProps,
  "ui"
> {
  ui?: Omit<NonNullable<OasisEditorAppProps["ui"]>, "showChrome">;
}

export function OasisEditorContainer(props: OasisEditorContainerProps) {
  return <OasisEditorApp {...props} ui={{ ...props.ui, showChrome: false }} />;
}
