import { OasisEditorApp, type OasisEditorAppProps } from "./OasisEditorApp.js";

export interface OasisEditorContainerProps extends Omit<OasisEditorAppProps, "showChrome"> {}

export function OasisEditorContainer(props: OasisEditorContainerProps) {
  return <OasisEditorApp {...props} showChrome={false} />;
}
