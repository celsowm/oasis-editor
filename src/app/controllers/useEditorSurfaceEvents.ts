import {
  type EditorState,
  type EditorPosition,
  type EditorParagraphNode,
  findParagraphTableLocation,
  getActiveSectionIndex,
  getParagraphText,
  paragraphOffsetToPosition,
  getBlockParagraphs,
  normalizePageSettings,
  DEFAULT_EDITOR_PAGE_SETTINGS,
} from "../../core/model.js";
import { resolveWordSelection } from "../../core/wordBoundaries.js";
import { setSelection } from "../../core/editorCommands.js";
import { createSectionBoundaryParagraph } from "../../core/editorState.js";
import type { SurfaceHit } from "../../ui/canvas/CanvasHitTestService.js";

export interface UseEditorSurfaceEventsProps {
  state: () => EditorState;
  applyState: (newState: EditorState) => void;
  tableResize: { handleMouseDown: (event: MouseEvent) => boolean };
  imageOps: { stopImageDrag: () => void; stopImageResize: () => void };
  clearPendingCaretTextStyle: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInputAfterPointerSelection: () => void;
  resolveSurfaceHitAtPoint: (
    clientX: number,
    clientY: number,
    context?: { forDrag?: boolean },
  ) => SurfaceHit | null;
  getParagraphById: (doc: EditorState["document"], id: string) => EditorParagraphNode | undefined;
  textDrag?: { tryStartTextDrag: (event: MouseEvent, hit: SurfaceHit | null) => boolean };
  logger: { debug: (msg: string) => void; info: (msg: string, payload?: unknown) => void };
}

export function createEditorSurfaceEvents(deps: UseEditorSurfaceEventsProps) {
  let dragAnchor: EditorPosition | null = null;
  let dragFrameHandle: number | null = null;
  let dragPendingPoint: { clientX: number; clientY: number } | null = null;

  const scheduleFrame = (callback: () => void): number => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(() => callback());
    }
    return globalThis.setTimeout(callback, 16) as unknown as number;
  };

  const cancelFrame = (handle: number) => {
    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(handle);
      return;
    }
    globalThis.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  };

  const applyWithZone = (
    state: EditorState,
    targetZone: "main" | "header" | "footer",
    newState: EditorState,
    targetPosition?: EditorPosition,
  ) => {
    const isZoneTransition = targetZone !== (state.activeZone ?? "main");
    if (!isZoneTransition) {
      deps.applyState(newState);
      return;
    }

    let updatedDocument = newState.document;
    let activeSectionIndex = state.activeSectionIndex ?? 0;

    if (!updatedDocument.sections || updatedDocument.sections.length === 0) {
      const headerParagraph = createSectionBoundaryParagraph("header");
      const footerParagraph = createSectionBoundaryParagraph("footer");
      updatedDocument = {
        ...updatedDocument,
        sections: [
          {
            id: "section:1",
            blocks: updatedDocument.blocks,
            pageSettings: normalizePageSettings(
              updatedDocument.pageSettings ?? DEFAULT_EDITOR_PAGE_SETTINGS,
            ),
            header: [headerParagraph],
            footer: [footerParagraph],
          },
        ],
      };
      activeSectionIndex = 0;
    }

    const sections = updatedDocument.sections!;
    const section = sections[activeSectionIndex]!;
    let newHeader = section.header;
    let newFooter = section.footer;
    let zoneParagraph: EditorParagraphNode | null = null;

    if (targetZone === "header") {
      if (!newHeader || newHeader.length === 0) {
        zoneParagraph = createSectionBoundaryParagraph("header");
        newHeader = [zoneParagraph];
      } else {
        const firstBlock = newHeader[0];
        zoneParagraph =
          firstBlock.type === "paragraph"
            ? firstBlock
            : (getBlockParagraphs(firstBlock)[0] ?? null);
      }
    } else if (targetZone === "footer") {
      if (!newFooter || newFooter.length === 0) {
        zoneParagraph = createSectionBoundaryParagraph("footer");
        newFooter = [zoneParagraph];
      } else {
        const firstBlock = newFooter[0];
        zoneParagraph =
          firstBlock.type === "paragraph"
            ? firstBlock
            : (getBlockParagraphs(firstBlock)[0] ?? null);
      }
    }

    if (newHeader !== section.header || newFooter !== section.footer) {
      const newSections = [...sections];
      newSections[activeSectionIndex] = { ...section, header: newHeader, footer: newFooter };
      updatedDocument = { ...updatedDocument, sections: newSections };
    }

    const zonePosition = targetPosition
      ? targetPosition
      : zoneParagraph
        ? paragraphOffsetToPosition(zoneParagraph, 0)
        : newState.selection.anchor;

    deps.applyState({
      ...newState,
      document: updatedDocument,
      selection: { anchor: zonePosition, focus: zonePosition },
      activeSectionIndex,
      activeZone: targetZone,
    });
  };

  const logSelection = (label: string) => {
    const state = deps.state();
    const sel = state.selection;
    const secIdx = getActiveSectionIndex(state);
    const anchorLocInfo = findParagraphTableLocation(state.document, sel.anchor.paragraphId, secIdx);
    const focusLocInfo = findParagraphTableLocation(state.document, sel.focus.paragraphId, secIdx);
    const anchorLoc = anchorLocInfo
      ? `b${anchorLocInfo.blockIndex}r${anchorLocInfo.rowIndex}c${anchorLocInfo.cellIndex}`
      : "";
    const focusLoc = focusLocInfo
      ? `b${focusLocInfo.blockIndex}r${focusLocInfo.rowIndex}c${focusLocInfo.cellIndex}`
      : "";
    deps.logger.debug(
      `${label} ${sel.anchor.paragraphId}[${sel.anchor.offset}]→${sel.focus.paragraphId}[${sel.focus.offset}] [${anchorLoc}→${focusLoc}]`,
    );
  };

  const stopDragging = () => {
    dragAnchor = null;
    dragPendingPoint = null;
    if (dragFrameHandle !== null) {
      cancelFrame(dragFrameHandle);
      dragFrameHandle = null;
    }
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const processDragFrame = () => {
    dragFrameHandle = null;
    if (!dragAnchor) return;
    const pendingPoint = dragPendingPoint;
    dragPendingPoint = null;
    if (!pendingPoint) {
      return;
    }
    const hit = deps.resolveSurfaceHitAtPoint(
      pendingPoint.clientX,
      pendingPoint.clientY,
      { forDrag: true },
    );
    if (!hit?.resolvedFromParagraph) {
      return;
    }

    const state = deps.state();
    const next = setSelection(state, {
      anchor: dragAnchor,
      focus: hit.position,
    });
    applyWithZone(state, hit.zone, next, hit.position);
    logSelection("selection:drag");
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!dragAnchor) return;
    dragPendingPoint = { clientX: event.clientX, clientY: event.clientY };
    if (dragFrameHandle === null) {
      dragFrameHandle = scheduleFrame(processDragFrame);
    }
  };

  const handleWindowMouseUp = () => {
    logSelection("selection:end");
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleSurfaceMouseDown = (event: MouseEvent) => {
    const state = deps.state();
    deps.clearPendingCaretTextStyle();
    if (deps.tableResize.handleMouseDown(event)) return;

    event.preventDefault();
    deps.imageOps.stopImageDrag();
    deps.imageOps.stopImageResize();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();

    const hit = deps.resolveSurfaceHitAtPoint(event.clientX, event.clientY);
    if (deps.textDrag?.tryStartTextDrag(event, hit)) {
      deps.focusInputAfterPointerSelection();
      return;
    }
    if (!hit) {
      deps.focusInputAfterPointerSelection();
      return;
    }

    const paragraph = deps.getParagraphById(state.document, hit.paragraphId);
    const isZoneTransition = hit.zone !== (state.activeZone ?? "main");

    if (event.shiftKey && hit.resolvedFromParagraph) {
      dragAnchor = state.selection.anchor;
      applyWithZone(
        state,
        hit.zone,
        setSelection(state, {
          anchor: state.selection.anchor,
          focus: hit.position,
        }),
        hit.position,
      );
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      deps.focusInputAfterPointerSelection();
      return;
    }

    if (event.detail >= 3 && paragraph) {
      dragAnchor = null;
      const startPos = paragraphOffsetToPosition(paragraph, 0);
      const endPos = paragraphOffsetToPosition(paragraph, getParagraphText(paragraph).length);
      applyWithZone(
        state,
        hit.zone,
        setSelection(state, { anchor: startPos, focus: endPos }),
        startPos,
      );
      stopDragging();
      deps.focusInputAfterPointerSelection();
      return;
    }

    if (event.detail === 2 && paragraph) {
      dragAnchor = null;
      const word = resolveWordSelection(getParagraphText(paragraph), hit.paragraphOffset);
      const startPos = paragraphOffsetToPosition(paragraph, word.start);
      const endPos = paragraphOffsetToPosition(paragraph, word.end);
      applyWithZone(
        state,
        hit.zone,
        setSelection(state, { anchor: startPos, focus: endPos }),
        startPos,
      );
      stopDragging();
      deps.focusInputAfterPointerSelection();
      return;
    }

    if (!hit.resolvedFromParagraph && isZoneTransition) {
      dragAnchor = null;
      applyWithZone(state, hit.zone, state);
      stopDragging();
      deps.focusInputAfterPointerSelection();
      return;
    }

    if (!hit.resolvedFromParagraph) {
      deps.focusInputAfterPointerSelection();
      return;
    }

    const dragStart = hit.tableCellAnchorPosition ?? hit.position;
    dragAnchor = dragStart;
    applyWithZone(
      state,
      hit.zone,
      {
        ...state,
        selection: {
          anchor: { ...hit.position },
          focus: { ...hit.position },
        },
      },
      hit.position,
    );
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    deps.focusInputAfterPointerSelection();
  };

  const handleSurfaceDblClick = (event: MouseEvent) => {
    event.preventDefault();
  };

  const handleParagraphMouseDown = (
    _paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    handleSurfaceMouseDown(event);
  };

  return {
    handleSurfaceMouseDown,
    handleSurfaceDblClick,
    handleParagraphMouseDown,
    stopDragging,
  };
}
