import { createStore } from "solid-js/store";
import type { EditorState, EditorDocument } from "./model.js";
import { createInitialEditorState, createEditorStateFromDocument } from "./editorState.js";
import { PluginHost } from "./pluginHost.js";
import type { OasisCommand, OasisEditor, OasisPlugin } from "./plugin.js";

export interface EditorOptions {
  doc?: EditorDocument;
  plugins?: OasisPlugin[];
  keymaps?: Array<{ key: string; command: string }>;
}

export class Editor implements OasisEditor {
  private stateStore: EditorState;
  private setState: any;
  private pluginHost: PluginHost;
  private commands = new Map<string, OasisCommand>();
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

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
    this.emit("change:data", this.stateStore);
  }

  registerCommand<TPayload = unknown, TResult = unknown>(
    name: string,
    command: OasisCommand<TPayload, TResult>
  ) {
    this.commands.set(name, command as OasisCommand);
  }

  unregisterCommand(name: string) {
    this.commands.delete(name);
  }

  execute<TPayload = unknown, TResult = unknown>(name: string, payload?: TPayload): TResult {
    const command = this.commands.get(name);
    if (!command) {
      throw new Error(`Unknown command: ${name}`);
    }
    if (!this.canExecute(name)) {
      throw new Error(`Command disabled: ${name}`);
    }
    return command.execute(payload) as TResult;
  }

  canExecute(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) {
      return false;
    }
    if (!command.refresh) {
      return true;
    }
    return command.refresh().isEnabled !== false;
  }

  destroy() {
    this.pluginHost.destroy();
    this.commands.clear();
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
}
