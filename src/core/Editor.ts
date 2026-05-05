import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import type { EditorState, EditorDocument } from "./model.js";
import { createInitialEditorState, createEditorStateFromDocument } from "./editorState.js";
import { PluginHost } from "./pluginHost.js";
import type { OasisPlugin } from "./plugin.js";

export interface EditorOptions {
  doc?: EditorDocument;
  plugins?: OasisPlugin[];
  keymaps?: Array<{ key: string; command: string }>;
}

export class Editor {
  private stateStore: EditorState;
  private setState: any;
  private pluginHost: PluginHost;

  constructor(options: EditorOptions = {}) {
    const initialState = options.doc 
      ? createEditorStateFromDocument(options.doc)
      : createInitialEditorState();
    
    const [state, setState] = createStore(initialState);
    this.stateStore = state;
    this.setState = setState;

    this.pluginHost = new PluginHost(this, options.plugins ?? []);
  }

  get state(): EditorState {
    return this.stateStore;
  }

  dispatch(updater: (state: EditorState) => EditorState) {
    // Basic dispatch logic, in a real app this would be more complex (transactions)
    const next = updater(this.stateStore);
    this.setState(next);
  }

  destroy() {
    this.pluginHost.destroy();
  }

  on(event: string, callback: (...args: any[]) => void) {
    // Basic event bus placeholder
  }
}
