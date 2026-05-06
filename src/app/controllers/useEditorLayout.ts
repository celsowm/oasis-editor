import { createEffect, createSignal, onCleanup } from "solid-js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getParagraphText,
  getParagraphs,
  positionToParagraphOffset,
  type EditorBlockNode,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  type EditorState,
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import { buildTableCellLayout } from "../../core/tableLayout.js";
import { createEditorLogger } from "../../utils/logger.js";
import { getCaretSlotRects } from "../../ui/caretGeometry.js";
import {
  getEmptyBlockRect,
  getParagraphBoundaryElement,
  hasUsableCharGeometry,
} from "../../ui/domGeometry.js";
import type { CaretBox, InputBox, SelectionBox } from "../../ui/editorUiTypes.js";
import { measureParagraphLayoutFromRects } from "../../ui/layoutProjection.js";
import { collectParagraphCharRects } from "../../ui/positionAtPoint.js";

interface UseEditorLayoutProps {
  state: EditorState;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
}

type LayoutSyncReason =
  | "selection"
  | "scroll"
  | "content-change"
  | "resize"
  | "import";

const logger = createEditorLogger("layout");
const DEFAULT_BATCH_SIZE = 8;

function scheduleFrame(callback: () => void): number {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(() => callback());
  }
  return globalThis.setTimeout(callback, 16);
}

function cancelFrame(handle: number): void {
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(handle);
    return;
  }
  globalThis.clearTimeout(handle);
}

function buildParagraphSignature(paragraph: EditorParagraphNode): string {
  return paragraph.runs
    .map((run) => {
      const image = run.image ? `${run.image.src}:${run.image.width ?? ""}x${run.image.height ?? ""}` : "";
      return `${run.id}:${run.text}:${image}`;
    })
    .join("|");
}

function copyWithoutKeys<T>(source: Record<string, T>, keys: Iterable<string>): Record<string, T> {
  const next = { ...source };
  for (const key of keys) {
    delete next[key];
  }
  return next;
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
    setMeasuredParagraphLayouts((current) => copyWithoutKeys(current, ids));
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

    const nextLayout = measureParagraphLayoutFromRects(paragraph, charRects);
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

    const surfaceRect = surface.getBoundingClientRect();
    const paragraphs = getParagraphs(props.state);
    const paragraphsById = new Map(paragraphs.map((paragraph) => [paragraph.id, paragraph] as const));
    const normalized = normalizeSelection(props.state);
    const nextSelectionBoxes: SelectionBox[] = [];

    const activeSectionIndex = getActiveSectionIndex(props.state);
    const anchorLocation = findParagraphTableLocation(
      props.state.document,
      props.state.selection.anchor.paragraphId,
      activeSectionIndex,
    );
    const focusLocation = findParagraphTableLocation(
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
      const section =
        props.state.document.sections && props.state.document.sections.length > 0
          ? props.state.document.sections[activeSectionIndex]
          : null;

      let targetBlocks: EditorBlockNode[] = [];
      if (section) {
        if (anchorLocation.zone === "header") targetBlocks = section.header || [];
        else if (anchorLocation.zone === "footer") targetBlocks = section.footer || [];
        else targetBlocks = section.blocks;
      } else {
        targetBlocks = props.state.document.blocks;
      }

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

    const selectedParagraph = getParagraphBoundaryElement(
      surface,
      props.state.selection.focus.paragraphId,
      "end",
    );
    if (!selectedParagraph) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const selectedParagraphNode =
      paragraphsById.get(props.state.selection.focus.paragraphId) ?? paragraphs[0];
    if (!selectedParagraphNode) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    let left = 0;
    let top = 0;
    let height = 28;

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
      if (reason === "scroll") {
        logger.debug("layout:sync skipped global measurement", { reason });
      }
      syncInputBox(reason);
    });
  };

  const syncMeasuredLayoutMetrics = (
    reason: LayoutSyncReason = "content-change",
    paragraphIds?: string[],
  ): boolean => {
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
      reason,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      blocksMeasured: Object.keys(nextHeights).length,
      paragraphsMeasured: targetParagraphIds.length,
      heightsChanged,
      paragraphLayoutsChanged,
    });

    return heightsChanged || paragraphLayoutsChanged;
  };

  const scheduleDeferredLayoutMeasurement = (
    reason: LayoutSyncReason,
    options: { paragraphIds?: string[]; resolveWhenDone?: boolean } = {},
  ): Promise<void> | null => {
    const surface = props.surfaceRef();
    if (!surface) {
      return null;
    }

    clearDeferredMeasurement();
    const paragraphs = getParagraphs(props.state);
    const paragraphsById = new Map(paragraphs.map((paragraph) => [paragraph.id, paragraph] as const));
    const targetParagraphIds = options.paragraphIds ?? paragraphs.map((paragraph) => paragraph.id);
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

    const flushBlockHeights = () => {
      const nextHeights: Record<string, number> = {};
      const blockElements = surface.querySelectorAll<HTMLElement>("[data-block-id]");
      for (const element of blockElements) {
        const blockId = element.dataset.blockId;
        if (!blockId) {
          continue;
        }
        nextHeights[blockId] = element.getBoundingClientRect().height;
      }
      if (!areBlockHeightsEquivalent(measuredBlockHeights(), nextHeights)) {
        setMeasuredBlockHeights(nextHeights);
      }
      return Object.keys(nextHeights).length;
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
        flushBlockHeights();
      }

      const batchUpdates: Record<string, EditorLayoutParagraph> = {};
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

        batchUpdates[paragraphId] = layout;
        cachedParagraphSignatures.set(paragraphId, buildParagraphSignature(paragraph));
        processedInBatch += 1;
        measuredCount += 1;
      }

      if (Object.keys(batchUpdates).length > 0) {
        setMeasuredParagraphLayouts((current) => ({ ...current, ...batchUpdates }));
      }

      if (index < targetParagraphIds.length) {
        deferredMeasureHandle = scheduleFrame(processBatch);
        return;
      }

      deferredMeasureHandle = null;
      logger.info("layout:deferred sync complete", {
        reason,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        blocksMeasured: Object.keys(measuredBlockHeights()).length,
        paragraphsMeasured: measuredCount,
      });
      resolveStabilization();
    };

    deferredMeasureHandle = scheduleFrame(processBatch);
    return pendingStabilization;
  };

  const stabilizeLayoutAfterImport = async () => {
    clearDeferredMeasurement();
    invalidateParagraphLayouts();
    setMeasuredBlockHeights({});
    await new Promise<void>((resolve) => {
      scheduleFrame(() => resolve());
    });
    requestInputBoxSync("import");
    const pending =
      scheduleDeferredLayoutMeasurement("import", { resolveWhenDone: true }) ?? Promise.resolve();
    await pending;
    requestInputBoxSync("selection");
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
        run.image?.src;
        run.image?.width;
        run.image?.height;
      });
    }

    for (const paragraphId of previousParagraphSignatures.keys()) {
      if (!nextSignatures.has(paragraphId)) {
        changedParagraphIds.add(paragraphId);
      }
    }

    const nextBlockIds = Array.from(props.surfaceRef()?.querySelectorAll<HTMLElement>("[data-block-id]") ?? []).map(
      (element) => element.dataset.blockId ?? "",
    );
    const blockStructureChanged =
      previousBlockIds.length !== nextBlockIds.length ||
      previousBlockIds.some((blockId, index) => blockId !== nextBlockIds[index]);

    if (changedParagraphIds.size > 0) {
      invalidateParagraphLayouts(changedParagraphIds);
      requestInputBoxSync("content-change");
      scheduleDeferredLayoutMeasurement("content-change", {
        paragraphIds: Array.from(changedParagraphIds).filter((paragraphId) => nextSignatures.has(paragraphId)),
      });
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

    const handleViewportScroll = () => requestInputBoxSync("scroll");
    const handleWindowResize = () => {
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
    onCleanupHook,
  };
}
