import "./styles/oasis-editor.css";

export { createOasisEditor } from "./app/bootstrap/createOasisEditorApp.js";
export type { OasisEditorInstance } from "./app/bootstrap/createOasisEditorApp.js";

export { createOasisEditorContainer } from "./app/bootstrap/createOasisEditorContainer.js";
export type { OasisEditorContainerInstance } from "./app/bootstrap/createOasisEditorContainer.js";

export { OasisEditorContainer } from "./ui/OasisEditorContainer.js";
export type { OasisEditorContainerProps } from "./ui/OasisEditorContainer.js";
export { Editor } from "./core/Editor.js";
export { CommandRegistry } from "./core/commands/CommandRegistry.js";
export { PluginCollection } from "./core/plugins/PluginCollection.js";
export { mount } from "./ui/mount.js";
export { DocumentShell } from "./ui/shells/DocumentShell.js";
export { InlineShell } from "./ui/shells/InlineShell.js";
export { BalloonShell } from "./ui/shells/BalloonShell.js";
export type {
  OasisPlugin,
  OasisPluginDefinition,
  OasisEditor,
  OasisCommand,
  OasisCommandRegistry,
  CommandState,
  PluginReference,
  Unsubscribe,
} from "./core/plugin.js";
