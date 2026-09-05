import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js";
import { CanvasEditorSurface } from "./components/CanvasEditorSurface.js";
import { HorizontalRuler } from "./components/Ruler/HorizontalRuler.js";
import { EDITOR_SCROLL_PADDING_PX } from "./editorLayoutConstants.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import { SelectionOverlay } from "./components/SelectionOverlay.js";
import { RevisionOverlay } from "./components/RevisionOverlay.js";
import { CommentHighlightOverlay } from "./components/CommentHighlightOverlay.js";
import { FloatingLayoutOptions } from "./components/FloatingToolbar/FloatingLayoutOptions.js";
import {
  getDocumentPageSettings,
  getDocumentSections,
  getDocumentParagraphs,
  getRunImage,
  resolveImageSrc,
  type EditorLayoutDocument,
  EditorDocument,
  EditorPageSettings,
} from "@/core/model.js";
import {
  getDocumentCharacterCount,
  getDocumentWordCount,
} from "@/core/editorState.js";
import { importFileAccept } from "@/import/documentImporterRegistry.js";
import type {
  SelectedImageBox,
  SelectedTextBoxBox,
  SelectedTableBox,
} from "./editorUiTypes.js";
import type { EditorComment } from "@/core/model.js";
import { ResizeHandlesOverlay } from "./overlays/ResizeHandlesOverlay.js";
import { ImageCropPreviewOverlay } from "./overlays/ImageCropPreviewOverlay.js";
import { TableHandlesOverlay } from "./overlays/TableHandlesOverlay.js";
import { clampZoom } from "./app/editorZoom.js";
import { EditorImportProgressOverlay } from "./EditorImportProgressOverlay.js";
import { EditorStatusBar } from "./EditorStatusBar.js";
import type {
  OasisEditorEditorFileHandlers,
  OasisEditorEditorInputHandlers,
  OasisEditorEditorLayoutProps,
  OasisEditorEditorOverlayProps,
  OasisEditorEditorProps,
  OasisEditorEditorRefProps,
  OasisEditorEditorSurfaceHandlers,
} from "./OasisEditorEditorProps.js";

export type {
  OasisEditorEditorFileHandlers,
  OasisEditorEditorInputHandlers,
  OasisEditorEditorLayoutProps,
  OasisEditorEditorOverlayProps,
  OasisEditorEditorProps,
  OasisEditorEditorRefProps,
  OasisEditorEditorSurfaceHandlers,
} from "./OasisEditorEditorProps.js";

export function OasisEditorEditor(props: OasisEditorEditorProps): JSX.Element {
  const layout = (): OasisEditorEditorLayoutProps => props.layout;
  const overlays = (): OasisEditorEditorOverlayProps => props.overlays;
  const refs = (): OasisEditorEditorRefProps => props.refs ?? {};
  const surfaceHandlers = (): OasisEditorEditorSurfaceHandlers =>
    props.surfaceHandlers;
  const inputHandlers = (): OasisEditorEditorInputHandlers =>
    props.inputHandlers;
  const fileHandlers = (): OasisEditorEditorFileHandlers => props.fileHandlers;
  let scrollContentRef: HTMLDivElement | undefined;
  let viewportElement: HTMLDivElement | undefined;
  const [viewportRef, setViewportRef] = createSignal<
    HTMLDivElement | undefined
  >();
  const pageSettings = (): EditorPageSettings =>
    getDocumentPageSettings(props.state().document);
  // The widest page across all sections drives the shell width. Orientation is a
  // per-section setting, so a landscape section must be able to widen the editor
  // even when the document-level page settings stay portrait — otherwise the
  // wider page overflows and forces a horizontal scrollbar.
  const widestPageWidth = (): number =>
    getDocumentSections(props.state().document).reduce(
      (max, section): number => Math.max(max, section.pageSettings.width),
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
    // Word-like chrome spans the whole stage. The page remains centered by the
    // zoom-sizer/scroll-content layer, while pages wider than the available
    // stage continue to overflow inside the viewport instead of widening the
    // shell and pulling the ruler, scrollbar and status bar inward.
    width: "100%",
    height: "100%",
    "max-height": viewportHeight(),
    ...(layout().style ?? {}),
  }));
  const documentForStats = createMemo(
    (): EditorDocument => props.state().document,
  );
  const characterCount = createMemo((): number =>
    getDocumentCharacterCount(documentForStats()),
  );
  const wordCount = createMemo((): number =>
    getDocumentWordCount(documentForStats()),
  );

  // Zoom state is owned by OasisEditorApp (so the geometry controllers can read
  // it) and threaded in via the layout props. When rendered standalone we fall
  // back to a local signal so the control still works.
  const [localZoomPercent, setLocalZoomPercent] = createSignal(100);
  const zoomPercent = (): number =>
    layout().zoomPercent?.() ?? localZoomPercent();
  const setZoomPercent = (value: number): void => {
    const clamped = clampZoom(value);
    const lift = layout().setZoomPercent;
    if (lift) lift(clamped);
    else setLocalZoomPercent(clamped);
  };
  const adjustZoom = (delta: number): void =>
    setZoomPercent(zoomPercent() + delta);
  // z = zoomFactor(): visual scale applied to the shared document layer
  // (.oasis-editor-editor-scroll-content). Because the canvas AND every overlay
  // live inside that layer, scaling it keeps them aligned automatically. Layout
  // stays in unscaled CSS px; the surrounding ".oasis-editor-editor-zoom-sizer"
  // reserves the *scaled* visual size so the scrollbars can reach every edge
  // (CSS transforms don't change layout box size).
  const fallbackZoomFactor = createMemo(
    (): number => clampZoom(zoomPercent()) / 100,
  );
  const zoomFactor = (): number =>
    layout().zoomFactor?.() ?? fallbackZoomFactor();

  const [measuredContentHeight, setMeasuredContentHeight] = createSignal(0);
  const [viewportSize, setViewportSize] = createSignal({
    width: 0,
    height: 0,
  });

  const unscaledContentWidth = (): number =>
    widestPageWidth() + EDITOR_SCROLL_PADDING_PX * 2;

  const zoomSizerWidth = createMemo((): number =>
    Math.max(unscaledContentWidth() * zoomFactor(), viewportSize().width),
  );
  const zoomSizerHeight = createMemo((): number =>
    Math.max(measuredContentHeight() * zoomFactor(), viewportSize().height),
  );
  // transform-origin is top-left, so the scaled box spans [left, left + w*z].
  // Center it horizontally within the sizer.
  const zoomLayerLeft = createMemo((): number =>
    Math.max(0, (zoomSizerWidth() - unscaledContentWidth() * zoomFactor()) / 2),
  );

  // Keep the point at the viewport center stable when the zoom changes, so
  // zooming feels anchored instead of jumping to the top-left origin.
  let prevZoomFactor = zoomFactor();
  createEffect((): void => {
    const next = zoomFactor();
    const prev = prevZoomFactor;
    prevZoomFactor = next;
    if (next === prev || prev <= 0) return;
    const el = viewportElement;
    if (!el) return;
    const ratio = next / prev;
    const halfW = el.clientWidth / 2;
    const halfH = el.clientHeight / 2;
    const targetLeft = (el.scrollLeft + halfW) * ratio - halfW;
    const targetTop = (el.scrollTop + halfH) * ratio - halfH;
    // Apply after the zoom-sizer has resized so the new scroll range exists.
    requestAnimationFrame((): void => {
      el.scrollLeft = targetLeft;
      el.scrollTop = targetTop;
    });
  });

  const documentLayout = (): EditorLayoutDocument => layout().documentLayout();
  const totalPages = (): number => Math.max(1, documentLayout().pages.length);
  const [viewportPageIndex, setViewportPageIndex] = createSignal<number | null>(
    null,
  );

  const recomputeViewportPageIndex = (): void => {
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

  const currentPage = (): number => {
    const visiblePageIndex = viewportPageIndex();
    if (visiblePageIndex !== null) {
      return Math.max(1, visiblePageIndex + 1);
    }
    const projectedLayout = documentLayout();
    const focusId = props.state().selection.focus.paragraphId;
    const pageIndex = projectedLayout.pages.findIndex((page): boolean =>
      page.blocks.some((block): boolean => block.sourceBlockId === focusId),
    );
    return pageIndex === -1 ? 1 : pageIndex + 1;
  };

  const selectedImage = createMemo((): SelectedImageBox | null =>
    overlays().selectedImageBox(),
  );
  const selectedImageData = createMemo(() => {
    const box = selectedImage();
    if (!box) return null;
    const paragraph = getDocumentParagraphs(props.state().document).find(
      (candidate): boolean => candidate.id === box.paragraphId,
    );
    if (!paragraph) return null;
    let offset = 0;
    for (const run of paragraph.runs) {
      if (run.kind === "image" && offset === box.startOffset) {
        return {
          image: getRunImage(run),
          src: resolveImageSrc(props.state().document, run.image.src),
        };
      }
      offset += run.text.length;
    }
    return null;
  });
  const imageCropMode = (): boolean => overlays().imageCropMode?.() ?? false;
  const selectedTextBox = createMemo((): SelectedTextBoxBox | null =>
    overlays().selectedTextBoxBox(),
  );
  const selectedTable = createMemo((): SelectedTableBox | null =>
    overlays().selectedTableBox(),
  );
  const commentsById = createMemo<Record<string, EditorComment>>(
    (): Record<string, EditorComment> =>
      props.state().document.comments?.items ?? {},
  );

  createEffect((): void => {
    documentLayout();
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
          readOnly={(): boolean => Boolean(layout().readOnly)}
          zoomFactor={zoomFactor}
        />
      </Show>
      <div
        ref={(el): void => {
          viewportElement = el;
          setViewportRef(el);
          refs().onViewportRef?.(el);
          const onScroll = (): void => {
            recomputeViewportPageIndex();
          };
          el.addEventListener("scroll", onScroll, { passive: true });
          queueMicrotask(recomputeViewportPageIndex);
          const updateViewportSize = (): void => {
            setViewportSize({ width: el.clientWidth, height: el.clientHeight });
          };
          updateViewportSize();
          let viewportObserver: ResizeObserver | undefined;
          if (typeof ResizeObserver !== "undefined") {
            viewportObserver = new ResizeObserver(updateViewportSize);
            viewportObserver.observe(el);
          }
          onCleanup((): void => {
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
            ref={(el): void => {
              scrollContentRef = el;
              refs().onSurfaceRef?.(el);
              const updateContentHeight = (): void => {
                setMeasuredContentHeight(el.offsetHeight);
              };
              updateContentHeight();
              queueMicrotask(updateContentHeight);
              let contentObserver: ResizeObserver | undefined;
              if (typeof ResizeObserver !== "undefined") {
                contentObserver = new ResizeObserver(updateContentHeight);
                contentObserver.observe(el);
              }
              onCleanup((): void | undefined => contentObserver?.disconnect());
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
              documentLayout={layout().documentLayout}
              remoteWebFonts={layout().remoteWebFonts}
              measuredBlockHeights={layout().measuredBlockHeights}
              measuredParagraphLayouts={layout().measuredParagraphLayouts}
              viewportRef={(): HTMLDivElement | undefined =>
                viewportElement ?? undefined
              }
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
              onTableCornerResizeHandleMouseDown={
                surfaceHandlers().onTableCornerResizeHandleMouseDown
              }
              onRevisionMouseEnter={surfaceHandlers().onRevisionMouseEnter}
              onRevisionMouseLeave={surfaceHandlers().onRevisionMouseLeave}
            />

            <Show when={overlays().hoveredRevision()}>
              {(revision): JSX.Element => <RevisionOverlay box={revision()} />}
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

            <Show
              when={imageCropMode()}
              fallback={
                <ResizeHandlesOverlay
                  box={selectedImage}
                  readOnly={Boolean(layout().readOnly)}
                  variantClass="oasis-editor-image-selection-overlay"
                  rotation={(): number => selectedImage()?.rotation ?? 0}
                  onResizeStart={(direction, event): void => {
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
                  onRotateStart={(event): void => {
                    const image = selectedImage();
                    if (!image) return;
                    surfaceHandlers().onImageRotateHandleMouseDown(
                      image.paragraphId,
                      image.startOffset,
                      event,
                    );
                  }}
                  onBodyMouseDown={(event): void => {
                    const image = selectedImage();
                    if (!image) return;
                    surfaceHandlers().onImageMouseDown(
                      image.paragraphId,
                      image.startOffset,
                      event,
                    );
                  }}
                />
              }
            >
              <ImageCropPreviewOverlay
                box={selectedImage}
                image={():
                  | import("@/core/model.js").EditorImageRunData
                  | null => selectedImageData()?.image ?? null}
                src={(): string => selectedImageData()?.src ?? ""}
                rotation={(): number => selectedImage()?.rotation ?? 0}
              />
              <ResizeHandlesOverlay
                box={selectedImage}
                readOnly={Boolean(layout().readOnly)}
                variantClass="oasis-editor-image-crop-overlay"
                rotation={(): number => selectedImage()?.rotation ?? 0}
                onResizeStart={(direction, event): void => {
                  const image = selectedImage();
                  if (!image) return;
                  event.preventDefault();
                  event.stopPropagation();
                  surfaceHandlers().onImageCropHandleMouseDown?.(
                    image.paragraphId,
                    image.startOffset,
                    direction,
                    event,
                  );
                }}
                onBodyMouseDown={(event): void => {
                  const image = selectedImage();
                  if (!image) return;
                  surfaceHandlers().onImageCropBodyMouseDown?.(
                    image.paragraphId,
                    image.startOffset,
                    event,
                  );
                }}
              />
            </Show>

            <ResizeHandlesOverlay
              box={selectedTextBox}
              readOnly={Boolean(layout().readOnly)}
              variantClass="oasis-editor-textbox-selection-overlay"
              rotation={(): number => selectedTextBox()?.rotation ?? 0}
              onResizeStart={(direction, event): void => {
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
              onRotateStart={(event): void => {
                const textBox = selectedTextBox();
                if (!textBox) return;
                surfaceHandlers().onTextBoxRotateHandleMouseDown(
                  textBox.paragraphId,
                  textBox.startOffset,
                  event,
                );
              }}
            />

            <TableHandlesOverlay
              box={selectedTable}
              readOnly={Boolean(layout().readOnly)}
              onMoveStart={(event): void => {
                const table = selectedTable();
                if (!table) return;
                surfaceHandlers().onTableDragHandleMouseDown(
                  table.tableId,
                  event,
                );
              }}
              onResizeStart={(event): void => {
                const table = selectedTable();
                if (!table) return;
                surfaceHandlers().onTableCornerResizeHandleMouseDown(
                  table.tableId,
                  event,
                );
              }}
            />

            <Show when={overlays().layoutOptions}>
              {(layoutOptions): JSX.Element => (
                <FloatingLayoutOptions
                  box={(): SelectedImageBox | null =>
                    selectedImage() ?? selectedTextBox()
                  }
                  layoutOptions={layoutOptions()}
                  surfaceRef={(): HTMLDivElement | undefined =>
                    scrollContentRef
                  }
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
              onCompositionUpdate={inputHandlers().onCompositionUpdate}
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
      <EditorImportProgressOverlay progress={overlays().importProgress} />
      <EditorStatusBar
        wordCount={wordCount}
        characterCount={characterCount}
        currentPage={currentPage}
        totalPages={totalPages}
        zoomPercent={zoomPercent}
        adjustZoom={adjustZoom}
        setZoomPercent={setZoomPercent}
        persistenceStatus={overlays().persistenceStatus}
      />
    </div>
  );
}
