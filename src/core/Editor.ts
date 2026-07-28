import { createStore, type SetStoreFunction } from "solid-js/store";
import type { EditorState, EditorDocument } from "./model.js";
import {
  createInitialEditorState,
  createEditorStateFromDocument,
} from "./editorState.js";
import { PluginCollection } from "./plugins/PluginCollection.js";
import { CommandRegistry } from "./commands/CommandRegistry.js";
import { PluginUiRegistry } from "./plugins/PluginUiRegistry.js";
import type {
  OasisCommandContext,
  OasisEditor,
  OasisPlugin,
} from "./plugin.js";
import type { EditorSelection } from "@/core/model.js";

/**
 * Options accepted by the synchronous `new Editor(...)` path. Plugins are
 * deliberately absent: they need async initialization and so are only valid via
 * {@link Editor.create}. Encoding that in the type (rather than a runtime throw)
 * makes the precondition checkable at compile time.
 */
export interface SynchronousEditorOptions {
  doc?: EditorDocument;
  keymaps?: Array<{ key: string; command: string }>;
}

/** Options accepted by the async {@link Editor.create} path, which adds plugins. */
export interface EditorCreateOptions extends SynchronousEditorOptions {
  plugins?: OasisPlugin[];
}

/** Core editor class providing state management, command dispatch, and plugin lifecycle. */
export class Editor implements OasisEditor {
  private stateStore!: EditorState;
  private setState!: SetStoreFunction<EditorState>;
  private pluginCollection!: PluginCollection;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  readonly commands = new CommandRegistry();
  readonly ui = new PluginUiRegistry();

  /**
   * @param options - Options for synchronous construction (no plugins).
   */
  constructor(options: SynchronousEditorOptions = {}) {
    this.initializeState(options);
    this.pluginCollection = new PluginCollection(this, []);
  }

  /**
   * Creates an editor instance asynchronously, initializing all provided plugins.
   * @param options - Options including plugins to load.
   * @returns A promise that resolves to the initialized editor.
   */
  static async create(options: EditorCreateOptions = {}): Promise<Editor> {
    const { plugins = [], ...syncOptions } = options;
    const editor = new Editor(syncOptions);
    editor.pluginCollection = new PluginCollection(editor, plugins);
    await editor.pluginCollection.initializeAll();
    return editor;
  }

  private initializeState(options: SynchronousEditorOptions): void {
    const initialState = options.doc
      ? createEditorStateFromDocument(options.doc)
      : createInitialEditorState();

    const [state, setState] = createStore(initialState);
    this.stateStore = state;
    this.setState = setState;
    this.commands.setContextProvider(() => this.createCommandContext());
  }

  /** @returns The current editor state. */
  get state(): EditorState {
    return this.stateStore;
  }

  /**
   * Applies a state updater function and emits a "change:data" event.
   * @param updater - Function that receives the current state and returns the new state.
   */
  dispatch(updater: (state: EditorState) => EditorState): void {
    const next = updater(this.stateStore);
    this.setState(next);
    this.emit("change:data", this.stateStore);
  }

  /** Destroys the editor, cleaning up plugins, commands, UI, and listeners. */
  async destroy(): Promise<void> {
    await this.pluginCollection.destroy();
    this.commands.clear();
    this.ui.clear();
    this.listeners.clear();
  }

  /**
   * Subscribes to an event.
   * @param event - The event name.
   * @param callback - The handler to invoke when the event fires.
   * @returns An unsubscribe function.
   */
  on(event: string, callback: (...args: unknown[]) => void): () => void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(callback);
    this.listeners.set(event, handlers);
    return (): void => this.off(event, callback);
  }

  /**
   * Subscribes to a single emission of an event.
   * @param event - The event name.
   * @param callback - The handler to invoke once.
   * @returns An unsubscribe function.
   */
  once(event: string, callback: (...args: unknown[]) => void): () => void {
    const wrapper = (...args: unknown[]): void => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Removes a previously subscribed event handler.
   * @param event - The event name.
   * @param callback - The handler to remove.
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.delete(callback);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(...args);
    }
  }

  private createCommandContext(): OasisCommandContext {
    return {
      editor: this,
      commands: this.commands,
      ui: this.ui,
      getState: (): EditorState => this.state,
      getDocument: (): EditorDocument => this.state.document,
      getSelection: (): EditorSelection => this.state.selection,
    };
  }
}
