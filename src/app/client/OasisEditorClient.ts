import type { CommandBus } from "../../core/commands/CommandBus.js";
import type { CommandRef } from "../../core/commands/CommandRef.js";
import { resolveCommandRef } from "../../core/commands/CommandRef.js";
import type { EditorDocument, EditorState } from "../../core/model.js";
import type { Editor } from "../../core/Editor.js";
import type { ToolbarCommandState } from "../../ui/components/Toolbar/schema/items.js";

export type OasisEditorClientEvent = "ready" | "change" | "error";
export type OasisEditorClientEventHandler = (...args: unknown[]) => void;

export interface OasisEditorClient {
  readonly ready: Promise<Editor>;
  readonly commands: CommandBus<ToolbarCommandState>;
  dispose(): void | Promise<void>;
  getState(): EditorState;
  getDocument(): EditorDocument;
  setDocument(document: EditorDocument): void;
  on(
    event: OasisEditorClientEvent,
    callback: OasisEditorClientEventHandler,
  ): () => void;
  once(
    event: OasisEditorClientEvent,
    callback: OasisEditorClientEventHandler,
  ): () => void;
  off(
    event: OasisEditorClientEvent,
    callback: OasisEditorClientEventHandler,
  ): void;
}

export interface OasisEditorClientHost {
  getRuntimeEditor(): Editor | null;
  getState(): EditorState;
  getDocument(): EditorDocument;
  setDocument(document: EditorDocument): void;
}

export interface OasisEditorClientController extends OasisEditorClient {
  connectHost(host: OasisEditorClientHost): void;
  setDispose(dispose: () => void | Promise<void>): void;
  resolveReady(editor: Editor): void;
  rejectReady(error: unknown): void;
  emit(event: OasisEditorClientEvent, ...args: unknown[]): void;
}

function disabledCommandState(): ToolbarCommandState {
  return { isEnabled: false, isActive: false, value: undefined };
}

export function createOasisEditorClient(): OasisEditorClientController {
  let host: OasisEditorClientHost | null = null;
  let resolveReady!: (editor: Editor) => void;
  let rejectReady!: (error: unknown) => void;
  const listeners = new Map<
    OasisEditorClientEvent,
    Set<OasisEditorClientEventHandler>
  >();
  let disposed = false;
  let disposeHost: (() => void | Promise<void>) | undefined;

  const ready = new Promise<Editor>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const emit = (event: OasisEditorClientEvent, ...args: unknown[]) => {
    const handlers = listeners.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      handler(...args);
    }
  };

  const addListener = (
    event: OasisEditorClientEvent,
    callback: OasisEditorClientEventHandler,
  ) => {
    const handlers = listeners.get(event) ?? new Set();
    handlers.add(callback);
    listeners.set(event, handlers);
    return () => {
      handlers.delete(callback);
      if (handlers.size === 0) listeners.delete(event);
    };
  };

  const getRuntimeEditor = () => host?.getRuntimeEditor() ?? null;

  const commands: CommandBus<ToolbarCommandState> = {
    execute(command: CommandRef, payloadOverride?: unknown): unknown {
      const editor = getRuntimeEditor();
      if (!editor) {
        throw new Error("Oasis editor runtime is not ready.");
      }
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.execute(resolved.name, resolved.payload);
    },
    canExecute(command: CommandRef, payloadOverride?: unknown): boolean {
      const editor = getRuntimeEditor();
      if (!editor) return false;
      const resolved = resolveCommandRef(command, payloadOverride);
      return editor.canExecute(resolved.name, resolved.payload);
    },
    state(command: CommandRef): ToolbarCommandState {
      const editor = getRuntimeEditor();
      if (!editor) return disabledCommandState();
      const resolved = resolveCommandRef(command);
      const registered = editor.commands.get(resolved.name);
      const state = registered?.refresh?.(resolved.payload);
      return {
        isEnabled:
          state?.isEnabled ?? editor.commands.has(resolved.name) ?? false,
        isActive: Boolean(state?.isActive),
        value: state?.value,
      };
    },
  };

  return {
    ready,
    commands,
    connectHost(nextHost) {
      host = nextHost;
    },
    setDispose(dispose) {
      disposeHost = dispose;
    },
    resolveReady(editor) {
      resolveReady(editor);
      emit("ready", editor);
    },
    rejectReady(error) {
      rejectReady(error);
      emit("error", error);
    },
    emit,
    dispose() {
      if (disposed) return;
      disposed = true;
      return disposeHost?.();
    },
    getState() {
      if (!host) throw new Error("Oasis editor client is not mounted.");
      return host.getState();
    },
    getDocument() {
      if (!host) throw new Error("Oasis editor client is not mounted.");
      return host.getDocument();
    },
    setDocument(document) {
      if (!host) throw new Error("Oasis editor client is not mounted.");
      host.setDocument(document);
    },
    on: addListener,
    once(event, callback) {
      const unsubscribe = addListener(event, (...args) => {
        unsubscribe();
        callback(...args);
      });
      return unsubscribe;
    },
    off(event, callback) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      handlers.delete(callback);
      if (handlers.size === 0) listeners.delete(event);
    },
  };
}
