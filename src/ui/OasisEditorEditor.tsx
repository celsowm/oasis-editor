import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Accessor,
  type JSX,
} from "solid-js";
import { CanvasEditorSurface } from "./components/CanvasEditorSurface.js";
import { OasisBrandMark } from "./components/OasisBrandMark.js";
import { HorizontalRuler } from "./components/Ruler/HorizontalRuler.js";
import {
  EDITOR_SCROLL_PADDING_PX,
  EDITOR_SCROLLBAR_RESERVE_PX,
} from "./editorLayoutConstants.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import { SelectionOverlay } from "./components/SelectionOverlay.js";
import { RevisionOverlay } from "./components/RevisionOverlay.js";
import { CommentHighlightOverlay } from "./components/CommentHighlightOverlay.js";
import { FloatingTableToolbar } from "./components/FloatingToolbar/FloatingTableToolbar.js";
import { FloatingLayoutOptions } from "./components/FloatingToolbar/FloatingLayoutOptions.js";
import type { ToolbarHost } from "./components/Toolbar/state/createToolbarApi.js";
import { t } from "@/i18n/index.js";
import {
  getDocumentPageSettings,
  getDocumentSections,
  type EditorLayoutParagraph,
  type EditorState,
} from "@/core/model.js";
import {
  getDocumentCharacterCount,
  getDocumentWordCount,
} from "@/core/editorState.js";
import { importFileAccept } from "@/import/documentImporterRegistry.js";
import type { ImportProgressState } from "@/app/controllers/useEditorDocumentIO.js";
import type {
  CaretBox,
  CommentHighlightBox,
  InputBox,
  LayoutOptionsOverlay,
  RevisionBox,
  SelectedImageBox,
  SelectedTextBoxBox,
  SelectionBox,
} from "./editorUiTypes.js";
import type { EditorComment } from "@/core/model.js";
import type { ResizeHandleDirection } from "./resizeGeometry.js";
import { ResizeHandlesOverlay } from "./overlays/ResizeHandlesOverlay.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";
import {
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  clampZoom,
} from "./app/editorZoom.js";

type ImportProgress = ImportProgressState;

export interface OasisEditorEditorLayoutProps {
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, EditorLayoutParagraph>>;
  viewportHeight?: number | string;
  class?: string;
  style?: JSX.CSSProperties;
  readOnly?: boolean;
  showHorizontalRuler?: boolean;
  // Lifted zoom state (owned by OasisEditorApp). When absent the editor falls
  // back to a local signal so it still works when rendered standalone.
  zoomPercent?: Accessor<number>;
  setZoomPercent?: (value: number) => void;
  zoomFactor?: Accessor<number>;
}

export interface OasisEditorEditorOverlayProps {
  selectionBoxes: Accessor<SelectionBox[]>;
  commentHighlights: Accessor<CommentHighlightBox[]>;
  selectedImageBox: Accessor<SelectedImageBox | null>;
  selectedTextBoxBox: Accessor<SelectedTextBoxBox | null>;
  caretBox: Accessor<CaretBox>;
  inputBox: Accessor<InputBox>;
  hoveredRevision: Accessor<RevisionBox | null>;
  focused: Accessor<boolean>;
  showCaret: Accessor<boolean>;
  importProgress?: Accessor<ImportProgress | null>;
  toolbarHost?: () => ToolbarHost;
  persistenceStatus?: () => string;
  showFloatingTableToolbar?: Accessor<boolean>;
  layoutOptions?: LayoutOptionsOverlay;
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
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageRotateHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxRotateHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
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
  onCompositionEnd: (
    event: CompositionEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onCompositionStart: () => void;
  onCopy: (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onCut: (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onInput: (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onKeyDown: (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onPaste: (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
}

export interface OasisEditorEditorFileHandlers {
  onImportInputChange: (
    event: Event & { currentTarget: HTMLInputElement },
  ) => void;
  onImageInputChange: (
    event: Event & { currentTarget: HTMLInputElement },
  ) => void;
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
  const [viewportRef, setViewportRef] = createSignal<
    HTMLDivElement | undefined
  >();
  const pageSettings = () => getDocumentPageSettings(props.state().document);
  // The widest page across all sections drives the shell width. Orientation is a
  // per-section setting, so a landscape section must be able to widen the editor
  // even when the document-level page settings stay portrait — otherwise the
  // wider page overflows and forces a horizontal scrollbar.
  const widestPageWidth = () =>
    getDocumentSections(props.state().document).reduce(
      (max, section) => Math.max(max, section.pageSettings.width),
      0,
    ) || pageSettings().width;
  const viewportHeight = (): string => {
    const rawViewportHeight = layout().viewportHeight;
    if (typeof rawViewportHeight === "number") {
      return `${rawViewportHeight}px`;
    }
    return rawViewportHeight ?? "min(72vh, 920px)";
  };
  const shellStyle = createMemo<JSX.CSSProperties>(() => ({
    // pageWidth + both horizontal gutters + the reserved vertical-scrollbar
    // gutter. The paper is width:100% of the scroll content and
    // `.oasis-editor-editor` reserves the scrollbar via `scrollbar-gutter:
    // stable`, so this keeps the paper exactly `pageWidth` while leaving room for
    // the scrollbar — preventing a spurious horizontal scrollbar (notably in
    // landscape) and letting the editor area grow to fit a wider page.
    width: `min(${
      widestPageWidth() +
      EDITOR_SCROLL_PADDING_PX * 2 +
      EDITOR_SCROLLBAR_RESERVE_PX
    }px, 100%)`,
    height: "100%",
    "max-height": viewportHeight(),
    ...(layout().style ?? {}),
  }));
  const documentForStats = createMemo(() => props.state().document);
  const characterCount = createMemo(() =>
    getDocumentCharacterCount(documentForStats()),
  );
  const wordCount = createMemo(() => getDocumentWordCount(documentForStats()));

  // Zoom state is owned by OasisEditorApp (so the geometry controllers can read
  // it) and threaded in via the layout props. When rendered standalone we fall
  // back to a local signal so the control still works.
  const [localZoomPercent, setLocalZoomPercent] = createSignal(100);
  const zoomPercent = () => layout().zoomPercent?.() ?? localZoomPercent();
  const setZoomPercent = (value: number) => {
    const clamped = clampZoom(value);
    const lift = layout().setZoomPercent;
    if (lift) lift(clamped);
    else setLocalZoomPercent(clamped);
  };
  const adjustZoom = (delta: number) => setZoomPercent(zoomPercent() + delta);
  // z = zoomFactor(): visual scale applied to the shared document layer
  // (.oasis-editor-editor-scroll-content). Because the canvas AND every overlay
  // live inside that layer, scaling it keeps them aligned automatically. Layout
  // stays in unscaled CSS px; the surrounding ".oasis-editor-editor-zoom-sizer"
  // reserves the *scaled* visual size so the scrollbars can reach every edge
  // (CSS transforms don't change layout box size).
  const fallbackZoomFactor = createMemo(() => clampZoom(zoomPercent()) / 100);
  const zoomFactor = () => layout().zoomFactor?.() ?? fallbackZoomFactor();

  const [measuredContentHeight, setMeasuredContentHeight] = createSignal(0);
  const [viewportSize, setViewportSize] = createSignal({
    width: 0,
    height: 0,
  });

  const unscaledContentWidth = () =>
    widestPageWidth() + EDITOR_SCROLL_PADDING_PX * 2;

  const zoomSizerWidth = createMemo(() =>
    Math.max(unscaledContentWidth() * zoomFactor(), viewportSize().width),
  );
  const zoomSizerHeight = createMemo(() =>
    Math.max(measuredContentHeight() * zoomFactor(), viewportSize().height),
  );
  // transform-origin is top-left, so the scaled box spans [left, left + w*z].
  // Center it horizontally within the sizer.
  const zoomLayerLeft = createMemo(() =>
    Math.max(
      0,
      (zoomSizerWidth() - unscaledContentWidth() * zoomFactor()) / 2,
    ),
  );

  const statusDocumentLayout = createMemo(() =>
    projectDocumentLayout(
      documentForStats(),
      undefined,
      layout().measuredBlockHeights?.(),
      layout().measuredParagraphLayouts?.(),
    ),
  );

  const totalPages = () => Math.max(1, statusDocumentLayout().pages.length);
  const [viewportPageIndex, setViewportPageIndex] = createSignal<number | null>(
    null,
  );

  const recomputeViewportPageIndex = () => {
    const viewport = viewportElement;
    if (!viewport) {
      setViewportPageIndex(null);
      return;
    }
    const pageElements = Array.from(
      viewport.querySelectorAll<HTMLElement>(
        ".oasis-editor-paper[data-page-index]",
      ),
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
  const selectedTextBox = createMemo(() => overlays().selectedTextBoxBox());
  const commentsById = createMemo<Record<string, EditorComment>>(
    () => props.state().document.comments?.items ?? {},
  );

  createEffect(() => {
    statusDocumentLayout();
    queueMicrotask(recomputeViewportPageIndex);
  });

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
          const updateViewportSize = () => {
            setViewportSize({ width: el.clientWidth, height: el.clientHeight });
          };
          updateViewportSize();
          let viewportObserver: ResizeObserver | undefined;
          if (typeof ResizeObserver !== "undefined") {
            viewportObserver = new ResizeObserver(updateViewportSize);
            viewportObserver.observe(el);
          }
          onCleanup(() => {
            el.removeEventListener("scroll", onScroll);
            viewportObserver?.disconnect();
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
          class="oasis-editor-editor-zoom-sizer"
          style={{
            width: `${zoomSizerWidth()}px`,
            height: `${zoomSizerHeight()}px`,
          }}
        >
        <div
          ref={(el) => {
            scrollContentRef = el;
            refs().onSurfaceRef?.(el);
            const updateContentHeight = () => {
              setMeasuredContentHeight(el.offsetHeight);
            };
            updateContentHeight();
            queueMicrotask(updateContentHeight);
            let contentObserver: ResizeObserver | undefined;
            if (typeof ResizeObserver !== "undefined") {
              contentObserver = new ResizeObserver(updateContentHeight);
              contentObserver.observe(el);
            }
            onCleanup(() => contentObserver?.disconnect());
          }}
          class="oasis-editor-editor-scroll-content"
          data-testid="editor-editor-scroll-content"
          style={{
            position: "absolute",
            top: "0px",
            left: `${zoomLayerLeft()}px`,
            width: `${unscaledContentWidth()}px`,
            // Fill at least the viewport (in unscaled px) without feeding back
            // into the sizer height (which is derived from measured content).
            "min-height": `${viewportSize().height / zoomFactor()}px`,
            transform: `scale(${zoomFactor()})`,
            "transform-origin": "top left",
          }}
        >
          <CanvasEditorSurface
            state={props.state}
            measuredBlockHeights={layout().measuredBlockHeights}
            measuredParagraphLayouts={layout().measuredParagraphLayouts}
            viewportRef={() => viewportElement ?? undefined}
            onSurfaceMouseDown={surfaceHandlers().onSurfaceMouseDown}
            onSurfaceClick={surfaceHandlers().onSurfaceClick}
            onSurfaceMouseMove={surfaceHandlers().onSurfaceMouseMove}
            onSurfaceDblClick={surfaceHandlers().onSurfaceDblClick}
            onParagraphMouseDown={surfaceHandlers().onParagraphMouseDown}
            onImageMouseDown={surfaceHandlers().onImageMouseDown}
            onImageResizeHandleMouseDown={
              surfaceHandlers().onImageResizeHandleMouseDown
            }
            onTextBoxResizeHandleMouseDown={
              surfaceHandlers().onTextBoxResizeHandleMouseDown
            }
            onTableDragHandleMouseDown={
              surfaceHandlers().onTableDragHandleMouseDown
            }
            onRevisionMouseEnter={surfaceHandlers().onRevisionMouseEnter}
            onRevisionMouseLeave={surfaceHandlers().onRevisionMouseLeave}
          />

          <Show when={overlays().hoveredRevision()}>
            {(revision) => <RevisionOverlay box={revision()} />}
          </Show>

          <Show when={overlays().selectionBoxes().length > 0}>
            <SelectionOverlay boxes={overlays().selectionBoxes()} />
          </Show>

          <Show when={overlays().commentHighlights().length > 0}>
            <CommentHighlightOverlay
              boxes={overlays().commentHighlights}
              commentsById={commentsById}
            />
          </Show>

          <ResizeHandlesOverlay
            box={selectedImage}
            readOnly={Boolean(layout().readOnly)}
            variantClass="oasis-editor-image-selection-overlay"
            rotation={() => selectedImage()?.rotation ?? 0}
            onResizeStart={(direction, event) => {
              const image = selectedImage();
              if (!image) return;
              event.preventDefault();
              event.stopPropagation();
              surfaceHandlers().onImageResizeHandleMouseDown(
                image.paragraphId,
                image.startOffset,
                direction,
                event,
              );
            }}
            onRotateStart={(event) => {
              const image = selectedImage();
              if (!image) return;
              surfaceHandlers().onImageRotateHandleMouseDown(
                image.paragraphId,
                image.startOffset,
                event,
              );
            }}
            onBodyMouseDown={(event) => {
              const image = selectedImage();
              if (!image) return;
              surfaceHandlers().onImageMouseDown(
                image.paragraphId,
                image.startOffset,
                event,
              );
            }}
          />

          <ResizeHandlesOverlay
            box={selectedTextBox}
            readOnly={Boolean(layout().readOnly)}
            variantClass="oasis-editor-textbox-selection-overlay"
            rotation={() => selectedTextBox()?.rotation ?? 0}
            onResizeStart={(direction, event) => {
              const textBox = selectedTextBox();
              if (!textBox) return;
              event.preventDefault();
              event.stopPropagation();
              surfaceHandlers().onTextBoxResizeHandleMouseDown(
                textBox.paragraphId,
                textBox.startOffset,
                direction,
                event,
              );
            }}
            onRotateStart={(event) => {
              const textBox = selectedTextBox();
              if (!textBox) return;
              surfaceHandlers().onTextBoxRotateHandleMouseDown(
                textBox.paragraphId,
                textBox.startOffset,
                event,
              );
            }}
          />

          <Show
            when={overlays().toolbarHost && overlays().showFloatingTableToolbar}
          >
            <FloatingTableToolbar
              host={overlays().toolbarHost!}
              selectionBoxes={overlays().selectionBoxes}
              visible={overlays().showFloatingTableToolbar!}
              surfaceRef={() => scrollContentRef}
            />
          </Show>

          <Show when={overlays().layoutOptions}>
            {(layoutOptions) => (
              <FloatingLayoutOptions
                box={() => selectedImage() ?? selectedTextBox()}
                layoutOptions={layoutOptions()}
                surfaceRef={() => scrollContentRef}
                readOnly={Boolean(layout().readOnly)}
              />
            )}
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
            accept={importFileAccept()}
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
                <OasisBrandMark height={40} class="oasis-editor-loading-mark" />
                <div class="oasis-editor-import-title">
                  {t("import.overlay.title")}
                </div>
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
                    <span class="oasis-editor-import-done-icon">
                      {t("import.phase.done")}
                    </span>
                  ) : isError ? (
                    <span class="oasis-editor-import-error-icon">
                      {t("import.phase.error")}
                    </span>
                  ) : (
                    <>{Math.round(progress().progress)}%</>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      </Show>
      <div class="oasis-editor-statusbar" data-testid="editor-statusbar">
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
        <div
          class="oasis-editor-statusbar-zoom"
          data-testid="editor-statusbar-zoom-control"
          aria-label={t("status.zoom")}
        >
          <button
            type="button"
            class="oasis-editor-zoom-button"
            aria-label={`${t("status.zoom")} -`}
            disabled={zoomPercent() <= ZOOM_MIN}
            onClick={() => adjustZoom(-ZOOM_STEP)}
          >
            −
          </button>
          <input
            class="oasis-editor-zoom-slider"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={zoomPercent()}
            aria-label={t("status.zoom")}
            aria-valuetext={`${zoomPercent()}%`}
            onInput={(event) =>
              setZoomPercent(clampZoom(event.currentTarget.valueAsNumber))
            }
          />
          <button
            type="button"
            class="oasis-editor-zoom-button"
            aria-label={`${t("status.zoom")} +`}
            disabled={zoomPercent() >= ZOOM_MAX}
            onClick={() => adjustZoom(ZOOM_STEP)}
          >
            +
          </button>
          <span
            class="oasis-editor-statusbar-item oasis-editor-zoom-value"
            data-testid="editor-statusbar-zoom"
          >
            {zoomPercent()}%
          </span>
        </div>
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
