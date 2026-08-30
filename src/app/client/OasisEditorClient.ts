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

/** UI-related editor state that can be toggled or configured at runtime. */
export interface OasisEditorUiState {
  showChrome?: boolean;
  showTitleBar?: boolean;
  showMenubar?: boolean;
  showToolbar?: boolean;
  showOutline?: boolean;
  shell?: "document" | "inline" | "balloon";
  locale?: "pt-BR" | "en";
  toolbar?: { view?: "ribbon" | "compact"; layout?: "overflow" | "wrap" };
  viewportHeight?: number | string;
  readOnly?: boolean;
}

/** Events emitted by the editor client lifecycle. */
export type OasisEditorClientEvent =
  | "ready"
  | "change"
  | "documentChange"
  | "selectionChange"
  | "uiChange"
  | "error";

/** Payload types associated with each client event. */
export interface OasisEditorClientEvents {
  ready: Editor;
  change: EditorState;
  documentChange: EditorDocument;
  selectionChange: EditorSelection;
  uiChange: OasisEditorUiState;
  error: unknown;
}

/**
 * Handler signature for subscribing to client events.
 * @typeParam TEvent - The specific event type being handled.
 */
export type OasisEditorClientEventHandler<
  TEvent extends OasisEditorClientEvent = OasisEditorClientEvent,
> = (payload: OasisEditorClientEvents[TEvent]) => void;

/** Low-level document CRUD API exposed through the editor client. */
export interface OasisEditorDocumentApi {
  /** Returns the current document. */
  get(): EditorDocument;
  /** @param document - The new document to set. Marks the editor dirty. */
  set(document: EditorDocument): void;
  /** @param document - The document to load. Does NOT mark the editor dirty. */
  load(document: EditorDocument): void;
  /** @param updater - Function that receives the current document and returns the new one. */
  update(updater: (document: EditorDocument) => EditorDocument): void;
  /** Resets the document to its initial empty state. */
  reset(): void;
  /** @returns A promise that resolves once the document is persisted. */
  save(): Promise<void>;
  /** @returns `true` if the document has unsaved changes. */
  isDirty(): boolean;
  /** Marks the document as clean (no unsaved changes). */
  markClean(): void;
  /** @returns A monotonically increasing version counter, incremented on every mutation. */
  version(): number;
}

/** Query API for reading the document without mutation. */
export interface OasisEditorQueryApi {
  /** @returns A snapshot of the entire document (text, outline, nodes). */
  snapshot(): SemanticDocumentSnapshot;
  /**
   * @param target - Optional selector or range to scope the text to.
   * @returns Plain text for the whole document or a specific target/range.
   */
  getText(target?: DocumentSelector | DocumentRange): string;
  /**
   * @param selector - The selector identifying the node.
   * @returns A semantic node descriptor, or `null` if not found.
   */
  getNode(
    selector: DocumentSelector,
  ): ReturnType<ReturnType<typeof queryDocument>["getNode"]>;
  /**
   * @param text - The text to search for.
   * @returns An array of match descriptors.
   */
  find(text: string): ReturnType<ReturnType<typeof queryDocument>["find"]>;
  /** @returns The document outline (heading-based hierarchy). */
  outline(): ReturnType<ReturnType<typeof queryDocument>["outline"]>;
}

/** Edit API for applying structured operations to the document. */
export interface OasisEditorEditApi {
  /**
   * Applies one or more edit operations.
   * @param request - The edit request containing operations and optional version checks.
   * @returns A result indicating success or failure with error details.
   */
  apply(request: ApplyEditRequest): Promise<OasisResult<ApplyEditValue>>;
}

/** Selection read/write API. */
export interface OasisEditorSelectionApi {
  /** @returns The current selection. */
  get(): EditorSelection;
  /** @param selection - The new selection to set. */
  set(selection: EditorSelection): void;
}

/** Focus management API. */
export interface OasisEditorFocusApi {
  /** Focuses the editor input area. */
  focus(): void;
  /** Blurs the editor input area. */
  blur(): void;
}

/** History (undo/redo) API. */
export interface OasisEditorHistoryApi {
  /** @returns The result of undoing the last operation. */
  undo(): unknown;
  /** @returns The result of reapplying the last undone operation. */
  redo(): unknown;
  /** @returns `true` if undo is available. */
  canUndo(): boolean;
  /** @returns `true` if redo is available. */
  canRedo(): boolean;
  /** Clears the entire undo/redo history. */
  clear(): void;
}

/** File import API. */
export interface OasisEditorImportApi {
  /**
   * Imports a .docx file from a browser File object.
   * @param file - The .docx file to import.
   */
  docx(file: File): Promise<void>;
}

/** File export API. */
export interface OasisEditorExportApi {
  /** @returns A promise resolving to the exported .docx data. */
  docx(): Promise<unknown>;
  /** @returns A promise resolving to the exported .pdf data. */
  pdf(): Promise<unknown>;
}

/** Data input/output API with progress reporting and result wrapping. */
export interface OasisEditorDataIoApi {
  /**
   * Imports a document from raw data.
   * @param request - Import configuration including format, data, and optional progress callback.
   * @returns A wrapped result indicating success or failure.
   */
  import(request: {
    format: "docx";
    data: Blob | ArrayBuffer | Uint8Array;
    filename?: string;
    signal?: AbortSignal;
    onProgress?: (progress: unknown) => void;
  }): Promise<OasisResult<{ format: "docx" }>>;
  /**
   * Exports the document as a Blob in the requested format.
   * @param request - Export configuration including format and optional filename.
   * @returns A wrapped result containing the blob.
   */
  export(request: { format: "docx" | "pdf"; filename?: string }): Promise<
    OasisResult<{
      format: "docx" | "pdf";
      blob: Blob;
      arrayBuffer: () => Promise<ArrayBuffer>;
    }>
  >;
}

/** UI configuration and chrome API. */
export interface OasisEditorUiApi {
  /** @returns The current UI state. */
  state(): OasisEditorUiState;
  /**
   * Applies a partial UI state patch.
   * @param patch - The partial state to apply.
   * @returns The new UI state after applying the patch.
   */
  update(patch: OasisEditorUiState): OasisEditorUiState;
  /** @param value - Whether the editor should be read-only. */
  setReadOnly(value: boolean): void;
  /** Zoom controls. */
  zoom: {
    get(): number;
    set(value: number): void;
    adjust(delta: number): void;
  };
  /** Chrome visibility controls. */
  chrome: { setVisible(value: boolean): void };
  /** Title bar visibility control. */
  titleBar: { setVisible(value: boolean): void };
  /** Menubar visibility and item registry. */
  menubar: { setVisible(value: boolean): void; items: MenuRegistry };
  /** Toolbar visibility and item registry. */
  toolbar: { setVisible(value: boolean): void; items: ToolbarRegistry };
  /** Outline panel visibility control. */
  outline: { setVisible(value: boolean): void };
  /** @param value - The shell mode to set. */
  shell: { set(value: "document" | "inline" | "balloon"): void };
  /** @param value - The locale to set. */
  locale: { set(value: "pt-BR" | "en"): void };
}

/**
 * The main public API surface of an Oasis Editor instance. Returned by
 * {@link createOasisEditor} and {@link createOasisEditorContainer}.
 */
export interface OasisEditorClient {
  /** Resolves once the editor runtime is fully initialized. */
  readonly ready: Promise<Editor>;
  /** Typed command bus for dispatching editor commands. */
  readonly commands: TypedCommandBus<ToolbarCommandState>;
  /** Document CRUD API. */
  readonly document: OasisEditorDocumentApi;
  /** Selection API. */
  readonly selection: OasisEditorSelectionApi;
  /** Focus API. */
  readonly focus: OasisEditorFocusApi;
  /** History (undo/redo) API. */
  readonly history: OasisEditorHistoryApi;
  /** File import API. */
  readonly import: OasisEditorImportApi;
  /** File export API. */
  readonly export: OasisEditorExportApi;
  /** Document query API. */
  readonly query: OasisEditorQueryApi;
  /** Document edit API. */
  readonly edit: OasisEditorEditApi;
  /** Data import/export API with result wrapping. */
  readonly io: OasisEditorDataIoApi;
  /** UI configuration API. */
  readonly ui: OasisEditorUiApi;
  /** Disposes the editor, releasing resources. */
  dispose(): void | Promise<void>;
  /** @returns The current editor state. */
  getState(): EditorState;
  /** @returns The current document. */
  getDocument(): EditorDocument;
  /** @param document - The new document to set. Marks the editor dirty. */
  setDocument(document: EditorDocument): void;
  /** @param document - The document to load. Does NOT mark the editor dirty. */
  loadDocument(document: EditorDocument): void;
  /**
   * @param updater - Function that receives the current document and returns the new one.
   */
  updateDocument(updater: (document: EditorDocument) => EditorDocument): void;
  /** Resets the document to its initial state. */
  resetDocument(): void;
  /** @returns A promise that resolves once the document is persisted. */
  save(): Promise<void>;
  /** @returns `true` if the document has unsaved changes. */
  isDirty(): boolean;
  /** Marks the document as clean. */
  markClean(): void;
  /** @returns The current selection. */
  getSelection(): EditorSelection;
  /** @param selection - The new selection to set. */
  setSelection(selection: EditorSelection): void;
  /** Focuses the editor. */
  focusEditor(): void;
  /** Blurs the editor. */
  blurEditor(): void;
  /**
   * Subscribes to a client event.
   * @param event - The event name.
   * @param callback - The handler to invoke when the event fires.
   * @returns An unsubscribe function.
   */
  on<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    callback: OasisEditorClientEventHandler<TEvent>,
  ): () => void;
  /**
   * Subscribes to a single emission of a client event.
   * @param event - The event name.
   * @param callback - The handler to invoke once.
   * @returns An unsubscribe function.
   */
  once<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    callback: OasisEditorClientEventHandler<TEvent>,
  ): () => void;
  /**
   * Removes a previously subscribed event handler.
   * @param event - The event name.
   * @param callback - The handler to remove.
   */
  off<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    callback: OasisEditorClientEventHandler<TEvent>,
  ): void;
}

/**
 * Internal contract used by the host (editor UI shell) to drive the client.
 * Extends the public {@link OasisEditorClient} with connection lifecycle methods.
 */
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

/**
 * Combined interface for the internal client-controller, extending the public
 * API with host connection, disposal, ready resolution, and event emission.
 */
export interface OasisEditorClientController extends OasisEditorClient {
  /** @param host - The host to connect. */
  connectHost(host: OasisEditorClientHost): void;
  /** @param dispose - The dispose function to call on cleanup. */
  setDispose(dispose: () => void | Promise<void>): void;
  /** @param editor - The editor instance that is now ready. */
  resolveReady(editor: Editor): void;
  /** @param error - The error that prevented initialization. */
  rejectReady(error: unknown): void;
  /**
   * Emits a client event.
   * @param event - The event name.
   * @param payload - The event payload.
   */
  emit<TEvent extends OasisEditorClientEvent>(
    event: TEvent,
    payload: OasisEditorClientEvents[TEvent],
  ): void;
}

function disabledCommandState(): ToolbarCommandState {
  return { isEnabled: false, isActive: false, value: undefined };
}

/**
 * Creates a new editor client controller. The client is a lightweight broker
 * that connects the public API surface to the host runtime once mounted.
 *
 * @returns A new {@link OasisEditorClientController} instance.
 */
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
      if (currentHost.applyTransactionalState)
        currentHost.applyTransactionalState((state) => ({
          ...state,
          document: updater(state.document),
        }));
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
      set: (document): void => {
        requireHost().setDocument(document);
        version += 1;
      },
      load: (document): void => {
        requireHost().setDocument(document);
        version += 1;
        dirty = false;
      },
      update: (updater): void => {
        const currentHost = requireHost();
        if (currentHost.applyTransactionalState)
          currentHost.applyTransactionalState((state) => ({
            ...state,
            document: updater(state.document),
          }));
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
      snapshot: (): SemanticDocumentSnapshot =>
        queryDocument(requireHost().getDocument()).snapshot(),
      getText: (target?: DocumentSelector | DocumentRange): string =>
        queryDocument(requireHost().getDocument()).getText(target),
      getNode: (selector: DocumentSelector) =>
        queryDocument(requireHost().getDocument()).getNode(selector),
      find: (text: string) =>
        queryDocument(requireHost().getDocument()).find(text),
      outline: () => queryDocument(requireHost().getDocument()).outline(),
    },
    edit: {
      async apply(
        request: ApplyEditRequest,
      ): Promise<OasisResult<ApplyEditValue>> {
        if (
          request.expectedVersion !== undefined &&
          request.expectedVersion !== version
        ) {
          return {
            ok: false,
            error: {
              code: "DOCUMENT_VERSION_CONFLICT",
              message: "Document version does not match expectedVersion",
              expectedVersion: request.expectedVersion,
              actualVersion: version,
            },
          };
        }
        if (request.idempotencyKey && idempotent.has(request.idempotencyKey))
          return idempotent.get(request.idempotencyKey)!;
        const host = requireHost();
        try {
          const applied = applyDocumentOperations(
            host.getDocument(),
            request.operations,
          );
          if (host.applyTransactionalState)
            host.applyTransactionalState((state) => ({
              ...state,
              document: applied.document,
            }));
          else host.setDocument(applied.document);
          version += 1;
          const result: OasisResult<ApplyEditValue> = {
            ok: true,
            value: applied.value,
            version,
            warnings: [],
          };
          if (request.idempotencyKey)
            idempotent.set(request.idempotencyKey, result);
          return result;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Edit failed";
          const code =
            message === "AMBIGUOUS_SELECTOR"
              ? "AMBIGUOUS_SELECTOR"
              : message === "INVALID_RANGE"
                ? "INVALID_RANGE"
                : message === "VALIDATION_FAILED"
                  ? "VALIDATION_FAILED"
                  : message === "UNSUPPORTED_OPERATION"
                    ? "UNSUPPORTED_OPERATION"
                    : "NODE_NOT_FOUND";
          return { ok: false, error: { code, message } };
        }
      },
    },
    io: {
      async import(request): Promise<OasisResult<{ format: "docx" }>> {
        if (request.signal?.aborted)
          return {
            ok: false,
            error: { code: "ABORTED", message: "Import aborted" },
          };
        try {
          const data =
            request.data instanceof Blob
              ? request.data
              : new Blob([
                  request.data instanceof Uint8Array
                    ? Uint8Array.from(request.data).buffer
                    : request.data,
                ]);
          const file = new File([data], request.filename ?? "document.docx", {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
          await requireHost().importDocx(file);
          version += 1;
          request.onProgress?.({ phase: "done", progress: 100 });
          return { ok: true, value: { format: "docx" }, version, warnings: [] };
        } catch (error) {
          return {
            ok: false,
            error: {
              code: "IMPORT_FAILED",
              message: error instanceof Error ? error.message : "Import failed",
            },
          };
        }
      },
      async export(request): Promise<
        OasisResult<{
          format: "docx" | "pdf";
          blob: Blob;
          arrayBuffer: () => Promise<ArrayBuffer>;
        }>
      > {
        try {
          const value =
            request.format === "docx"
              ? await requireHost().exportDocxBlob()
              : await requireHost().exportPdfBlob();
          return {
            ok: true,
            value: {
              format: request.format,
              blob: value,
              arrayBuffer: () => value.arrayBuffer(),
            },
            version,
            warnings: [],
          };
        } catch (error) {
          return {
            ok: false,
            error: {
              code: "EXPORT_FAILED",
              message: error instanceof Error ? error.message : "Export failed",
            },
          };
        }
      },
    },
    ui: {
      state: (): OasisEditorUiState => requireHost().getUiState?.() ?? {},
      update: (patch: OasisEditorUiState): OasisEditorUiState => {
        const next = requireHost().updateUiState?.(patch) ?? {};
        emit("uiChange", next);
        return next;
      },
      setReadOnly: (value): void => {
        requireHost().updateUiState?.({ readOnly: value });
      },
      zoom: {
        get: (): number => requireHost().getZoom?.() ?? 100,
        set: (value): void => requireHost().setZoom?.(value),
        adjust: (delta): void => requireHost().adjustZoom?.(delta),
      },
      chrome: {
        setVisible: (value): void => {
          requireHost().updateUiState?.({ showChrome: value });
        },
      },
      titleBar: {
        setVisible: (value): void => {
          requireHost().updateUiState?.({ showTitleBar: value });
        },
      },
      menubar: {
        setVisible: (value): void => {
          requireHost().updateUiState?.({ showMenubar: value });
        },
        items: {
          register: (...args) => requireHost().menuRegistry?.register(...args),
          unregister: (id) => requireHost().menuRegistry?.unregister(id),
          getItems: () => requireHost().menuRegistry?.getItems() ?? [],
        } as MenuRegistry,
      },
      toolbar: {
        setVisible: (value): void => {
          requireHost().updateUiState?.({ showToolbar: value });
        },
        items: {
          register: (...args) =>
            requireHost().toolbarRegistry?.register(...args),
          insertBefore: (...args) =>
            requireHost().toolbarRegistry?.insertBefore(...args),
          insertAfter: (...args) =>
            requireHost().toolbarRegistry?.insertAfter(...args),
          replace: (...args) => requireHost().toolbarRegistry?.replace(...args),
          remove: (id) => requireHost().toolbarRegistry?.remove(id),
          move: (...args) => requireHost().toolbarRegistry?.move(...args),
          get: (id) => requireHost().toolbarRegistry?.get(id),
          getOrdered: () => requireHost().toolbarRegistry?.getOrdered() ?? [],
          getItems: () => requireHost().toolbarRegistry?.getItems() ?? [],
          clear: () => requireHost().toolbarRegistry?.clear(),
          onChange: (cb: () => void): (() => void) =>
            requireHost().toolbarRegistry?.onChange(cb) ??
            ((): void => undefined),
        } as ToolbarRegistry,
      },
      outline: {
        setVisible: (value): void => {
          requireHost().updateUiState?.({ showOutline: value });
        },
      },
      shell: {
        set: (shell): void => {
          requireHost().updateUiState?.({ shell });
        },
      },
      locale: {
        set: (locale): void => {
          requireHost().updateUiState?.({ locale });
        },
      },
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
