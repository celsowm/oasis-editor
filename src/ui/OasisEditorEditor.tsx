import { Show, createEffect, createMemo, createSignal, onCleanup, type Accessor, type JSX } from "solid-js";
import { CanvasEditorSurface } from "./components/CanvasEditorSurface.js";
import { HorizontalRuler } from "./components/Ruler/HorizontalRuler.js";
import { EDITOR_SCROLL_PADDING_PX } from "./editorLayoutConstants.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import { SelectionOverlay } from "./components/SelectionOverlay.js";
import { RevisionOverlay } from "./components/RevisionOverlay.js";
import { FloatingTableToolbar } from "./components/FloatingToolbar/FloatingTableToolbar.js";
import type { ToolbarHost } from "./components/Toolbar/state/createToolbarApi.js";
import { t } from "../i18n/index.js";
import {
  getDocumentPageSettings,
  type EditorLayoutParagraph,
  type EditorState,
} from "../core/model.js";
import { getDocumentCharacterCount, getDocumentWordCount } from "../core/editorState.js";
import type { CaretBox, InputBox, RevisionBox, SelectedImageBox, SelectionBox } from "./editorUiTypes.js";
import type { ImageResizeHandleDirection } from "./editorUiTypes.js";
import { projectDocumentLayout } from "../layoutProjection/index.js";

type ImportProgress = {
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
};

export interface OasisEditorEditorLayoutProps {
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, EditorLayoutParagraph>>;
  layoutMode?: "fast" | "wordParity";
  viewportHeight?: number | string;
  class?: string;
  style?: JSX.CSSProperties;
  readOnly?: boolean;
  showHorizontalRuler?: boolean;
}

export interface OasisEditorEditorOverlayProps {
  selectionBoxes: Accessor<SelectionBox[]>;
  selectedImageBox: Accessor<SelectedImageBox | null>;
  caretBox: Accessor<CaretBox>;
  inputBox: Accessor<InputBox>;
  hoveredRevision: Accessor<RevisionBox | null>;
  focused: Accessor<boolean>;
  showCaret: Accessor<boolean>;
  importProgress?: Accessor<ImportProgress | null>;
  toolbarHost?: () => ToolbarHost;
  persistenceStatus?: () => string;
  showFloatingTableToolbar?: Accessor<boolean>;
}

export interface OasisEditorEditorRefProps {
  onViewportRef?: (element: HTMLDivElement) => void;
  onSurfaceRef?: (element: HTMLDivElement) => void;
  onTextareaRef?: (element: HTMLTextAreaElement) => void;
  onImportInputRef?: (element: HTMLInputElement) => void;
  onImageInputRef?: (element: HTMLInputElement) => void;
}

export interface OasisEditorEditorSurfaceHandlers {
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onEditorMouseDown: (event: MouseEvent) => void;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
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
  onEditorContextMenu?: (event: MouseEvent) => void;
}

export interface OasisEditorEditorInputHandlers {
  onInputBlur: () => void;
  onInputFocus: () => void;
  onCompositionEnd: (event: CompositionEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onCompositionStart: () => void;
  onCopy: (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onCut: (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onInput: (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onKeyDown: (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onPaste: (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => void;
}

export interface OasisEditorEditorFileHandlers {
  onImportInputChange: (event: Event & { currentTarget: HTMLInputElement }) => void;
  onImageInputChange: (event: Event & { currentTarget: HTMLInputElement }) => void;
}

export interface OasisEditorEditorProps {
  state: Accessor<EditorState>;
  layout?: OasisEditorEditorLayoutProps;
  overlays: OasisEditorEditorOverlayProps;
  refs?: OasisEditorEditorRefProps;
  surfaceHandlers: OasisEditorEditorSurfaceHandlers;
  inputHandlers: OasisEditorEditorInputHandlers;
  fileHandlers: OasisEditorEditorFileHandlers;
}

export function OasisEditorEditor(props: OasisEditorEditorProps) {
  const layout = () => props.layout ?? {};
  const overlays = () => props.overlays;
  const refs = () => props.refs ?? {};
  const surfaceHandlers = () => props.surfaceHandlers;
  const inputHandlers = () => props.inputHandlers;
  const fileHandlers = () => props.fileHandlers;
  let scrollContentRef: HTMLDivElement | undefined;
  let viewportElement: HTMLDivElement | undefined;
  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | undefined>();
  const pageSettings = () => getDocumentPageSettings(props.state().document);
  const viewportHeight = (): string => {
    const rawViewportHeight = layout().viewportHeight;
    if (typeof rawViewportHeight === "number") {
      return `${rawViewportHeight}px`;
    }
    return rawViewportHeight ?? "min(72vh, 920px)";
  };
  const shellStyle = createMemo<JSX.CSSProperties>(() => ({
    width: `min(${pageSettings().width + EDITOR_SCROLL_PADDING_PX * 2}px, 100%)`,
    height: "100%",
    "max-height": viewportHeight(),
    ...(layout().style ?? {}),
  }));
  const documentForStats = createMemo(() => props.state().document);
  const characterCount = createMemo(() => getDocumentCharacterCount(documentForStats()));
  const wordCount = createMemo(() => getDocumentWordCount(documentForStats()));

  const statusDocumentLayout = createMemo(() =>
    layout().layoutMode === "wordParity"
      ? projectDocumentLayout(
          documentForStats(),
          undefined,
          layout().measuredBlockHeights?.(),
          layout().measuredParagraphLayouts?.(),
          { layoutMode: "wordParity" },
        )
      : projectDocumentLayout(documentForStats()),
  );

  const totalPages = () => Math.max(1, statusDocumentLayout().pages.length);
  const [viewportPageIndex, setViewportPageIndex] = createSignal<number | null>(null);

  const recomputeViewportPageIndex = () => {
    const viewport = viewportElement;
    if (!viewport) {
      setViewportPageIndex(null);
      return;
    }
    const pageElements = Array.from(
      viewport.querySelectorAll<HTMLElement>(".oasis-editor-paper[data-page-index]"),
    );
    if (pageElements.length === 0) {
      setViewportPageIndex(null);
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenterY = viewportRect.top + viewportRect.height * 0.5;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const pageElement of pageElements) {
      const pageRect = pageElement.getBoundingClientRect();
      const pageCenterY = pageRect.top + pageRect.height * 0.5;
      const distance = Math.abs(pageCenterY - viewportCenterY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = Number(pageElement.dataset.pageIndex ?? "0");
      }
    }

    setViewportPageIndex(Number.isFinite(bestIndex) ? bestIndex : null);
  };

  const currentPage = () => {
    const visiblePageIndex = viewportPageIndex();
    if (visiblePageIndex !== null) {
      return Math.max(1, visiblePageIndex + 1);
    }
    const projectedLayout = statusDocumentLayout();
    const focusId = props.state().selection.focus.paragraphId;
    const pageIndex = projectedLayout.pages.findIndex((page) =>
      page.blocks.some((block) => block.sourceBlockId === focusId),
    );
    return pageIndex === -1 ? 1 : pageIndex + 1;
  };

  const selectedImage = createMemo(() => overlays().selectedImageBox());

  createEffect(() => {
    statusDocumentLayout();
    queueMicrotask(recomputeViewportPageIndex);
  });

  const handleResizeHandleMouseDown = (
    direction: ImageResizeHandleDirection,
    image: SelectedImageBox,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    surfaceHandlers().onImageResizeHandleMouseDown(
      image.paragraphId,
      image.startOffset,
      direction,
      event,
    );
  };

  return (
    <div
      class={`oasis-editor-editor-shell${layout().class ? ` ${layout().class}` : ""}`}
      data-testid="editor-editor-shell"
      style={shellStyle()}
    >
      <Show when={layout().showHorizontalRuler && overlays().toolbarHost}>
        <HorizontalRuler
          state={props.state}
          toolbarHost={overlays().toolbarHost!}
          viewportRef={viewportRef}
          readOnly={() => Boolean(layout().readOnly)}
        />
      </Show>
      <div
        ref={(el) => {
          viewportElement = el;
          setViewportRef(el);
          refs().onViewportRef?.(el);
          const onScroll = () => {
            recomputeViewportPageIndex();
          };
          el.addEventListener("scroll", onScroll, { passive: true });
          queueMicrotask(recomputeViewportPageIndex);
          onCleanup(() => {
            el.removeEventListener("scroll", onScroll);
          });
        }}
        class="oasis-editor-editor"
        data-testid="editor-editor"
        onDragOver={surfaceHandlers().onDragOver}
        onDrop={surfaceHandlers().onDrop}
        onMouseDown={surfaceHandlers().onEditorMouseDown}
        onContextMenu={surfaceHandlers().onEditorContextMenu}
      >
        <div
          ref={(el) => {
            scrollContentRef = el;
            refs().onSurfaceRef?.(el);
          }}
          class="oasis-editor-editor-scroll-content"
          data-testid="editor-editor-scroll-content"
        >
          <CanvasEditorSurface
            state={props.state}
            measuredBlockHeights={layout().measuredBlockHeights}
            measuredParagraphLayouts={layout().measuredParagraphLayouts}
            layoutMode={layout().layoutMode}
            viewportRef={() => viewportElement ?? undefined}
            onSurfaceMouseDown={surfaceHandlers().onSurfaceMouseDown}
            onSurfaceClick={surfaceHandlers().onSurfaceClick}
            onSurfaceMouseMove={surfaceHandlers().onSurfaceMouseMove}
            onSurfaceDblClick={surfaceHandlers().onSurfaceDblClick}
            onParagraphMouseDown={surfaceHandlers().onParagraphMouseDown}
            onImageMouseDown={surfaceHandlers().onImageMouseDown}
            onImageResizeHandleMouseDown={surfaceHandlers().onImageResizeHandleMouseDown}
            onTableDragHandleMouseDown={surfaceHandlers().onTableDragHandleMouseDown}
            onRevisionMouseEnter={surfaceHandlers().onRevisionMouseEnter}
            onRevisionMouseLeave={surfaceHandlers().onRevisionMouseLeave}
          />

          <Show when={overlays().hoveredRevision()}>
            {(revision) => <RevisionOverlay box={revision()} />}
          </Show>

          <Show when={overlays().selectionBoxes().length > 0}>
            <SelectionOverlay boxes={overlays().selectionBoxes()} />
          </Show>

          <div
            aria-hidden="true"
            class="oasis-editor-image-selection-overlay"
            style={{
              display: selectedImage() ? undefined : "none",
              left: `${selectedImage()?.left ?? 0}px`,
              top: `${selectedImage()?.top ?? 0}px`,
              width: `${selectedImage()?.width ?? 0}px`,
              height: `${selectedImage()?.height ?? 0}px`,
              "pointer-events": !layout().readOnly && selectedImage() ? "auto" : "none",
            }}
            onMouseDown={(event) => {
              const image = selectedImage();
              if (layout().readOnly || !image) {
                return;
              }
              event.preventDefault();
              surfaceHandlers().onImageMouseDown(
                image.paragraphId,
                image.startOffset,
                event as MouseEvent & { currentTarget: HTMLElement },
              );
            }}
          >
            {!layout().readOnly && (
              <>
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="nw"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "nw",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="n"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "n",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="ne"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "ne",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="e"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "e",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="se"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "se",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="s"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "s",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="sw"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "sw",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
                <button
                  aria-hidden="true"
                  class="oasis-editor-image-resize-handle"
                  data-direction="w"
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(event) => {
                    const image = selectedImage();
                    if (!image) return;
                    handleResizeHandleMouseDown(
                      "w",
                      image,
                      event as MouseEvent & { currentTarget: HTMLElement },
                    );
                  }}
                />
              </>
            )}
          </div>

          <Show when={overlays().toolbarHost && overlays().showFloatingTableToolbar}>
            <FloatingTableToolbar
              host={overlays().toolbarHost!}
              selectionBoxes={overlays().selectionBoxes}
              visible={overlays().showFloatingTableToolbar!}
              surfaceRef={() => scrollContentRef}
            />
          </Show>

          <Show when={overlays().showCaret()}>
            <CaretOverlay
              active={overlays().focused()}
              left={overlays().caretBox().left}
              top={overlays().caretBox().top}
              height={overlays().caretBox().height}
            />
          </Show>

          <textarea
            ref={refs().onTextareaRef}
            aria-label="Editor input"
            autocomplete="off"
            autocapitalize="off"
            class="oasis-editor-input"
            data-testid="editor-input"
            readOnly={layout().readOnly}
            spellcheck={false}
            value=""
            style={{
              left: `${overlays().inputBox().left}px`,
              top: `${overlays().inputBox().top}px`,
              height: `${overlays().inputBox().height}px`,
              "pointer-events": "none",
            }}
            onBlur={inputHandlers().onInputBlur}
            onCompositionEnd={inputHandlers().onCompositionEnd}
            onCompositionStart={inputHandlers().onCompositionStart}
            onCopy={inputHandlers().onCopy}
            onCut={inputHandlers().onCut}
            onFocus={inputHandlers().onInputFocus}
            onInput={inputHandlers().onInput}
            onKeyDown={inputHandlers().onKeyDown}
            onPaste={inputHandlers().onPaste}
          />
          <input
            ref={refs().onImportInputRef}
            accept=".docx"
            data-testid="editor-import-docx-input"
            style={{ display: "none" }}
            type="file"
            onChange={fileHandlers().onImportInputChange}
          />
          <input
            ref={refs().onImageInputRef}
            accept="image/png, image/jpeg, image/gif"
            data-testid="editor-insert-image-input"
            style={{ display: "none" }}
            type="file"
            onChange={fileHandlers().onImageInputChange}
          />
        </div>
      </div>
      <Show when={overlays().importProgress?.()}>
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
        <Show when={overlays().persistenceStatus}>
          {(() => {
            const rawStatus = overlays().persistenceStatus!();
            const status = rawStatus.toLowerCase();
            const key = status.includes("saved")
              ? "status.saved"
              : status.includes("saving")
                ? "status.saving"
                : status.includes("error")
                  ? "status.error"
                  : null;
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
