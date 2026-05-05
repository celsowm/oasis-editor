import type { EditorState, EditorDocument } from "./model.js";

// Basic action descriptor for toolbar/menu
export interface PluginAction {
  id: string;
  command?: string;
  icon?: string;
  group?: string; // e.g. "insert", "format"
  action?: (ctx: any) => void;
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
    nodes?: Record<string, any>;
    marks?: Record<string, any>;
  };
  commands?: Record<string, (deps: { dispatch: any, state: EditorState }) => any>;
  keymaps?: Array<{ key: string; command: string }>;
  toolbar?: PluginAction[];
  menubar?: PluginMenuItem[];
  install?: (editor: any) => () => void;
}
