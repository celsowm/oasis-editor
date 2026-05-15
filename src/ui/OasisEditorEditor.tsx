import { Show, createMemo, type Accessor, type JSX } from "solid-js";
import type { IRenderingEngine } from "../core/engine.js";
import { canvasEngine } from "./engines/canvasEngine.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import { SelectionOverlay } from "./components/SelectionOverlay.js";
import { RevisionOverlay } from "./components/RevisionOverlay.js";
import { FloatingTableToolbar } from "./components/FloatingToolbar/FloatingTableToolbar.js";
import type { EditorToolbarCtx } from "./components/Toolbar/types.js";
import { t } from "../i18n/index.js";
import {
  getDocumentParagraphs,
  getDocumentPageSettings,
  getParagraphLength,
  type EditorLayoutParagraph,
  type EditorState,
} from "../core/model.js";
import { getDocumentCharacterCount, getDocumentWordCount } from "../core/editorState.js";
import type { CaretBox, InputBox, RevisionBox, SelectionBox } from "./editorUiTypes.js";
import type { ImageResizeHandleDirection } from "./editorUiTypes.js";

export interface OasisEditorEditorProps {
  state: Accessor<EditorState>;
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, EditorLayoutParagraph>>;
  layoutMode?: "fast" | "wordParity";
  engine?: IRenderingEngine;
  selectionBoxes: Accessor<SelectionBox[]>;
  caretBox: Accessor<CaretBox>;
  inputBox: Accessor<InputBox>;
  hoveredRevision: Accessor<RevisionBox | null>;
  focused: Accessor<boolean>;
  showCaret: Accessor<boolean>;
  importProgress?: Accessor<{
    phase:
      | "reading-file"
      | "opening-docx"
      | "parsing-document"
      | "parsing-headers-footers"
      | "applying-editor-state"
      | "stabilizing-layout"
      | "done"
      | "error";
    progress: number;
    subProgress?: number;
  } | null>;
  toolbarCtx?: () => EditorToolbarCtx;
  showFloatingTableToolbar?: Accessor<boolean>;
  viewportHeight?: number | string;
  class?: string;
  style?: JSX.CSSProperties;
  readOnly?: boolean;
  onViewportRef?: (element: HTMLDivElement) => void;
  onSurfaceRef?: (element: HTMLDivElement) => void;
  onTextareaRef?: (element: HTMLTextAreaElement) => void;
  onImportInputRef?: (element: HTMLInputElement) => void;
  onImageInputRef?: (element: HTMLInputElement) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onEditorMouseDown: (event: MouseEvent) => void;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onParagraphMouseDown: (
    paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
  onImageMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ImageResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTableDragHandleMouseDown: (tableId: string, event: MouseEvent) => void;
  onRevisionMouseEnter: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
  onInputBlur: () => void;
  onInputFocus: () => void;
  onCompositionEnd: (event: CompositionEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onCompositionStart: () => void;
  onCopy: (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onCut: (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onInput: (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onKeyDown: (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onPaste: (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onImportInputChange: (event: Event & { currentTarget: HTMLInputElement }) => void;
  onImageInputChange: (event: Event & { currentTarget: HTMLInputElement }) => void;
}

import { projectDocumentLayout } from "./layoutProjection.js";

export function OasisEditorEditor(props: OasisEditorEditorProps) {
  let scrollContentRef: HTMLDivElement | undefined;
  let viewportElement: HTMLDivElement | undefined;
  const pageSettings = () => getDocumentPageSettings(props.state().document);
  const viewportHeight = () =>
    typeof props.viewportHeight === "number" ? `${props.viewportHeight}px` : props.viewportHeight ?? "min(72vh, 920px)";
  const documentForStats = createMemo(() => props.state().document);
  const characterCount = createMemo(() => getDocumentCharacterCount(documentForStats()));
  const wordCount = createMemo(() => getDocumentWordCount(documentForStats()));

  // Status pagination is deliberately estimated and keyed only by document
  // identity. The measured layout used by EditorSurface updates more often
  // during import/scroll and should not make the statusbar re-project pages.
  const statusDocumentLayout = createMemo(() =>
    props.layoutMode === "wordParity"
      ? projectDocumentLayout(
          documentForStats(),
          undefined,
          props.measuredBlockHeights?.(),
          props.measuredParagraphLayouts?.(),
          { layoutMode: "wordParity" },
        )
      : projectDocumentLayout(documentForStats()),
  );

  const totalPages = () => Math.max(1, statusDocumentLayout().pages.length);
  
  const currentPage = () => {
    const layout = statusDocumentLayout();
    const focusId = props.state().selection.focus.paragraphId;
    const pageIndex = layout.pages.findIndex((page) =>
      page.blocks.some((block) => block.sourceBlockId === focusId)
    );
    return pageIndex === -1 ? 1 : pageIndex + 1;
  };

  return (
    <div
      class={`oasis-editor-editor-shell${props.class ? ` ${props.class}` : ""}`}
      data-testid="editor-editor-shell"
      style={{
        width: `min(${pageSettings().width + 68}px, 100%)`,
        height: "100%",
        "max-height": viewportHeight(),
        ...(props.style ?? {}),
      }}
    >
    <div
      ref={(el) => {
        viewportElement = el;
        props.onViewportRef?.(el);
      }}
      class="oasis-editor-editor"
      data-testid="editor-editor"
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      onMouseDown={props.onEditorMouseDown}
    >
      <div
        ref={(el) => {
          scrollContentRef = el;
          props.onSurfaceRef?.(el);
        }}
        class="oasis-editor-editor-scroll-content"
        data-testid="editor-editor-scroll-content"
      >
        {(() => {
          const Surface = props.engine?.SurfaceComponent ?? canvasEngine.SurfaceComponent;
          return (
            <Surface
              state={props.state}
              measuredBlockHeights={props.measuredBlockHeights}
              measuredParagraphLayouts={props.measuredParagraphLayouts}
              layoutMode={props.layoutMode}
              viewportRef={() => viewportElement ?? undefined}
              onSurfaceMouseDown={props.onSurfaceMouseDown}
              onSurfaceMouseMove={props.onSurfaceMouseMove}
              onSurfaceDblClick={props.onSurfaceDblClick}
              onParagraphMouseDown={props.onParagraphMouseDown}
              onImageMouseDown={props.onImageMouseDown}
              onImageResizeHandleMouseDown={props.onImageResizeHandleMouseDown}
              onTableDragHandleMouseDown={props.onTableDragHandleMouseDown}
              onRevisionMouseEnter={props.onRevisionMouseEnter}
              onRevisionMouseLeave={props.onRevisionMouseLeave}
            />
          );
        })()}

        <Show when={props.hoveredRevision()}>
          {(revision) => <RevisionOverlay box={revision()} />}
        </Show>

        <Show when={props.selectionBoxes().length > 0}>
          <SelectionOverlay boxes={props.selectionBoxes()} />
        </Show>

        <Show when={props.toolbarCtx && props.showFloatingTableToolbar}>
          <FloatingTableToolbar
            ctx={props.toolbarCtx!}
            selectionBoxes={props.selectionBoxes}
            visible={props.showFloatingTableToolbar!}
            surfaceRef={() => scrollContentRef}
          />
        </Show>

        <Show when={props.showCaret()}>
          <CaretOverlay
            active={props.focused()}
            left={props.caretBox().left}
            top={props.caretBox().top}
            height={props.caretBox().height}
          />
        </Show>

        <textarea
          ref={props.onTextareaRef}
          aria-label="Editor input"
          autocomplete="off"
          autocapitalize="off"
          class="oasis-editor-input"
          data-testid="editor-input"
          readOnly={props.readOnly}
          spellcheck={false}
          value=""
          style={{
            left: `${props.inputBox().left}px`,
            top: `${props.inputBox().top}px`,
            height: `${props.inputBox().height}px`,
            "pointer-events": "none",
          }}
          onBlur={props.onInputBlur}
          onCompositionEnd={props.onCompositionEnd}
          onCompositionStart={props.onCompositionStart}
          onCopy={props.onCopy}
          onCut={props.onCut}
          onFocus={props.onInputFocus}
          onInput={props.onInput}
          onKeyDown={props.onKeyDown}
          onPaste={props.onPaste}
        />
        <input
          ref={props.onImportInputRef}
          accept=".docx"
          data-testid="editor-import-docx-input"
          style={{ display: "none" }}
          type="file"
          onChange={props.onImportInputChange}
        />
        <input
          ref={props.onImageInputRef}
          accept="image/png, image/jpeg, image/gif"
          data-testid="editor-insert-image-input"
          style={{ display: "none" }}
          type="file"
          onChange={props.onImageInputChange}
        />
      </div>
    </div>
      <Show when={props.importProgress?.()}>
        {(progress) => {
          const isDone = progress().phase === "done";
          const isError = progress().phase === "error";
          return (
          <div
            class="oasis-editor-import-overlay"
            classList={{
              "oasis-editor-import-overlay-done": isDone,
              "oasis-editor-import-overlay-error": isError,
            }}
            data-testid="editor-import-overlay"
            role="status"
            aria-live="polite"
            aria-busy={!isDone && !isError}
          >
            <div class="oasis-editor-import-card">
              <div class="oasis-editor-import-title">{t("import.overlay.title")}</div>
              <div
                class="oasis-editor-import-phase"
                data-testid="editor-import-phase"
              >
                {t(`import.phase.${progress().phase}` as any)}
              </div>
              <div class="oasis-editor-import-progress-track">
                <div
                  class="oasis-editor-import-progress-bar"
                  classList={{
                    "oasis-editor-import-progress-bar-done": isDone,
                    "oasis-editor-import-progress-bar-error": isError,
                    "oasis-editor-import-progress-bar-indeterminate":
                      progress().phase === "applying-editor-state" ||
                      progress().phase === "stabilizing-layout",
                  }}
                  data-testid="editor-import-progress-bar"
                  style={{ width: `${progress().progress}%` }}
                />
              </div>
              <div class="oasis-editor-import-progress-label">
                {isDone ? (
                  <span class="oasis-editor-import-done-icon">{t("import.phase.done")}</span>
                ) : isError ? (
                  <span class="oasis-editor-import-error-icon">{t("import.phase.error")}</span>
                ) : (
                  <>{Math.round(progress().progress)}%</>
                )}
              </div>
            </div>
          </div>
          );
        }}
      </Show>
      <div
        class="oasis-editor-statusbar"
        data-testid="editor-statusbar"
      >
        <span
          class="oasis-editor-statusbar-item"
          data-testid="editor-statusbar-word-count"
        >
          {t("status.words", [wordCount()])}
        </span>
        <span
          class="oasis-editor-statusbar-item"
          data-testid="editor-statusbar-character-count"
        >
          {t("status.characters", [characterCount()])}
        </span>
        <span class="oasis-editor-statusbar-item">
          {t("status.page", [currentPage(), totalPages()])}
        </span>
        <span class="oasis-editor-statusbar-item">
          {t("status.zoom")}: 100%
        </span>
        <Show when={props.toolbarCtx}>
          {(() => {
            const ctx = props.toolbarCtx!();
            const rawStatus = ctx.persistenceStatus();
            const status = rawStatus.toLowerCase();
            const key = status.includes("saved") ? "status.saved" :
                        status.includes("saving") ? "status.saving" : 
                        status.includes("error") ? "status.error" : null;
            return (
              <Show when={key}>
                <span
                  class={`oasis-editor-statusbar-item oasis-editor-persistence-status oasis-editor-status-${status
                    .replace("...", "ing")
                    .replace(".", "")}`}
                >
                  {t(key as any)}
                </span>
              </Show>
            );
          })()}
        </Show>
      </div>
    </div>
  );
}
