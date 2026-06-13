import type { CommandBus } from "../../core/commands/CommandBus.js";
import type { CommandRef } from "../../core/commands/CommandRef.js";
import { resolveCommandRef } from "../../core/commands/CommandRef.js";
import type {
  EditorDocument,
  EditorSelection,
  EditorState,
} from "../../core/model.js";
import type { Editor } from "../../core/Editor.js";
import type { ToolbarCommandState } from "../../ui/components/Toolbar/schema/items.js";
import type {
  InsertTablePayload,
  SetFontSizePayload,
  TypedCommandBus,
} from "../../core/commands/publicCommandTypes.js";

export type OasisEditorClientEvent =
  | "ready"
  | "change"
  | "documentChange"
  | "selectionChange"
  | "error";

export interface OasisEditorClientEvents {
  ready: Editor;
  change: EditorState;
  documentChange: EditorDocument;
  selectionChange: EditorSelection;
  error: unknown;
}

export type OasisEditorClientEventHandler<
  TEvent extends OasisEditorClientEvent = OasisEditorClientEvent,
> = (payload: OasisEditorClientEvents[TEvent]) => void;

export interface OasisEditorDocumentApi {
  get(): EditorDocument;
  set(document: EditorDocument): void;
  load(document: EditorDocument): void;
  update(updater: (document: EditorDocument) => EditorDocument): void;
  reset(): void;
  save(): Promise<void>;
  isDirty(): boolean;
  markClean(): void;
}

export interface OasisEditorSelectionApi {
  get(): EditorSelection;
  set(selection: EditorSelection): void;
}

export interface OasisEditorFocusApi {
  focus(): void;
  blur(): void;
}

export interface OasisEditorHistoryApi {
  undo(): unknown;
  redo(): unknown;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

export interface OasisEditorImportApi {
  docx(file: File): Promise<void>;
}

export interface OasisEditorExportApi {
  docx(): Promise<unknown>;
  pdf(): Promise<unknown>;
}

export interface OasisEditorClient {
  readonly ready: Promise<Editor>;
  readonly commands: TypedCommandBus<ToolbarCommandState>;
  readonly document: OasisEditorDocumentApi;
  readonly selection: OasisEditorSelectionApi;
  readonly focus: OasisEditorFocusApi;
  readonly history: OasisEditorHistoryApi;
  readonly import: OasisEditorImportApi;
  readonly export: OasisEditorExportApi;
  dispose(): void | Promise<void>;
  getState(): EditorState;
  getDocument(): EditorDocument;
  setDocument(document: EditorDocument): void;
  loadDocument(document: EditorDocument): void;
  updateDocument(updater: (document: EditorDocument) => EditorDocument): void;
  resetDocument(): void;
  save(): Promise<void>;
  isDirty(): boolean;
  markClean(): void;
  getSelection(): EditorSelection;
  setSelection(selection: EditorSelection): void;
  focusEditor(): void;
  blurEditor(): void;
  on<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    callback: OasisEditorClientEventHandler<TEvent>,
  ): () => void;
  once<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    callback: OasisEditorClientEventHandler<TEvent>,
  ): () => void;
  off<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    callback: OasisEditorClientEventHandler<TEvent>,
  ): void;
}

export interface OasisEditorClientHost {
  getRuntimeEditor(): Editor | null;
  getState(): EditorState;
  getDocument(): EditorDocument;
  setDocument(document: EditorDocument): void;
  resetDocument(): void;
  saveDocument(): Promise<void>;
  getSelection(): EditorSelection;
  setSelection(selection: EditorSelection): void;
  focus(): void;
  blur(): void;
  clearHistory(): void;
  importDocx(file: File): Promise<void>;
  exportDocx(): Promise<unknown>;
  exportPdf(): Promise<unknown>;
}

export interface OasisEditorClientController extends OasisEditorClient {
  connectHost(host: OasisEditorClientHost): void;
  setDispose(dispose: () => void | Promise<void>): void;
  resolveReady(editor: Editor): void;
  rejectReady(error: unknown): void;
  emit<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    payload: OasisEditorClientEvents[TEvent],
  ): void;
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
    Set<OasisEditorClientEventHandler<OasisEditorClientEvent>>
  >();
  let disposed = false;
  let disposeHost: (() => void | Promise<void>) | undefined;
  let dirty = false;

  const ready = new Promise<Editor>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const emit = <TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    payload: OasisEditorClientEvents[TEvent],
  ) => {
    if (event === "change") {
      dirty = true;
    }
    const handlers = listeners.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      handler(payload);
    }
  };

  const addListener = <TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    callback: OasisEditorClientEventHandler<TEvent>,
  ) => {
    const handlers = listeners.get(event) ?? new Set();
    handlers.add(
      callback as OasisEditorClientEventHandler<OasisEditorClientEvent>,
    );
    listeners.set(event, handlers);
    return () => {
      handlers.delete(
        callback as OasisEditorClientEventHandler<OasisEditorClientEvent>,
      );
      if (handlers.size === 0) listeners.delete(event);
    };
  };

  const getRuntimeEditor = () => host?.getRuntimeEditor() ?? null;
  const requireHost = () => {
    if (!host) throw new Error("Oasis editor client is not mounted.");
    return host;
  };
  const normalizePayload = (command: CommandRef, payloadOverride?: unknown) => {
    const resolved = resolveCommandRef(command, payloadOverride);
    if (
      resolved.name === "insertTable" &&
      resolved.payload &&
      typeof resolved.payload === "object"
    ) {
      const payload = resolved.payload as InsertTablePayload & {
        cols?: number;
      };
      return {
        ...resolved,
        payload: {
          rows: payload.rows,
          cols: payload.cols ?? payload.columns,
        },
      };
    }
    if (
      resolved.name === "setFontSize" &&
      resolved.payload &&
      typeof resolved.payload === "object"
    ) {
      const payload = resolved.payload as SetFontSizePayload;
      return { ...resolved, payload: payload.size };
    }
    return resolved;
  };

  const commands: CommandBus<ToolbarCommandState> = {
    execute(command: CommandRef, payloadOverride?: unknown): unknown {
      const editor = getRuntimeEditor();
      if (!editor) {
        throw new Error("Oasis editor runtime is not ready.");
      }
      const resolved = normalizePayload(command, payloadOverride);
      return editor.commands.execute(resolved.name, resolved.payload);
    },
    canExecute(command: CommandRef, payloadOverride?: unknown): boolean {
      const editor = getRuntimeEditor();
      if (!editor) return false;
      const resolved = normalizePayload(command, payloadOverride);
      return editor.commands.canExecute(resolved.name, resolved.payload);
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
      dirty = false;
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
      return requireHost().getState();
    },
    getDocument() {
      return requireHost().getDocument();
    },
    setDocument(document) {
      requireHost().setDocument(document);
    },
    loadDocument(document) {
      requireHost().setDocument(document);
      dirty = false;
    },
    updateDocument(updater) {
      const current = requireHost().getDocument();
      requireHost().setDocument(updater(current));
    },
    resetDocument() {
      requireHost().resetDocument();
      dirty = false;
    },
    async save() {
      await requireHost().saveDocument();
      dirty = false;
    },
    isDirty() {
      return dirty;
    },
    markClean() {
      dirty = false;
    },
    getSelection() {
      return requireHost().getSelection();
    },
    setSelection(selection) {
      requireHost().setSelection(selection);
    },
    focusEditor() {
      requireHost().focus();
    },
    blurEditor() {
      requireHost().blur();
    },
    document: {
      get: () => requireHost().getDocument(),
      set: (document) => requireHost().setDocument(document),
      load: (document) => {
        requireHost().setDocument(document);
        dirty = false;
      },
      update: (updater) => {
        const current = requireHost().getDocument();
        requireHost().setDocument(updater(current));
      },
      reset: () => {
        requireHost().resetDocument();
        dirty = false;
      },
      save: async () => {
        await requireHost().saveDocument();
        dirty = false;
      },
      isDirty: () => dirty,
      markClean: () => {
        dirty = false;
      },
    },
    selection: {
      get: () => requireHost().getSelection(),
      set: (selection) => requireHost().setSelection(selection),
    },
    focus: {
      focus: () => requireHost().focus(),
      blur: () => requireHost().blur(),
    },
    history: {
      undo: () => commands.execute("undo"),
      redo: () => commands.execute("redo"),
      canUndo: () => commands.canExecute("undo"),
      canRedo: () => commands.canExecute("redo"),
      clear: () => requireHost().clearHistory(),
    },
    import: {
      docx: (file) => requireHost().importDocx(file),
    },
    export: {
      docx: () => requireHost().exportDocx(),
      pdf: () => requireHost().exportPdf(),
    },
    on: addListener,
    once(event, callback) {
      const unsubscribe = addListener(event, (payload) => {
        unsubscribe();
        callback(payload);
      });
      return unsubscribe;
    },
    off(event, callback) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      handlers.delete(
        callback as OasisEditorClientEventHandler<OasisEditorClientEvent>,
      );
      if (handlers.size === 0) listeners.delete(event);
    },
  } as OasisEditorClientController;
}
