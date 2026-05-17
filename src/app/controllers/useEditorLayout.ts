import { batch, createEffect, createSignal, onCleanup } from "solid-js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getEditableBlocksForZone,
  getParagraphText,
  getParagraphs,
  getDocumentSections,
  getParagraphById,
  positionToParagraphOffset,
  type EditorBlockNode,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  type EditorState,
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import { buildTableCellLayout } from "../../core/tableLayout.js";
import { createEditorLogger } from "../../utils/logger.js";
import { recordDuration } from "../../utils/performanceMetrics.js";
import { getCaretSlotRects } from "../../ui/caretGeometry.js";
import {
  getCaretRectAtOffset,
  getEmptyBlockRect,
  getParagraphBoundaryElement,
  hasUsableCharGeometry,
} from "../../ui/domGeometry.js";
import type { CaretBox, InputBox, SelectionBox } from "../../ui/editorUiTypes.js";
import { measureParagraphLayoutFromRects } from "../../ui/layoutProjection.js";
import { collectParagraphCharRects } from "../../ui/positionAtPoint.js";
import { buildCanvasLayoutSnapshot } from "../../ui/canvas/CanvasLayoutSnapshot.js";
import { computeCanvasSelectionGeometry } from "../../ui/canvas/CanvasSelectionGeometry.js";

interface UseEditorLayoutProps {
  state: EditorState;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
  isImporting?: () => boolean;
  layoutMode?: "fast" | "wordParity";
  geometrySource?: "dom" | "canvas";
}

type LayoutSyncReason =
  | "selection"
  | "scroll"
  | "content-change"
  | "resize"
  | "import";

/**
 * Hints emitted by the transaction layer to tell the layout controller
 * exactly what changed in the model — so we can skip the doc-wide reactive
 * signature diff that used to run on every keystroke.
 *
 *  - `dirtyParagraphIds`: only these paragraphs need their layout cache cleared
 *    + re-measured.
 *  - `structureChanged`:  block-level structure (insert / delete / split / merge
 *    paragraph, table edits, etc.) changed; the visible block heights need a
 *    refresh.
 *  - `dirtyAll`:          conservative fallback (undo/redo, import, persistence
 *    reload, …). Behaves like the legacy "rebuild everything visible" path.
 */
export interface LayoutInvalidation {
  dirtyParagraphIds?: string[];
  structureChanged?: boolean;
  dirtyAll?: boolean;
}

const logger = createEditorLogger("layout");
const DEFAULT_BATCH_SIZE = 32;
const VISIBLE_PAGE_OVERSCAN_PX = 900;

function scheduleFrame(callback: () => void): number {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(() => callback());
  }
  // `setTimeout` is typed as `Timeout` under @types/node and `number` in DOM
  // typings; both runtimes accept an opaque numeric handle, so coerce here
  // for portability.
  return globalThis.setTimeout(callback, 16) as unknown as number;
}

function cancelFrame(handle: number): void {
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(handle);
    return;
  }
  globalThis.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
}

function isRectNearViewport(rect: DOMRect, viewportRect: DOMRect): boolean {
  return (
    rect.bottom >= viewportRect.top - VISIBLE_PAGE_OVERSCAN_PX &&
    rect.top <= viewportRect.bottom + VISIBLE_PAGE_OVERSCAN_PX
  );
}

function getCollapsedCaretRectFast(
  surface: HTMLElement,
  paragraphId: string,
  offset: number,
): { left: number; top: number; height: number } | null {
  // Range-API-based fast path. Works for both atom segments (tab/image/phantom)
  // and the new text-segment spans, without requiring per-character DOM nodes.
  return getCaretRectAtOffset(surface, paragraphId, offset);
}

function buildParagraphSignature(paragraph: EditorParagraphNode): string {
  return paragraph.runs
    .map((run) => {
      // Use only the image's structural dimensions in the signature.
      // The src may be an arbitrarily large data URL (legacy paths) — the
      // image asset itself is identified by the (immutable) run id, so
      // including the src here is redundant and would make signature
      // building O(payload size) per keystroke for documents with embedded
      // images.
      const image = run.image
        ? `img:${run.image.width ?? ""}x${run.image.height ?? ""}`
        : "";
      return `${run.id}:${run.text}:${image}`;
    })
    .join("|");
}

function areParagraphLayoutsEquivalent(
  previous: EditorLayoutParagraph | undefined,
  next: EditorLayoutParagraph,
): boolean {
  if (!previous) {
    return false;
  }
  if (previous.lines.length !== next.lines.length) {
    return false;
  }
  if ((previous.endOffset ?? previous.text.length) !== (next.endOffset ?? next.text.length)) {
    return false;
  }

  return !next.lines.some((line, index) => {
    const previousLine = previous.lines[index];
    if (!previousLine) {
      return true;
    }
    return (
      previousLine.startOffset !== line.startOffset ||
      previousLine.endOffset !== line.endOffset ||
      Math.abs(previousLine.top - line.top) > 0.5 ||
      Math.abs(previousLine.height - line.height) > 0.5 ||
      previousLine.slots.length !== line.slots.length
    );
  });
}

function areBlockHeightsEquivalent(
  previous: Record<string, number>,
  next: Record<string, number>,
): boolean {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  return !(
    previousKeys.length !== nextKeys.length ||
    nextKeys.some((key) => Math.abs((previous[key] ?? 0) - next[key]!) > 0.5)
  );
}

export function useEditorLayout(props: UseEditorLayoutProps) {
  const [measuredBlockHeights, setMeasuredBlockHeights] = createSignal<Record<string, number>>({});
  const [measuredParagraphLayouts, setMeasuredParagraphLayouts] = createSignal<Record<string, EditorLayoutParagraph>>({});
  const [inputBox, setInputBox] = createSignal<InputBox>({ left: 0, top: 0, height: 28 });
  const [selectionBoxes, setSelectionBoxes] = createSignal<SelectionBox[]>([]);
  const [caretBox, setCaretBox] = createSignal<CaretBox>({
    left: 0,
    top: 0,
    height: 28,
    visible: false,
  });
  const [preferredColumnX, setPreferredColumnX] = createSignal<number | null>(null);

  let syncRequestId = 0;
  let deferredMeasureHandle: number | null = null;
  let deferredMeasureToken = 0;
  let pendingStabilization: Promise<void> | null = null;
  let resolvePendingStabilization: (() => void) | null = null;
  let previousParagraphSignatures = new Map<string, string>();
  let previousBlockIds: string[] = [];
  let cachedParagraphSignatures = new Map<string, string>();

  // Tracks whether the most recent state change was already invalidated by
  // an explicit transaction-layer hint (Phase 3). When true, the doc-wide
  // signature createEffect skips its expensive O(N) loop and trusts the hint.
  let pendingExplicitInvalidations = 0;
  const isWordParityMode = () => props.layoutMode === "wordParity";
  const isCanvasGeometryMode = () => true;

  const clearDeferredMeasurement = () => {
    deferredMeasureToken += 1;
    if (deferredMeasureHandle !== null) {
      cancelFrame(deferredMeasureHandle);
      deferredMeasureHandle = null;
    }
    if (resolvePendingStabilization) {
      resolvePendingStabilization();
      resolvePendingStabilization = null;
      pendingStabilization = null;
    }
  };

  const resolveStabilization = () => {
    if (resolvePendingStabilization) {
      resolvePendingStabilization();
      resolvePendingStabilization = null;
      pendingStabilization = null;
    }
  };

  const invalidateParagraphLayouts = (paragraphIds?: Iterable<string>) => {
    if (!paragraphIds) {
      cachedParagraphSignatures.clear();
      setMeasuredParagraphLayouts({});
      return;
    }

    const ids = Array.from(paragraphIds);
    for (const paragraphId of ids) {
      cachedParagraphSignatures.delete(paragraphId);
    }
  };

  const getParagraphLayout = (
    surface: HTMLElement,
    paragraph: EditorParagraphNode,
    options: { preferCache: boolean; cacheMeasured: boolean },
  ): EditorLayoutParagraph | null => {
    const signature = buildParagraphSignature(paragraph);
    const currentLayouts = measuredParagraphLayouts();
    const cachedLayout = currentLayouts[paragraph.id];
    if (
      options.preferCache &&
      cachedLayout &&
      cachedParagraphSignatures.get(paragraph.id) === signature
    ) {
      return cachedLayout;
    }

    const charRects = collectParagraphCharRects(surface, paragraph.id);
    if (charRects.length === 0 || !hasUsableCharGeometry(charRects)) {
      return null;
    }

    const nextLayout = measureParagraphLayoutFromRects(
      paragraph,
      charRects,
      undefined,
      props.layoutMode ?? "fast",
    );
    cachedParagraphSignatures.set(paragraph.id, signature);
    if (options.cacheMeasured && !areParagraphLayoutsEquivalent(cachedLayout, nextLayout)) {
      setMeasuredParagraphLayouts((current) => ({ ...current, [paragraph.id]: nextLayout }));
    }
    return nextLayout;
  };

  const syncInputBox = (reason: LayoutSyncReason = "selection") => {
    const surface = props.surfaceRef();
    if (!surface) {
      setSelectionBoxes([]);
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    if (isCanvasGeometryMode()) {
      const snapshot = buildCanvasLayoutSnapshot({
        surface,
        state: props.state,
        measuredBlockHeights: measuredBlockHeights(),
        measuredParagraphLayouts: measuredParagraphLayouts(),
        layoutMode: props.layoutMode ?? "wordParity",
      });
      if (!snapshot) {
        setSelectionBoxes([]);
        setCaretBox((current) => ({ ...current, visible: false }));
        return;
      }
      const geometry = computeCanvasSelectionGeometry(snapshot, props.state);
      setSelectionBoxes(geometry.selectionBoxes);
      setInputBox(geometry.inputBox);
      setCaretBox(geometry.caretBox);
      return;
    }

    const surfaceRect = surface.getBoundingClientRect();
    const normalized = normalizeSelection(props.state);
    const nextSelectionBoxes: SelectionBox[] = [];

    // Lazy: building the full paragraph list and table locations is O(N) over
    // the document. Skip it for collapsed selections (the common typing case)
    // since neither isTableSelection nor the table-selection render branch
    // applies in that case.
    let paragraphsCache: EditorParagraphNode[] | null = null;
    let paragraphsByIdCache: Map<string, EditorParagraphNode> | null = null;
    const getParagraphsLazy = () => {
      if (!paragraphsCache) {
        paragraphsCache = getParagraphs(props.state);
      }
      return paragraphsCache;
    };
    const getParagraphsByIdLazy = () => {
      if (!paragraphsByIdCache) {
        paragraphsByIdCache = new Map(
          getParagraphsLazy().map((paragraph) => [paragraph.id, paragraph] as const),
        );
      }
      return paragraphsByIdCache;
    };

    const activeSectionIndex = getActiveSectionIndex(props.state);
    const anchorLocation = normalized.isCollapsed
      ? null
      : findParagraphTableLocation(
          props.state.document,
          props.state.selection.anchor.paragraphId,
          activeSectionIndex,
        );
    const focusLocation = normalized.isCollapsed
      ? null
      : findParagraphTableLocation(
          props.state.document,
          props.state.selection.focus.paragraphId,
          activeSectionIndex,
        );

    const isTableSelection =
      anchorLocation &&
      focusLocation &&
      anchorLocation.blockIndex === focusLocation.blockIndex &&
      (anchorLocation.rowIndex !== focusLocation.rowIndex ||
        anchorLocation.cellIndex !== focusLocation.cellIndex);

    if (isTableSelection) {
      const targetBlocks: EditorBlockNode[] = getEditableBlocksForZone(
        props.state,
        anchorLocation.zone,
      );

      const tableBlock = targetBlocks[anchorLocation.blockIndex];
      const tableId = tableBlock?.id;
      if (tableId) {
        const tableElement =
          surface.querySelector<HTMLElement>(`[data-source-block-id="${tableId}"]`) ??
          surface.querySelector<HTMLElement>(`[data-block-id="${tableId}"]`);
        if (tableElement && tableBlock?.type === "table") {
          const tableLayout = buildTableCellLayout(tableBlock);
          const anchorCell = tableLayout.find(
            (entry) =>
              entry.rowIndex === anchorLocation.rowIndex && entry.cellIndex === anchorLocation.cellIndex,
          );
          const focusCell = tableLayout.find(
            (entry) =>
              entry.rowIndex === focusLocation.rowIndex && entry.cellIndex === focusLocation.cellIndex,
          );

          if (anchorCell && focusCell) {
            const minRow = Math.min(anchorCell.visualRowIndex, focusCell.visualRowIndex);
            const maxRow = Math.max(
              anchorCell.visualRowIndex + anchorCell.rowSpan - 1,
              focusCell.visualRowIndex + focusCell.rowSpan - 1,
            );
            const minCol = Math.min(anchorCell.visualColumnIndex, focusCell.visualColumnIndex);
            const maxCol = Math.max(
              anchorCell.visualColumnIndex + anchorCell.colSpan - 1,
              focusCell.visualColumnIndex + focusCell.colSpan - 1,
            );

            for (const entry of tableLayout) {
              const cellRowStart = entry.visualRowIndex;
              const cellRowEnd = entry.visualRowIndex + entry.rowSpan - 1;
              const cellColStart = entry.visualColumnIndex;
              const cellColEnd = entry.visualColumnIndex + entry.colSpan - 1;
              const intersects =
                cellRowStart <= maxRow &&
                cellRowEnd >= minRow &&
                cellColStart <= maxCol &&
                cellColEnd >= minCol;
              if (!intersects) {
                continue;
              }

              const cellElement = tableElement.querySelector<HTMLElement>(
                `[data-row-index="${entry.rowIndex}"][data-cell-index="${entry.cellIndex}"]`,
              );
              if (!cellElement) {
                continue;
              }

              const cellRect = cellElement.getBoundingClientRect();
              nextSelectionBoxes.push({
                left: cellRect.left - surfaceRect.left,
                top: cellRect.top - surfaceRect.top,
                width: cellRect.width,
                height: cellRect.height,
              });
            }
          }
        }
      }
    } else if (!normalized.isCollapsed) {
      const paragraphs = getParagraphsLazy();
      for (let paragraphIndex = normalized.startIndex; paragraphIndex <= normalized.endIndex; paragraphIndex += 1) {
        const paragraph = paragraphs[paragraphIndex];
        if (!paragraph) {
          continue;
        }

        const paragraphElement = getParagraphBoundaryElement(surface, paragraph.id, "start");
        if (!paragraphElement) {
          continue;
        }

        const paragraphText = getParagraphText(paragraph);
        const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
        const endOffset =
          paragraphIndex === normalized.endIndex ? normalized.endParagraphOffset : paragraphText.length;

        if (startOffset === 0 && endOffset >= paragraphText.length) {
          const paragraphRect =
            getEmptyBlockRect(paragraphElement) ?? paragraphElement.getBoundingClientRect();
          nextSelectionBoxes.push({
            left: paragraphRect.left - surfaceRect.left,
            top: paragraphRect.top - surfaceRect.top,
            width: Math.max(12, paragraphRect.width || 12),
            height: paragraphRect.height || 28,
          });
          continue;
        }

        const layout =
          getParagraphLayout(surface, paragraph, {
            preferCache: reason === "scroll",
            cacheMeasured: true,
          }) ?? null;

        if (!layout) {
          const paragraphRect = paragraphElement.getBoundingClientRect();
          nextSelectionBoxes.push({
            left: paragraphRect.left - surfaceRect.left,
            top: paragraphRect.top - surfaceRect.top,
            width: Math.max(12, paragraphRect.width || 12),
            height: paragraphRect.height || 28,
          });
          continue;
        }

        for (const line of layout.lines) {
          const lineStart = Math.max(startOffset, line.startOffset);
          const lineEnd = Math.min(endOffset, line.endOffset);
          if (lineStart >= lineEnd) {
            continue;
          }

          const startSlot = line.slots.find((slot) => slot.offset === lineStart);
          const endSlot = line.slots.find((slot) => slot.offset === lineEnd);
          if (!startSlot || !endSlot) {
            continue;
          }

          nextSelectionBoxes.push({
            left: startSlot.left - surfaceRect.left,
            top: line.top - surfaceRect.top,
            width: Math.max(1, endSlot.left - startSlot.left),
            height: line.height,
          });
        }
      }
    }

    setSelectionBoxes(nextSelectionBoxes);

    const selectedParagraphNode =
      getParagraphById(props.state.document, props.state.selection.focus.paragraphId) ??
      getParagraphsLazy()[0];
    if (!selectedParagraphNode) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    let left = 0;
    let top = 0;
    let height = 28;

    // Fast path for collapsed selection: avoid measuring every char rect in the
    // paragraph (O(n) DOM reads + forced reflow). Look up only the char span
    // at the caret offset and avoid the broader paragraph-boundary query.
    if (normalized.isCollapsed) {
      const focusOffset = positionToParagraphOffset(
        selectedParagraphNode,
        props.state.selection.focus,
      );
      const fastRect = getCollapsedCaretRectFast(
        surface,
        selectedParagraphNode.id,
        focusOffset,
      );
      if (fastRect) {
        const caretLeft = fastRect.left - surfaceRect.left;
        const caretTop = fastRect.top - surfaceRect.top;
        setInputBox({ left: caretLeft, top: caretTop, height: fastRect.height });
        setCaretBox({ left: caretLeft, top: caretTop, height: fastRect.height, visible: true });
        return;
      }
    }

    const selectedParagraph = getParagraphBoundaryElement(
      surface,
      props.state.selection.focus.paragraphId,
      "end",
    );
    if (!selectedParagraph) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const layout =
      getParagraphLayout(surface, selectedParagraphNode, {
        preferCache: reason === "scroll",
        cacheMeasured: true,
      }) ?? null;

    if (!layout) {
      const fallbackRect =
        getEmptyBlockRect(selectedParagraph) ?? selectedParagraph.getBoundingClientRect();
      left = fallbackRect.left - surfaceRect.left;
      top = fallbackRect.top - surfaceRect.top;
      height = fallbackRect.height || 28;
    } else {
      const slots =
        layout.lines.length > 0
          ? layout.lines.flatMap((line, lineIndex) =>
              lineIndex === layout.lines.length - 1 ? line.slots : line.slots.slice(0, -1),
            )
          : getCaretSlotRects(collectParagraphCharRects(surface, selectedParagraphNode.id)).map((slot, offset) => ({
              paragraphId: selectedParagraphNode.id,
              offset,
              left: slot.left,
              top: slot.top,
              height: slot.height,
            }));
      const focusOffset = positionToParagraphOffset(selectedParagraphNode, props.state.selection.focus);
      const slotIndex = Math.max(0, Math.min(focusOffset, slots.length - 1));
      const slot = slots[slotIndex];
      if (slot) {
        left = slot.left - surfaceRect.left;
        top = slot.top - surfaceRect.top;
        height = slot.height;
      }
    }

    setInputBox({ left, top, height });
    setCaretBox({ left, top, height, visible: true });
  };

  const requestInputBoxSync = (reason: LayoutSyncReason = "selection") => {
    const requestId = ++syncRequestId;
    queueMicrotask(() => {
      if (requestId !== syncRequestId) {
        return;
      }
      syncInputBox(reason);
    });
  };

  const syncMeasuredLayoutMetrics = (
    reason: LayoutSyncReason = "content-change",
    paragraphIds?: string[],
  ): boolean => {
    if (isCanvasGeometryMode()) {
      requestInputBoxSync(reason);
      return false;
    }

    const surface = props.surfaceRef();
    if (!surface) {
      return false;
    }

    const startedAt = performance.now();
    const currentHeights = measuredBlockHeights();
    const currentLayouts = measuredParagraphLayouts();
    const nextHeights: Record<string, number> = {};
    const blockElements = surface.querySelectorAll<HTMLElement>("[data-block-id]");
    for (const element of blockElements) {
      const blockId = element.dataset.blockId;
      if (!blockId) {
        continue;
      }
      nextHeights[blockId] = element.getBoundingClientRect().height;
    }

    const paragraphsById = new Map(
      getParagraphs(props.state).map((paragraph) => [paragraph.id, paragraph] as const),
    );
    const targetParagraphIds = paragraphIds ?? Array.from(paragraphsById.keys());
    const layoutUpdates: Record<string, EditorLayoutParagraph> = {};

    for (const paragraphId of targetParagraphIds) {
      const paragraph = paragraphsById.get(paragraphId);
      if (!paragraph) {
        continue;
      }
      const layout = getParagraphLayout(surface, paragraph, {
        preferCache: false,
        cacheMeasured: false,
      });
      if (!layout) {
        continue;
      }
      layoutUpdates[paragraphId] = layout;
      cachedParagraphSignatures.set(paragraphId, buildParagraphSignature(paragraph));
    }

    const heightsChanged = !areBlockHeightsEquivalent(currentHeights, nextHeights);
    if (heightsChanged) {
      setMeasuredBlockHeights(nextHeights);
    }

    let paragraphLayoutsChanged = false;
    const mergedLayouts = { ...currentLayouts };
    for (const [paragraphId, layout] of Object.entries(layoutUpdates)) {
      if (!areParagraphLayoutsEquivalent(mergedLayouts[paragraphId], layout)) {
        mergedLayouts[paragraphId] = layout;
        paragraphLayoutsChanged = true;
      }
    }
    if (paragraphLayoutsChanged) {
      setMeasuredParagraphLayouts(mergedLayouts);
    }

    logger.info("layout:sync complete", {
      layoutMode: props.layoutMode ?? "fast",
      reason,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      blocksMeasured: Object.keys(nextHeights).length,
      paragraphsMeasured: targetParagraphIds.length,
      heightsChanged,
      paragraphLayoutsChanged,
    });
    recordDuration("layout:sync", Math.round((performance.now() - startedAt) * 100) / 100);

    return heightsChanged || paragraphLayoutsChanged;
  };

  /**
   * Collect the DOM paragraph IDs whose container blocks are within (or near)
   * the viewport. Returns null if no viewport is mounted (caller should fall
   * back to "no work").
   */
  const getVisibleParagraphIds = (surface: HTMLElement): Set<string> | null => {
    const viewport = props.viewportRef();
    if (!viewport) {
      return null;
    }
    const viewportRect = viewport.getBoundingClientRect();
    const pages = Array.from(surface.querySelectorAll<HTMLElement>('[data-testid="editor-page"]'));
    const visibleParagraphIds = new Set<string>();
    for (const page of pages) {
      if (!isRectNearViewport(page.getBoundingClientRect(), viewportRect)) {
        continue;
      }
      const paragraphs = page.querySelectorAll<HTMLElement>("[data-paragraph-id]");
      for (const p of paragraphs) {
        const id = p.dataset.sourceParagraphId ?? p.dataset.paragraphId;
        if (id) {
          visibleParagraphIds.add(id);
        }
      }
    }
    return visibleParagraphIds;
  };

  const scheduleDeferredLayoutMeasurement = (
    reason: LayoutSyncReason,
    options: {
      paragraphIds?: string[];
      resolveWhenDone?: boolean;
      blockHeightScope?: "all" | "visible";
    } = {},
  ): Promise<void> | null => {
    if (isCanvasGeometryMode()) {
      requestInputBoxSync(reason);
      return options.resolveWhenDone ? Promise.resolve() : null;
    }

    const surface = props.surfaceRef();
    if (!surface) {
      return null;
    }

    clearDeferredMeasurement();
    const paragraphs = getParagraphs(props.state);
    const paragraphsById = new Map(paragraphs.map((paragraph) => [paragraph.id, paragraph] as const));

    // Default to visible-only measurement. The previous behaviour
    // ("measure every paragraph in the document") was the source of the
    // 80+ second deferred sync after content changes / imports.
    const visibleParagraphIds =
      options.paragraphIds || isWordParityMode() ? null : getVisibleParagraphIds(surface);
    const targetParagraphIds = options.paragraphIds ?? (
      isWordParityMode()
        ? paragraphs.map((paragraph) => paragraph.id)
        : (visibleParagraphIds
            ? paragraphs.map((p) => p.id).filter((id) => visibleParagraphIds.has(id))
            : [])
    );

    // Prefer visible-block scope by default to avoid touching every block in
    // the document on each invalidation. Callers can still opt in to "all"
    // explicitly when they truly need a full pass.
    const effectiveBlockScope: "all" | "visible" =
      options.blockHeightScope ?? (isWordParityMode() ? "all" : "visible");

    const token = ++deferredMeasureToken;
    const startedAt = performance.now();
    let index = 0;
    let blocksMeasured = false;
    let measuredCount = 0;

    if (options.resolveWhenDone) {
      pendingStabilization = new Promise<void>((resolve) => {
        resolvePendingStabilization = resolve;
      });
    }

    const getBlockElementsToMeasure = () => {
      if (effectiveBlockScope !== "visible") {
        return Array.from(surface.querySelectorAll<HTMLElement>("[data-block-id]"));
      }

      const viewport = props.viewportRef();
      if (!viewport) {
        return [];
      }

      const viewportRect = viewport.getBoundingClientRect();
      const pages = Array.from(surface.querySelectorAll<HTMLElement>('[data-testid="editor-page"]'));
      const visiblePages = pages.filter((page) =>
        isRectNearViewport(page.getBoundingClientRect(), viewportRect),
      );
      return visiblePages.flatMap((page) =>
        Array.from(page.querySelectorAll<HTMLElement>("[data-block-id]")),
      );
    };

    // Phase 2 perf refactor: accumulate ALL measurements (paragraphs +
    // block heights) across batches and commit ONCE at the end inside a
    // single `batch(...)`. The previous code committed per-batch, which
    // triggered a full `projectDocumentLayout(...)` re-run per batch — for
    // 160 paragraphs / 32-batch that meant 5 full doc re-projections during
    // a single "deferred sync", each costing many seconds.
    const pendingParagraphUpdates: Record<string, EditorLayoutParagraph> = {};
    let pendingBlockHeights: Record<string, number> | null = null;

    const collectBlockHeights = () => {
      const nextHeights: Record<string, number> =
        effectiveBlockScope === "visible" ? { ...measuredBlockHeights() } : {};
      const blockElements = getBlockElementsToMeasure();
      for (const element of blockElements) {
        const blockId = element.dataset.blockId;
        if (!blockId) {
          continue;
        }
        nextHeights[blockId] = element.getBoundingClientRect().height;
      }
      pendingBlockHeights = nextHeights;
    };

    const commitPendingMeasurements = () => {
      batch(() => {
        if (
          pendingBlockHeights &&
          !areBlockHeightsEquivalent(measuredBlockHeights(), pendingBlockHeights)
        ) {
          setMeasuredBlockHeights(pendingBlockHeights);
        }
        if (Object.keys(pendingParagraphUpdates).length > 0) {
          setMeasuredParagraphLayouts((current) => ({
            ...current,
            ...pendingParagraphUpdates,
          }));
        }
      });
    };

    const processBatch = () => {
      if (token !== deferredMeasureToken) {
        resolveStabilization();
        return;
      }

      const currentSurface = props.surfaceRef();
      if (!currentSurface) {
        resolveStabilization();
        return;
      }

      if (!blocksMeasured) {
        blocksMeasured = true;
        collectBlockHeights();
      }

      let processedInBatch = 0;
      while (index < targetParagraphIds.length && processedInBatch < DEFAULT_BATCH_SIZE) {
        const paragraphId = targetParagraphIds[index]!;
        const paragraph = paragraphsById.get(paragraphId);
        index += 1;
        if (!paragraph) {
          continue;
        }

        const layout = getParagraphLayout(currentSurface, paragraph, {
          preferCache: false,
          cacheMeasured: false,
        });
        if (!layout) {
          continue;
        }

        pendingParagraphUpdates[paragraphId] = layout;
        cachedParagraphSignatures.set(paragraphId, buildParagraphSignature(paragraph));
        processedInBatch += 1;
        measuredCount += 1;
      }

      if (index < targetParagraphIds.length) {
        deferredMeasureHandle = scheduleFrame(processBatch);
        return;
      }

      // Final batch: single Solid update so projectDocumentLayout runs once.
      commitPendingMeasurements();

      deferredMeasureHandle = null;
      logger.info("layout:deferred sync complete", {
        layoutMode: props.layoutMode ?? "fast",
        reason,
        blockScope: effectiveBlockScope,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        blocksMeasured: Object.keys(measuredBlockHeights()).length,
        paragraphsMeasured: measuredCount,
      });
      recordDuration("layout:deferred", Math.round((performance.now() - startedAt) * 100) / 100);
      resolveStabilization();
    };

    deferredMeasureHandle = scheduleFrame(processBatch);
    return pendingStabilization;
  };

  /**
   * Apply an explicit invalidation hint produced by the transaction layer
   * (Phase 3). This bypasses the expensive doc-wide signature `createEffect`
   * and goes straight to the targeted invalidation + visible-only
   * re-measurement path.
   *
   * Marks `pendingExplicitInvalidations` so that the next reactive run of
   * the signature `createEffect` skips its O(N) loop — it knows the work
   * has already been done.
   *
   * Note: callers invoke this BEFORE `setState(next)`. The cache mutation
   * and counter bump are synchronous; the actual measurement scheduling is
   * deferred to a microtask so it runs against the new state.
   */
  const applyInvalidation = (invalidation: LayoutInvalidation): void => {
    if (isCanvasGeometryMode()) {
      pendingExplicitInvalidations += 1;
      queueMicrotask(() => {
        requestInputBoxSync("content-change");
      });
      return;
    }

    if (props.isImporting?.()) {
      // Import path drives stabilization through `stabilizeLayoutAfterImport`.
      // Still count this as an explicit invalidation so the signature
      // createEffect won't race with the import flow.
      pendingExplicitInvalidations += 1;
      return;
    }

    // Empty hint: nothing changed.
    if (
      !invalidation.dirtyAll &&
      !invalidation.structureChanged &&
      (invalidation.dirtyParagraphIds?.length ?? 0) === 0
    ) {
      pendingExplicitInvalidations += 1;
      return;
    }

    // Synchronous: clear the relevant entries from the projected-layout cache
    // before the state mutation triggers EditorSurface's reactive re-projection.
    if (invalidation.dirtyAll) {
      invalidateParagraphLayouts();
    } else if ((invalidation.dirtyParagraphIds?.length ?? 0) > 0) {
      invalidateParagraphLayouts(invalidation.dirtyParagraphIds);
    }

    pendingExplicitInvalidations += 1;

    // Defer the visible-only deferred measurement to a microtask, so it sees
    // the post-setState document.
    queueMicrotask(() => {
      requestInputBoxSync("content-change");
      if (invalidation.dirtyAll || invalidation.structureChanged) {
        scheduleDeferredLayoutMeasurement("content-change");
      } else if ((invalidation.dirtyParagraphIds?.length ?? 0) > 0) {
        scheduleDeferredLayoutMeasurement(
          "content-change",
          isWordParityMode()
            ? {}
            : {
                paragraphIds: invalidation.dirtyParagraphIds,
              },
        );
      }
    });
  };

  const stabilizeLayoutAfterImport = async () => {
    const startedAt = performance.now();
    logger.info("layout:import-stabilize-start", {
      layoutMode: props.layoutMode ?? "fast",
    });

    clearDeferredMeasurement();

    if (!isCanvasGeometryMode()) {
      // Phase 2: collapse the two cache-clearing setState calls into a single
      // Solid `batch(...)` so the documentLayout memo (and the entire
      // EditorSurface render) only re-runs ONCE here, not twice.
      batch(() => {
        invalidateParagraphLayouts();
        setMeasuredBlockHeights({});
      });
    }

    // Wait one frame so the browser commits the post-import DOM before we
    // try to position the caret/input box. Drop the second redundant
    // selection sync — `import` already covers caret + input geometry.
    await new Promise<void>((resolve) => {
      scheduleFrame(() => resolve());
    });

    requestInputBoxSync("import");

    logger.info("layout:import-stabilize-done", {
      layoutMode: props.layoutMode ?? "fast",
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
  };

  createEffect(() => {
    props.state.selection.anchor.paragraphId;
    props.state.selection.anchor.runId;
    props.state.selection.anchor.offset;
    props.state.selection.focus.paragraphId;
    props.state.selection.focus.runId;
    props.state.selection.focus.offset;

    requestInputBoxSync("selection");
  });

  createEffect(() => {
    const paragraphs = getParagraphs(props.state);

    if (isCanvasGeometryMode()) {
      previousParagraphSignatures = new Map(
        paragraphs.map((paragraph) => [paragraph.id, ""] as const),
      );
      previousBlockIds = getDocumentSections(props.state.document).flatMap((section) =>
        [...(section.header || []), ...section.blocks, ...(section.footer || [])].map(
          (block) => block.id,
        ),
      );
      requestInputBoxSync("content-change");
      return;
    }

    // Fast path during import: skip signature diff entirely. All paragraphs
    // are new, so there's nothing to compare against. Just invalidate everything
    // and let the DOM render naturally. The measurement will happen via the
    // normal import stabilization flow.
    if (props.isImporting?.()) {
      previousParagraphSignatures.clear();
      previousBlockIds = [];
      return;
    }

    // Phase 3: if the transaction layer already applied an explicit
    // invalidation, skip the doc-wide signature diff entirely. This is the
    // common case during typing — we trust the hint and pay only O(1) work
    // per keystroke instead of O(N) over every paragraph.
    if (pendingExplicitInvalidations > 0) {
      pendingExplicitInvalidations -= 1;
      // Still touch reactive deps so this effect re-subscribes to future
      // changes; do it cheaply (just iterate IDs / structural image fields).
      const nextSignatures = new Map<string, string>();
      for (const paragraph of paragraphs) {
        // Note: we deliberately do NOT call buildParagraphSignature here.
        // The transaction-layer hint is the source of truth. We still cache
        // an empty marker so we have something to fall back on the next
        // time this effect runs without a hint.
        nextSignatures.set(paragraph.id, "");
        paragraph.runs.forEach((run) => {
          run.text;
          run.image?.width;
          run.image?.height;
        });
      }
      previousParagraphSignatures = nextSignatures;
      previousBlockIds = getDocumentSections(props.state.document).flatMap(section =>
        [...(section.header || []), ...section.blocks, ...(section.footer || [])].map(b => b.id)
      );
      return;
    }

    const nextSignatures = new Map<string, string>();
    const changedParagraphIds = new Set<string>();
    for (const paragraph of paragraphs) {
      const signature = buildParagraphSignature(paragraph);
      nextSignatures.set(paragraph.id, signature);
      if (previousParagraphSignatures.get(paragraph.id) !== signature) {
        changedParagraphIds.add(paragraph.id);
      }
      paragraph.runs.forEach((run) => {
        run.text;
        // Track only structural image fields. Reading `run.image?.src`
        // would force the reactive system to re-evaluate this effect when
        // the (potentially huge) data URL string identity changes, which
        // is exactly what we want to avoid for embedded images.
        run.image?.width;
        run.image?.height;
      });
    }

    for (const paragraphId of previousParagraphSignatures.keys()) {
      if (!nextSignatures.has(paragraphId)) {
        changedParagraphIds.add(paragraphId);
      }
    }

    const nextBlockIds = getDocumentSections(props.state.document).flatMap(section =>
      [...(section.header || []), ...section.blocks, ...(section.footer || [])].map(b => b.id)
    );
    const blockStructureChanged =
      previousBlockIds.length !== nextBlockIds.length ||
      previousBlockIds.some((blockId, index) => blockId !== nextBlockIds[index]);

    if (changedParagraphIds.size > 0) {
      invalidateParagraphLayouts(changedParagraphIds);
      requestInputBoxSync("content-change");
      // Skip deferred measurement during import: measuring hundreds of
      // paragraphs via getBoundingClientRect on every batch causes massive
      // layout thrashing. The measurement will happen naturally after the
      // DOM is fully rendered.
      if (blockStructureChanged) {
        scheduleDeferredLayoutMeasurement("content-change", {
          paragraphIds: isWordParityMode()
            ? undefined
            : Array.from(changedParagraphIds).filter((paragraphId) =>
                nextSignatures.has(paragraphId),
              ),
        });
      }
    } else if (blockStructureChanged) {
      scheduleDeferredLayoutMeasurement("content-change");
    }

    previousParagraphSignatures = nextSignatures;
    previousBlockIds = nextBlockIds;
  });

  createEffect(() => {
    const viewport = props.viewportRef();
    if (!viewport) {
      return;
    }

    const handleViewportScroll = () => {
      // Caret and selection overlays are positioned inside the scroll content,
      // so they move naturally with the document. Recomputing them on every
      // scroll can force geometry reads on offscreen text.
    };
    const handleWindowResize = () => {
      if (isCanvasGeometryMode()) {
        requestInputBoxSync("resize");
        return;
      }
      invalidateParagraphLayouts();
      requestInputBoxSync("resize");
      scheduleDeferredLayoutMeasurement("resize");
    };
    viewport.addEventListener("scroll", handleViewportScroll, { passive: true });
    window.addEventListener("resize", handleWindowResize);

    onCleanup(() => {
      viewport.removeEventListener("scroll", handleViewportScroll);
      window.removeEventListener("resize", handleWindowResize);
    });
  });

  const clearPreferredColumn = () => setPreferredColumnX(null);

  const onCleanupHook = () => {
    syncRequestId += 1;
    clearDeferredMeasurement();
  };

  return {
    measuredBlockHeights,
    measuredParagraphLayouts,
    inputBox,
    selectionBoxes,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    clearPreferredColumn,
    requestInputBoxSync,
    scheduleDeferredLayoutMeasurement,
    stabilizeLayoutAfterImport,
    syncMeasuredLayoutMetrics,
    syncInputBox,
    setMeasuredBlockHeights,
    setMeasuredParagraphLayouts,
    applyInvalidation,
    onCleanupHook,
  };
}
