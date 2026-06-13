import type { EditorState } from "./model.js";
import type { Editor } from "./Editor.js";
import type { CommandRef } from "./commands/CommandRef.js";

export type Unsubscribe = () => void;

export interface OasisCommandContext {
  editor: OasisEditor;
  commands: OasisCommandRegistry;
  getState(): EditorState;
  getDocument(): EditorState["document"];
  getSelection(): EditorState["selection"];
}

export interface OasisCommand<TPayload = unknown, TResult = unknown> {
  execute: (payload?: TPayload, context?: OasisCommandContext) => TResult;
  refresh?: (payload?: TPayload, context?: OasisCommandContext) => CommandState;
}

export interface OasisCommandRegistry {
  register: <TPayload = unknown, TResult = unknown>(
    name: string,
    command: OasisCommand<TPayload, TResult>,
  ) => void;
  unregister: (name: string) => void;
  get: (name: string) => OasisCommand | undefined;
  has: (name: string) => boolean;
  execute: <TPayload = unknown, TResult = unknown>(
    name: string,
    payload?: TPayload,
  ) => TResult;
  canExecute: (name: string, payload?: unknown) => boolean;
  state: (name: string, payload?: unknown) => CommandState;
}

export interface CommandState {
  isEnabled: boolean;
  isActive?: boolean;
  value?: unknown;
}

export interface OasisEditor {
  readonly state: EditorState;
  readonly commands: OasisCommandRegistry;
  on: (event: string, callback: (...args: unknown[]) => void) => Unsubscribe;
  once: (event: string, callback: (...args: unknown[]) => void) => Unsubscribe;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

export type PluginReference = string | OasisPlugin;

// Toolbar/menu contribution descriptor. Contributions dispatch exclusively
// through the command registry — register the command in `commands`, then
// reference it here by name. There is no inline-callback escape hatch.
export interface PluginAction {
  id: string;
  command: CommandRef;
  icon?: string;
  group?: string; // e.g. "insert", "format"
}

export interface PluginMenuItem extends PluginAction {
  path: string; // e.g. "Insert/Say hi"
  shortcut?: string;
  separator?: boolean;
  labelKey?: string; // Translation key
}

export interface OasisPlugin {
  name: string;
  requires?: PluginReference[];
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

export type OasisEditorRuntime = Editor;
