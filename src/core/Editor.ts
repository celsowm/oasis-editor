import { createStore, type SetStoreFunction } from "solid-js/store";
import type { EditorState, EditorDocument } from "./model.js";
import {
  createInitialEditorState,
  createEditorStateFromDocument,
} from "./editorState.js";
import { PluginCollection } from "./plugins/PluginCollection.js";
import { CommandRegistry } from "./commands/CommandRegistry.js";
import { PluginUiRegistry } from "./plugins/PluginUiRegistry.js";
import type { OasisEditor, OasisPlugin } from "./plugin.js";

export interface EditorOptions {
  doc?: EditorDocument;
  plugins?: OasisPlugin[];
  keymaps?: Array<{ key: string; command: string }>;
}

export class Editor implements OasisEditor {
  private stateStore!: EditorState;
  private setState!: SetStoreFunction<EditorState>;
  private pluginCollection!: PluginCollection;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  readonly commands = new CommandRegistry();
  readonly ui = new PluginUiRegistry();

  constructor(options: EditorOptions = {}) {
    if (options.plugins && options.plugins.length > 0) {
      throw new Error(
        "Editor plugins must be initialized with Editor.create(...).",
      );
    }
    this.initializeState(options);
    this.pluginCollection = new PluginCollection(this, []);
  }

  static async create(options: EditorOptions = {}): Promise<Editor> {
    const editor = new Editor({ ...options, plugins: [] });
    editor.pluginCollection = new PluginCollection(
      editor,
      options.plugins ?? [],
    );
    await editor.pluginCollection.initializeAll();
    return editor;
  }

  private initializeState(options: EditorOptions) {
    const initialState = options.doc
      ? createEditorStateFromDocument(options.doc)
      : createInitialEditorState();

    const [state, setState] = createStore(initialState);
    this.stateStore = state;
    this.setState = setState;
    this.commands.setContextProvider(() => this.createCommandContext());
  }

  get state(): EditorState {
    return this.stateStore;
  }

  dispatch(updater: (state: EditorState) => EditorState) {
    // Basic dispatch logic, in a real app this would be more complex (transactions)
    const next = updater(this.stateStore);
    this.setState(next);
    this.emit("change:data", this.stateStore);
  }

  async destroy() {
    await this.pluginCollection.destroy();
    this.commands.clear();
    this.ui.clear();
    this.listeners.clear();
  }

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(callback);
    this.listeners.set(event, handlers);
    return () => this.off(event, callback);
  }

  once(event: string, callback: (...args: unknown[]) => void): () => void {
    const wrapper = (...args: unknown[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.delete(callback);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, ...args: unknown[]) {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(...args);
    }
  }

  private createCommandContext() {
    return {
      editor: this,
      commands: this.commands,
      ui: this.ui,
      getState: () => this.state,
      getDocument: () => this.state.document,
      getSelection: () => this.state.selection,
    };
  }
}
