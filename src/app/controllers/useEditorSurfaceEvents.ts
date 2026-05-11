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
  type EditorDocument,
} from "../../core/model.js";
import { isSelectionCollapsed } from "../../core/selection.js";
import { resolveWordSelection } from "../../core/wordBoundaries.js";
import { setSelection } from "../../core/editorCommands.js";
import { createSectionBoundaryParagraph } from "../../core/editorState.js";

export interface UseEditorSurfaceEventsProps {
  state: () => EditorState;
  applyState: (newState: EditorState) => void;
  surfaceRef: () => HTMLDivElement | null;
  tableResize: { handleMouseDown: (event: MouseEvent) => boolean };
  imageOps: { stopImageDrag: () => void; stopImageResize: () => void };
  clearPendingCaretTextStyle: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInputAfterPointerSelection: () => void;
  resolvePositionAtSurfacePoint: (clientX: number, clientY: number) => EditorPosition | null;
  resolveParagraphClickOffset: (paragraph: EditorParagraphNode, event: MouseEvent) => number;
  findPointerParagraphElement: (event: MouseEvent, root: HTMLElement) => HTMLElement | null;
  getDocumentParagraphs: (doc: EditorDocument) => EditorParagraphNode[];
  getParagraphById: (doc: EditorDocument, id: string) => EditorParagraphNode | undefined;
  logger: { debug: (msg: string) => void; info: (msg: string) => void };
}

export function createEditorSurfaceEvents(deps: UseEditorSurfaceEventsProps) {
  let dragAnchor: EditorPosition | null = null;

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!dragAnchor) return;
    const position = deps.resolvePositionAtSurfacePoint(event.clientX, event.clientY);
    if (!position) return;

    const state = deps.state();
    deps.applyState(
      setSelection(state, {
        anchor: dragAnchor,
        focus: position,
      }),
    );
    const sel = deps.state().selection;
    const secIdx = getActiveSectionIndex(state);
    const anchorLocInfo = findParagraphTableLocation(state.document, dragAnchor.paragraphId, secIdx);
    const focusLocInfo = findParagraphTableLocation(state.document, sel.focus.paragraphId, secIdx);
    
    const anchorLoc = anchorLocInfo ? `b${anchorLocInfo.blockIndex}r${anchorLocInfo.rowIndex}c${anchorLocInfo.cellIndex}` : "";
    const focusLoc = focusLocInfo ? `b${focusLocInfo.blockIndex}r${focusLocInfo.rowIndex}c${focusLocInfo.cellIndex}` : "";
    
    deps.logger.debug(
      `selection:drag ${dragAnchor.paragraphId}[${dragAnchor.offset}]→${sel.focus.paragraphId}[${sel.focus.offset}] [${anchorLoc}→${focusLoc}]`
    );
  };

  const stopDragging = () => {
    dragAnchor = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const handleWindowMouseUp = () => {
    const state = deps.state();
    const sel = state.selection;
    const secIdx = getActiveSectionIndex(state);
    const anchorLocInfo = findParagraphTableLocation(state.document, sel.anchor.paragraphId, secIdx);
    const focusLocInfo = findParagraphTableLocation(state.document, sel.focus.paragraphId, secIdx);
    
    const anchorLoc = anchorLocInfo ? `b${anchorLocInfo.blockIndex}r${anchorLocInfo.rowIndex}c${anchorLocInfo.cellIndex}` : "";
    const focusLoc = focusLocInfo ? `b${focusLocInfo.blockIndex}r${focusLocInfo.rowIndex}c${focusLocInfo.cellIndex}` : "";
    
    deps.logger.info(
      `selection:end ${sel.anchor.paragraphId}[${sel.anchor.offset}]→${sel.focus.paragraphId}[${sel.focus.offset}] [${anchorLoc}→${focusLoc}]`
    );
    stopDragging();
    deps.focusInputAfterPointerSelection();
  };

  const handleSurfaceMouseDown = (event: MouseEvent, forceTransition = false) => {
    const state = deps.state();
    deps.clearPendingCaretTextStyle();
    if (deps.tableResize.handleMouseDown(event)) return;

    event.preventDefault();
    deps.imageOps.stopImageDrag();
    deps.imageOps.stopImageResize();

    const headerZone = (event.target as HTMLElement).closest(".oasis-editor-page-header-zone");
    const footerZone = (event.target as HTMLElement).closest(".oasis-editor-page-footer-zone");
    const targetZone = headerZone ? "header" : footerZone ? "footer" : "main";
    const isZoneTransition = targetZone !== state.activeZone;

    const surface = deps.surfaceRef();
    const paragraphElement = surface
      ? deps.findPointerParagraphElement(event, (headerZone || footerZone || surface) as HTMLElement)
      : null;

    if (!paragraphElement && !isZoneTransition) {
      deps.focusInputAfterPointerSelection();
      return;
    }

    const paragraphId = paragraphElement?.dataset.paragraphId;
    const paragraph = paragraphId
      ? deps.getDocumentParagraphs(state.document).find((candidate) => candidate.id === paragraphId)
      : undefined;

    if (!isZoneTransition && (!paragraphId || !paragraph || !surface)) {
      deps.focusInputAfterPointerSelection();
      return;
    }

    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();

    const applyWithZone = (newState: EditorState, targetPosition?: EditorPosition) => {
      if (isZoneTransition) {
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
                pageSettings: normalizePageSettings(updatedDocument.pageSettings ?? DEFAULT_EDITOR_PAGE_SETTINGS),
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
            zoneParagraph = firstBlock.type === "paragraph" ? firstBlock : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        } else if (targetZone === "footer") {
          if (!newFooter || newFooter.length === 0) {
            zoneParagraph = createSectionBoundaryParagraph("footer");
            newFooter = [zoneParagraph];
          } else {
            const firstBlock = newFooter[0];
            zoneParagraph = firstBlock.type === "paragraph" ? firstBlock : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        }

        if (newHeader !== section.header || newFooter !== section.footer) {
          const newSections = [...sections];
          newSections[activeSectionIndex] = { ...section, header: newHeader, footer: newFooter };
          updatedDocument = { ...updatedDocument, sections: newSections };
        }

        const zonePosition = targetPosition ? targetPosition : zoneParagraph ? paragraphOffsetToPosition(zoneParagraph, 0) : newState.selection.anchor;

        deps.applyState({
          ...newState,
          document: updatedDocument,
          selection: { anchor: zonePosition, focus: zonePosition },
          activeSectionIndex,
          activeZone: targetZone,
        });
      } else {
        deps.applyState(newState);
      }
    };

    if (paragraph && surface) {
      const offset = deps.resolveParagraphClickOffset(paragraph, event);
      const position = paragraphOffsetToPosition(paragraph, offset);

      if (event.shiftKey) {
        dragAnchor = state.selection.anchor;
        if (isZoneTransition) {
          applyWithZone(state, position);
        } else {
          applyWithZone(setSelection(state, { anchor: state.selection.anchor, focus: position }));
        }
      } else {
        dragAnchor = position;
        if (isZoneTransition) {
          applyWithZone(state, position);
        } else {
          applyWithZone({ ...state, selection: { anchor: { ...position }, focus: { ...position } } });
        }
      }
    } else if (isZoneTransition) {
      applyWithZone(state);
    }

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    deps.focusInputAfterPointerSelection();
  };

  const handleSurfaceDblClick = (event: MouseEvent) => {
    deps.clearPendingCaretTextStyle();
    event.preventDefault();
    const headerZone = (event.target as HTMLElement).closest(".oasis-editor-page-header-zone");
    const footerZone = (event.target as HTMLElement).closest(".oasis-editor-page-footer-zone");
    const targetZone = headerZone ? "header" : footerZone ? "footer" : "main";

    if (targetZone !== deps.state().activeZone) {
      handleSurfaceMouseDown(event, true);
    }
  };

  const handleParagraphMouseDown = (paragraphId: string, event: MouseEvent & { currentTarget: HTMLParagraphElement }) => {
    const state = deps.state();
    deps.clearPendingCaretTextStyle();
    event.preventDefault();
    event.stopPropagation();
    
    const paragraph = deps.getParagraphById(state.document, paragraphId);
    if (!paragraph || !deps.surfaceRef()) return;

    const isHeaderClick = (event.target as HTMLElement).closest(".oasis-editor-page-header-zone") !== null;
    const isFooterClick = (event.target as HTMLElement).closest(".oasis-editor-page-footer-zone") !== null;
    const targetZone = isHeaderClick ? "header" : isFooterClick ? "footer" : "main";
    const isZoneTransition = targetZone !== state.activeZone;

    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.imageOps.stopImageDrag();
    deps.imageOps.stopImageResize();

    const applyWithZone = (newState: EditorState, targetPosition?: EditorPosition) => {
      if (isZoneTransition) {
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
                pageSettings: normalizePageSettings(updatedDocument.pageSettings ?? DEFAULT_EDITOR_PAGE_SETTINGS),
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
            zoneParagraph = firstBlock.type === "paragraph" ? firstBlock : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        } else if (targetZone === "footer") {
          if (!newFooter || newFooter.length === 0) {
            zoneParagraph = createSectionBoundaryParagraph("footer");
            newFooter = [zoneParagraph];
          } else {
            const firstBlock = newFooter[0];
            zoneParagraph = firstBlock.type === "paragraph" ? firstBlock : (getBlockParagraphs(firstBlock)[0] ?? null);
          }
        }

        if (newHeader !== section.header || newFooter !== section.footer) {
          const newSections = [...sections];
          newSections[activeSectionIndex] = { ...section, header: newHeader, footer: newFooter };
          updatedDocument = { ...updatedDocument, sections: newSections };
        }

        const zonePosition = targetPosition ? targetPosition : zoneParagraph ? paragraphOffsetToPosition(zoneParagraph, 0) : newState.selection.anchor;

        deps.applyState({
          ...newState,
          document: updatedDocument,
          selection: { anchor: zonePosition, focus: zonePosition },
          activeSectionIndex,
          activeZone: targetZone,
        });
      } else {
        deps.applyState(newState);
      }
    };

    if (event.detail >= 3) {
      dragAnchor = null;
      const targetPos = paragraphOffsetToPosition(paragraph, 0);
      applyWithZone(
        setSelection(state, {
          anchor: targetPos,
          focus: paragraphOffsetToPosition(paragraph, getParagraphText(paragraph).length),
        }),
        targetPos,
      );
      stopDragging();
      deps.focusInputAfterPointerSelection();
      return;
    }

    const offset = deps.resolveParagraphClickOffset(paragraph, event);
    const position = paragraphOffsetToPosition(paragraph, offset);
    const cellLocation = findParagraphTableLocation(state.document, paragraphId, getActiveSectionIndex(state));
    
    const anchorPosition = cellLocation
      ? (() => {
          const hasSections = state.document.sections && state.document.sections.length > 0;
          const section = hasSections ? state.document.sections![getActiveSectionIndex(state)] : null;

          let targetBlocks = [];
          if (section) {
            if (cellLocation.zone === "header") targetBlocks = section.header || [];
            else if (cellLocation.zone === "footer") targetBlocks = section.footer || [];
            else targetBlocks = section.blocks;
          } else {
            targetBlocks = state.document.blocks;
          }

          const block = targetBlocks[cellLocation.blockIndex];
          const cellParagraph = block?.type === "table" ? block.rows[cellLocation.rowIndex]?.cells[cellLocation.cellIndex]?.blocks[0] : undefined;
          return cellParagraph ? paragraphOffsetToPosition(cellParagraph, 0) : position;
        })()
      : position;

    if (event.shiftKey) {
      dragAnchor = state.selection.anchor;
      applyWithZone(setSelection(state, { anchor: state.selection.anchor, focus: position }));
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
      deps.focusInputAfterPointerSelection();
      return;
    }

    if (event.detail === 2) {
      const word = resolveWordSelection(getParagraphText(paragraph), offset);
      dragAnchor = null;
      const targetPos = paragraphOffsetToPosition(paragraph, word.start);
      applyWithZone(
        setSelection(state, {
          anchor: targetPos,
          focus: paragraphOffsetToPosition(paragraph, word.end),
        }),
        targetPos,
      );
      stopDragging();
      deps.focusInputAfterPointerSelection();
      return;
    }

    dragAnchor = cellLocation ? anchorPosition : position;
    applyWithZone(
      { ...state, selection: { anchor: { ...position }, focus: { ...position } } },
      position,
    );
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    deps.focusInputAfterPointerSelection();
  };

  return {
    handleSurfaceMouseDown,
    handleSurfaceDblClick,
    handleParagraphMouseDown,
    stopDragging,
  };
}
