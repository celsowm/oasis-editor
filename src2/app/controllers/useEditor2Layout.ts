import { createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { 
  type Editor2State, 
  type Editor2LayoutParagraph,
  type Editor2BlockNode,
  getParagraphs,
  getActiveSectionIndex,
  getParagraphText,
  positionToParagraphOffset,
  findParagraphTableLocation
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import { 
  collectParagraphCharRects, 
} from "../../ui/positionAtPoint.js";
import { measureParagraphLayoutFromRects } from "../../ui/layoutProjection.js";
import { buildTableCellLayout } from "../../ui/tableLayout.js";
import { 
  getEmptyBlockRect, 
  hasUsableCharGeometry,
  getParagraphBoundaryElement
} from "../../ui/domGeometry.js";
import { getCaretSlotRects } from "../../ui/caretGeometry.js";
import type { CaretBox, InputBox, SelectionBox } from "../../ui/editorUiTypes.js";

interface UseEditor2LayoutProps {
  state: Editor2State;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
}

export function useEditor2Layout(props: UseEditor2LayoutProps) {
  const [measuredBlockHeights, setMeasuredBlockHeights] = createSignal<Record<string, number>>({});
  const [measuredParagraphLayouts, setMeasuredParagraphLayouts] = createSignal<Record<string, Editor2LayoutParagraph>>({});
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

  const syncMeasuredLayoutMetrics = (): boolean => {
    const surface = props.surfaceRef();
    if (!surface) {
      return false;
    }

    const nextHeights: Record<string, number> = {};
    const nextParagraphLayouts: Record<string, Editor2LayoutParagraph> = {};
    const blockElements = surface.querySelectorAll<HTMLElement>("[data-block-id]");
    const paragraphsById = new Map(getParagraphs(props.state).map((paragraph) => [paragraph.id, paragraph] as const));

    for (const element of blockElements) {
      const blockId = element.dataset.blockId;
      if (!blockId) {
        continue;
      }
      nextHeights[blockId] = element.getBoundingClientRect().height;
    }

    for (const [paragraphId, paragraph] of paragraphsById) {
      const charRects = collectParagraphCharRects(surface, paragraphId);
      if (charRects.length === 0 || !hasUsableCharGeometry(charRects)) {
        continue;
      }
      nextParagraphLayouts[paragraphId] = measureParagraphLayoutFromRects(paragraph, charRects);
    }

    const currentHeights = measuredBlockHeights();
    const currentKeys = Object.keys(currentHeights);
    const nextKeys = Object.keys(nextHeights);
    const heightsChanged =
      currentKeys.length !== nextKeys.length ||
      nextKeys.some((key) => Math.abs((currentHeights[key] ?? 0) - nextHeights[key]!) > 0.5);

    if (heightsChanged) {
      setMeasuredBlockHeights(nextHeights);
    }

    const currentParagraphLayouts = measuredParagraphLayouts();
    const currentParagraphIds = Object.keys(currentParagraphLayouts);
    const nextParagraphIds = Object.keys(nextParagraphLayouts);
    const paragraphLayoutsChanged =
      currentParagraphIds.length !== nextParagraphIds.length ||
      nextParagraphIds.some((paragraphId) => {
        const previous = currentParagraphLayouts[paragraphId];
        const next = nextParagraphLayouts[paragraphId]!;
        if (!previous) {
          return true;
        }
        if (previous.lines.length !== next.lines.length) {
          return true;
        }
        if ((previous.endOffset ?? previous.text.length) !== (next.endOffset ?? next.text.length)) {
          return true;
        }
        return next.lines.some((line, index) => {
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
      });

    if (paragraphLayoutsChanged) {
      setMeasuredParagraphLayouts(nextParagraphLayouts);
    }

    return heightsChanged || paragraphLayoutsChanged;
  };

  const syncInputBox = () => {
    const surface = props.surfaceRef();
    if (!surface) {
      setSelectionBoxes([]);
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const surfaceRect = surface.getBoundingClientRect();
    const paragraphs = getParagraphs(props.state);
    const normalized = normalizeSelection(props.state);
    const nextSelectionBoxes: SelectionBox[] = [];

    const activeSectionIndex = getActiveSectionIndex(props.state);
    const anchorLocation = findParagraphTableLocation(props.state.document, props.state.selection.anchor.paragraphId, activeSectionIndex);
    const focusLocation = findParagraphTableLocation(props.state.document, props.state.selection.focus.paragraphId, activeSectionIndex);

    const isTableSelection = anchorLocation && focusLocation && 
      anchorLocation.blockIndex === focusLocation.blockIndex &&
      (anchorLocation.rowIndex !== focusLocation.rowIndex || anchorLocation.cellIndex !== focusLocation.cellIndex);

    if (isTableSelection) {
      const hasSections =
        props.state.document.sections &&
        props.state.document.sections.length > 0;
      const section = hasSections
        ? props.state.document.sections![activeSectionIndex]
        : null;

      let targetBlocks: Editor2BlockNode[] = [];
      if (section) {
        if (anchorLocation.zone === "header") targetBlocks = section.header || [];
        else if (anchorLocation.zone === "footer")
          targetBlocks = section.footer || [];
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
        const charRects = collectParagraphCharRects(surface, paragraph.id);
        const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
        const endOffset =
          paragraphIndex === normalized.endIndex ? normalized.endParagraphOffset : paragraphText.length;

        if (charRects.length === 0) {
          const paragraphRect = paragraphElement.getBoundingClientRect();
          nextSelectionBoxes.push({
            left: paragraphRect.left - surfaceRect.left,
            top: paragraphRect.top - surfaceRect.top,
            width: Math.max(12, paragraphRect.width || 12),
            height: paragraphRect.height || 28,
          });
          continue;
        }

        const layout = measureParagraphLayoutFromRects(paragraph, charRects);
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

    const charRects = collectParagraphCharRects(surface, props.state.selection.focus.paragraphId);
    const selectedParagraphNode =
      paragraphs.find((paragraph) => paragraph.id === props.state.selection.focus.paragraphId) ?? paragraphs[0];
    let left = 0;
    let top = 0;
    let height = 28;

    if (charRects.length === 0) {
      const fallbackRect =
        getEmptyBlockRect(selectedParagraph) ?? selectedParagraph.getBoundingClientRect();
      left = fallbackRect.left - surfaceRect.left;
      top = fallbackRect.top - surfaceRect.top;
      height = fallbackRect.height || 28;
    } else {
      const layout = measureParagraphLayoutFromRects(selectedParagraphNode, charRects);
      const slots =
        layout.lines.length > 0
          ? layout.lines.flatMap((line, lineIndex) =>
              lineIndex === layout.lines.length - 1 ? line.slots : line.slots.slice(0, -1),
            )
          : getCaretSlotRects(charRects).map((slot, offset) => ({
              paragraphId: selectedParagraphNode.id,
              offset,
              left: slot.left,
              top: slot.top,
              height: slot.height,
            }));
      const focusOffset = positionToParagraphOffset(selectedParagraphNode, props.state.selection.focus);
      const slotIndex = Math.max(0, Math.min(focusOffset, slots.length - 1));
      const slot = slots[slotIndex];
      left = slot.left - surfaceRect.left;
      top = slot.top - surfaceRect.top;
      height = slot.height;
    }

    setInputBox({ left, top, height });
    setCaretBox({ left, top, height, visible: true });
  };

  const requestInputBoxSync = () => {
    const requestId = ++syncRequestId;
    queueMicrotask(() => {
      if (requestId !== syncRequestId) {
        return;
      }
      const metricsChanged = syncMeasuredLayoutMetrics();
      if (metricsChanged) {
        queueMicrotask(() => {
          if (requestId !== syncRequestId) {
            return;
          }
          syncInputBox();
        });
        return;
      }
      syncInputBox();
    });
  };

  createEffect(() => {
    // Tracking dependencies
    props.state.selection.anchor.paragraphId;
    props.state.selection.anchor.runId;
    props.state.selection.anchor.offset;
    props.state.selection.focus.paragraphId;
    props.state.selection.focus.runId;
    props.state.selection.focus.offset;
    
    // Track document content changes
    getParagraphs(props.state).forEach(p => {
      p.runs.forEach(r => r.text);
    });

    requestInputBoxSync();
  });

  createEffect(() => {
    const viewport = props.viewportRef();
    if (!viewport) {
      return;
    }

    const handleViewportScroll = () => requestInputBoxSync();
    const handleWindowResize = () => requestInputBoxSync();
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
    syncMeasuredLayoutMetrics,
    syncInputBox,
    setMeasuredBlockHeights,
    setMeasuredParagraphLayouts,
    onCleanupHook
  };
}
