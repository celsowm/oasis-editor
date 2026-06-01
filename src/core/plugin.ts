import type { EditorState } from "./model.js";
import type { Editor } from "./Editor.js";

export type Unsubscribe = () => void;

export interface OasisCommand<TPayload = unknown, TResult = unknown> {
  execute: (payload?: TPayload) => TResult;
  refresh?: () => CommandState;
}

export interface CommandState {
  isEnabled: boolean;
  isActive?: boolean;
  value?: unknown;
}

export interface OasisEditor {
  readonly state: EditorState;
  registerCommand: <TPayload = unknown, TResult = unknown>(
    name: string,
    command: OasisCommand<TPayload, TResult>
  ) => void;
  unregisterCommand: (name: string) => void;
  execute: <TPayload = unknown, TResult = unknown>(name: string, payload?: TPayload) => TResult;
  canExecute: (name: string) => boolean;
  on: (event: string, callback: (...args: unknown[]) => void) => Unsubscribe;
  once: (event: string, callback: (...args: unknown[]) => void) => Unsubscribe;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

// Basic action descriptor for toolbar/menu
export interface PluginAction {
  id: string;
  command?: string;
  icon?: string;
  group?: string; // e.g. "insert", "format"
  action?: (editor: OasisEditor) => void;
}

export interface PluginMenuItem extends PluginAction {
  path: string; // e.g. "Insert/Say hi"
  shortcut?: string;
  separator?: boolean;
  labelKey?: string; // Translation key
}

export interface OasisPlugin {
  name: string;
  schema?: {
    nodes?: Record<string, unknown>;
    marks?: Record<string, unknown>;
  };
  commands?: Record<string, OasisCommand>;
  keymaps?: Array<{ key: string; command: string }>;
  toolbar?: PluginAction[];
  menubar?: PluginMenuItem[];
  init?: (editor: OasisEditor) => void | Promise<void>;
  afterInit?: (editor: OasisEditor) => void | Promise<void>;
  destroy?: (editor: OasisEditor) => void | Promise<void>;
  install?: (editor: OasisEditor) => void | Unsubscribe;
}

// Backward-compat alias while migrating internal API names.
export type OasisPluginDefinition = OasisPlugin;

export type OasisEditorRuntime = Editor;
