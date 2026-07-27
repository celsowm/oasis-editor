import type { CommandBus } from "@/core/commands/CommandBus.js";
import type {
  CommandRef,
  ResolvedCommandRef,
} from "@/core/commands/CommandRef.js";
import { resolveCommandRef } from "@/core/commands/CommandRef.js";
import type {
  EditorDocument,
  EditorSelection,
  EditorState,
} from "@/core/model.js";
import type { Editor } from "@/core/Editor.js";
import type { ToolbarCommandState } from "@/ui/components/Toolbar/schema/items.js";
import type {
  InsertTablePayload,
  SetFontSizePayload,
  TypedCommandBus,
} from "@/core/commands/publicCommandTypes.js";
import {
  applyDocumentOperations,
  normalizeDocument,
  queryDocument,
  type ApplyEditRequest,
  type ApplyEditValue,
  type DocumentRange,
  type DocumentSelector,
  type OasisResult,
  type SemanticDocumentSnapshot,
} from "./publicDocumentApi.js";
import type { ToolbarRegistry } from "@/ui/components/Toolbar/registry/ToolbarRegistry.js";
import type { MenuRegistry } from "@/ui/components/Menubar/menuRegistry.js";

export interface OasisEditorUiState {
  showChrome?: boolean; showTitleBar?: boolean; showMenubar?: boolean; showToolbar?: boolean; showOutline?: boolean;
  shell?: "document" | "inline" | "balloon"; locale?: "pt-BR" | "en";
  toolbar?: { view?: "ribbon" | "compact"; layout?: "overflow" | "wrap" };
  viewportHeight?: number | string; readOnly?: boolean;
}

export type OasisEditorClientEvent =
  | "ready"
  | "change"
  | "documentChange"
  | "selectionChange"
  | "uiChange"
  | "error";

export interface OasisEditorClientEvents {
  ready: Editor;
  change: EditorState;
  documentChange: EditorDocument;
  selectionChange: EditorSelection;
  uiChange: OasisEditorUiState;
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
  version(): number;
}

export interface OasisEditorQueryApi {
  snapshot(): SemanticDocumentSnapshot;
  getText(target?: DocumentSelector | DocumentRange): string;
  getNode(selector: DocumentSelector): ReturnType<ReturnType<typeof queryDocument>["getNode"]>;
  find(text: string): ReturnType<ReturnType<typeof queryDocument>["find"]>;
  outline(): ReturnType<ReturnType<typeof queryDocument>["outline"]>;
}

export interface OasisEditorEditApi {
  apply(request: ApplyEditRequest): Promise<OasisResult<ApplyEditValue>>;
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

export interface OasisEditorDataIoApi {
  import(request: { format: "docx"; data: Blob | ArrayBuffer | Uint8Array; filename?: string; signal?: AbortSignal; onProgress?: (progress: unknown) => void }): Promise<OasisResult<{ format: "docx" }>>;
  export(request: { format: "docx" | "pdf"; filename?: string }): Promise<OasisResult<{ format: "docx" | "pdf"; blob: Blob; arrayBuffer: () => Promise<ArrayBuffer> }>>;
}
export interface OasisEditorUiApi {
  state(): OasisEditorUiState;
  update(patch: OasisEditorUiState): OasisEditorUiState;
  setReadOnly(value: boolean): void;
  zoom: { get(): number; set(value: number): void; adjust(delta: number): void };
  chrome: { setVisible(value: boolean): void };
  titleBar: { setVisible(value: boolean): void };
  menubar: { setVisible(value: boolean): void; items: MenuRegistry };
  toolbar: { setVisible(value: boolean): void; items: ToolbarRegistry };
  outline: { setVisible(value: boolean): void };
  shell: { set(value: "document" | "inline" | "balloon"): void };
  locale: { set(value: "pt-BR" | "en"): void };
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
  readonly query: OasisEditorQueryApi;
  readonly edit: OasisEditorEditApi;
  readonly io: OasisEditorDataIoApi;
  readonly ui: OasisEditorUiApi;
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
  applyTransactionalState?(producer: (state: EditorState) => EditorState): void;
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
  exportDocxBlob(): Promise<Blob>;
  exportPdfBlob(): Promise<Blob>;
  getUiState?(): OasisEditorUiState;
  updateUiState?(patch: OasisEditorUiState): OasisEditorUiState;
  getZoom?(): number;
  setZoom?(value: number): void;
  adjustZoom?(delta: number): void;
  toolbarRegistry?: ToolbarRegistry;
  menuRegistry?: MenuRegistry;
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
  let version = 0;
  const idempotent = new Map<string, OasisResult<ApplyEditValue>>();

  const ready = new Promise<Editor>((resolve, reject): void => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const emit = <TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    payload: OasisEditorClientEvents[TEvent],
  ): void => {
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
    return (): void => {
      handlers.delete(
        callback as OasisEditorClientEventHandler<OasisEditorClientEvent>,
      );
      if (handlers.size === 0) listeners.delete(event);
    };
  };

  const getRuntimeEditor = (): Editor | null =>
    host?.getRuntimeEditor() ?? null;
  const requireHost = (): OasisEditorClientHost => {
    if (!host) throw new Error("Oasis editor client is not mounted.");
    return host;
  };
  const normalizePayload = (
    command: CommandRef,
    payloadOverride?: unknown,
  ): ResolvedCommandRef => {
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
    connectHost(nextHost): void {
      host = nextHost;
    },
    setDispose(dispose): void {
      disposeHost = dispose;
    },
    resolveReady(editor): void {
      dirty = false;
      resolveReady(editor);
      emit("ready", editor);
    },
    rejectReady(error): void {
      rejectReady(error);
      emit("error", error);
    },
    emit,
    dispose(): void | Promise<void> {
      if (disposed) return;
      disposed = true;
      return disposeHost?.();
    },
    getState(): EditorState {
      return requireHost().getState();
    },
    getDocument(): EditorDocument {
      return requireHost().getDocument();
    },
    setDocument(document): void {
      requireHost().setDocument(document);
      version += 1;
    },
    loadDocument(document): void {
      requireHost().setDocument(document);
      version += 1;
      dirty = false;
    },
    updateDocument(updater): void {
      const currentHost = requireHost();
      if (currentHost.applyTransactionalState) currentHost.applyTransactionalState((state) => ({ ...state, document: updater(state.document) }));
      else currentHost.setDocument(updater(currentHost.getDocument()));
      version += 1;
    },
    resetDocument(): void {
      requireHost().resetDocument();
      version += 1;
      dirty = false;
    },
    async save(): Promise<void> {
      await requireHost().saveDocument();
      dirty = false;
    },
    isDirty(): boolean {
      return dirty;
    },
    markClean(): void {
      dirty = false;
    },
    getSelection(): EditorSelection {
      return requireHost().getSelection();
    },
    setSelection(selection): void {
      requireHost().setSelection(selection);
    },
    focusEditor(): void {
      requireHost().focus();
    },
    blurEditor(): void {
      requireHost().blur();
    },
    document: {
      get: (): EditorDocument => requireHost().getDocument(),
      set: (document): void => { requireHost().setDocument(document); version += 1; },
      load: (document): void => {
        requireHost().setDocument(document);
        version += 1;
        dirty = false;
      },
      update: (updater): void => {
        const currentHost = requireHost();
        if (currentHost.applyTransactionalState) currentHost.applyTransactionalState((state) => ({ ...state, document: updater(state.document) }));
        else currentHost.setDocument(updater(currentHost.getDocument()));
        version += 1;
      },
      reset: (): void => {
        requireHost().resetDocument();
        version += 1;
        dirty = false;
      },
      save: async (): Promise<void> => {
        await requireHost().saveDocument();
        dirty = false;
      },
      isDirty: (): boolean => dirty,
      markClean: (): void => {
        dirty = false;
      },
      version: (): number => version,
    },
    selection: {
      get: (): EditorSelection => requireHost().getSelection(),
      set: (selection): void => requireHost().setSelection(selection),
    },
    focus: {
      focus: (): void => requireHost().focus(),
      blur: (): void => requireHost().blur(),
    },
    history: {
      undo: (): unknown => commands.execute("undo"),
      redo: (): unknown => commands.execute("redo"),
      canUndo: (): boolean => commands.canExecute("undo"),
      canRedo: (): boolean => commands.canExecute("redo"),
      clear: (): void => requireHost().clearHistory(),
    },
    import: {
      docx: (file): Promise<void> => requireHost().importDocx(file),
    },
    export: {
      docx: (): Promise<unknown> => requireHost().exportDocx(),
      pdf: (): Promise<unknown> => requireHost().exportPdf(),
    },
    query: {
      snapshot: (): SemanticDocumentSnapshot => queryDocument(requireHost().getDocument()).snapshot(),
      getText: (target?: DocumentSelector | DocumentRange): string => queryDocument(requireHost().getDocument()).getText(target),
      getNode: (selector: DocumentSelector) => queryDocument(requireHost().getDocument()).getNode(selector),
      find: (text: string) => queryDocument(requireHost().getDocument()).find(text),
      outline: () => queryDocument(requireHost().getDocument()).outline(),
    },
    edit: {
      async apply(request: ApplyEditRequest): Promise<OasisResult<ApplyEditValue>> {
        if (request.expectedVersion !== undefined && request.expectedVersion !== version) {
          return { ok: false, error: { code: "DOCUMENT_VERSION_CONFLICT", message: "Document version does not match expectedVersion", expectedVersion: request.expectedVersion, actualVersion: version } };
        }
        if (request.idempotencyKey && idempotent.has(request.idempotencyKey)) return idempotent.get(request.idempotencyKey)!;
        const host = requireHost();
        try {
          const applied = applyDocumentOperations(host.getDocument(), request.operations);
          if (host.applyTransactionalState) host.applyTransactionalState((state) => ({ ...state, document: applied.document }));
          else host.setDocument(applied.document);
          version += 1;
          const result: OasisResult<ApplyEditValue> = { ok: true, value: applied.value, version, warnings: [] };
          if (request.idempotencyKey) idempotent.set(request.idempotencyKey, result);
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Edit failed";
          const code = message === "AMBIGUOUS_SELECTOR" ? "AMBIGUOUS_SELECTOR" : message === "INVALID_RANGE" ? "INVALID_RANGE" : message === "VALIDATION_FAILED" ? "VALIDATION_FAILED" : message === "UNSUPPORTED_OPERATION" ? "UNSUPPORTED_OPERATION" : "NODE_NOT_FOUND";
          return { ok: false, error: { code, message } };
        }
      },
    },
    io: {
      async import(request): Promise<OasisResult<{ format: "docx" }>> {
        if (request.signal?.aborted) return { ok: false, error: { code: "ABORTED", message: "Import aborted" } };
        try {
          const data = request.data instanceof Blob ? request.data : new Blob([request.data]);
          const file = new File([data], request.filename ?? "document.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
          await requireHost().importDocx(file);
          version += 1;
          request.onProgress?.({ phase: "done", progress: 100 });
          return { ok: true, value: { format: "docx" }, version, warnings: [] };
        } catch (error) {
          return { ok: false, error: { code: "IMPORT_FAILED", message: error instanceof Error ? error.message : "Import failed" } };
        }
      },
      async export(request): Promise<OasisResult<{ format: "docx" | "pdf"; blob: Blob; arrayBuffer: () => Promise<ArrayBuffer> }>> {
        try {
          const value = request.format === "docx" ? await requireHost().exportDocxBlob() : await requireHost().exportPdfBlob();
          return { ok: true, value: { format: request.format, blob: value, arrayBuffer: () => value.arrayBuffer() }, version, warnings: [] };
        } catch (error) {
          return { ok: false, error: { code: "EXPORT_FAILED", message: error instanceof Error ? error.message : "Export failed" } };
        }
      },
    },
    ui: {
      state: (): OasisEditorUiState => requireHost().getUiState?.() ?? {},
      update: (patch: OasisEditorUiState): OasisEditorUiState => { const next = requireHost().updateUiState?.(patch) ?? {}; emit("uiChange", next); return next; },
      setReadOnly: (value): void => { requireHost().updateUiState?.({ readOnly: value }); },
      zoom: { get: (): number => requireHost().getZoom?.() ?? 100, set: (value): void => requireHost().setZoom?.(value), adjust: (delta): void => requireHost().adjustZoom?.(delta) },
      chrome: { setVisible: (value): void => { requireHost().updateUiState?.({ showChrome: value }); } },
      titleBar: { setVisible: (value): void => { requireHost().updateUiState?.({ showTitleBar: value }); } },
      menubar: { setVisible: (value): void => { requireHost().updateUiState?.({ showMenubar: value }); }, items: { register: (...args) => requireHost().menuRegistry?.register(...args), unregister: (id) => requireHost().menuRegistry?.unregister(id), getItems: () => requireHost().menuRegistry?.getItems() ?? [] } as MenuRegistry },
      toolbar: { setVisible: (value): void => { requireHost().updateUiState?.({ showToolbar: value }); }, items: { register: (...args) => requireHost().toolbarRegistry?.register(...args), insertBefore: (...args) => requireHost().toolbarRegistry?.insertBefore(...args), insertAfter: (...args) => requireHost().toolbarRegistry?.insertAfter(...args), replace: (...args) => requireHost().toolbarRegistry?.replace(...args), remove: (id) => requireHost().toolbarRegistry?.remove(id), move: (...args) => requireHost().toolbarRegistry?.move(...args), get: (id) => requireHost().toolbarRegistry?.get(id), getOrdered: () => requireHost().toolbarRegistry?.getOrdered() ?? [], getItems: () => requireHost().toolbarRegistry?.getItems() ?? [], clear: () => requireHost().toolbarRegistry?.clear(), onChange: (cb) => requireHost().toolbarRegistry?.onChange(cb) ?? (() => undefined) } as ToolbarRegistry },
      outline: { setVisible: (value): void => { requireHost().updateUiState?.({ showOutline: value }); } },
      shell: { set: (shell): void => { requireHost().updateUiState?.({ shell }); } },
      locale: { set: (locale): void => { requireHost().updateUiState?.({ locale }); } },
    },
    on: addListener,
    once(event, callback) {
      const unsubscribe = addListener(event, (payload): void => {
        unsubscribe();
        callback(payload);
      });
      return unsubscribe;
    },
    off(event, callback): void {
      const handlers = listeners.get(event);
      if (!handlers) return;
      handlers.delete(
        callback as OasisEditorClientEventHandler<OasisEditorClientEvent>,
      );
      if (handlers.size === 0) listeners.delete(event);
    },
  } as OasisEditorClientController;
}
