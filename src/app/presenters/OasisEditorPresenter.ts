import { EditorState } from "../../core/runtime/EditorState.js";
import { EditorSelection } from "../../core/selection/SelectionTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { PageTemplate } from "../../core/pages/PageTemplateTypes.js";
import { MarkSet, isTextBlock } from "../../core/document/BlockTypes.js";
import {
  findParentTable,
  findBlockById,
} from "../../core/document/BlockUtils.js";

export interface TemplateOption {
  value: string;
  label: string;
}

export interface SelectionState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: "left" | "center" | "right" | "justify";
  isListItem: boolean;
  isOrderedListItem: boolean;
}

export interface EditorViewModel {
  templateId: string;
  metrics: {
    revision: string;
    pages: string;
    sections: string;
    template: string;
    backend: string;
  };
  status: string;
  selectionState: SelectionState;
  selection: EditorSelection | null;
  selectedImageId: string | null;
  activeTableId: string | null;
  activeTableFirstCellId: string | null;
  layout: LayoutState;
}

export class OasisEditorPresenter {
  private pageTemplates: PageTemplate[];

  constructor(pageTemplates: PageTemplate[]) {
    this.pageTemplates = pageTemplates;
  }

  getTemplateOptions(): TemplateOption[] {
    return this.pageTemplates.map((template) => ({
      value: template.id,
      label: template.name,
    }));
  }

  present({
    state,
    layout,
  }: {
    state: EditorState;
    layout: LayoutState;
  }): EditorViewModel {
    const firstSection = state.document.sections[0];
    const selection = state.selection;
    let selectionState: SelectionState = {
      bold: false,
      italic: false,
      underline: false,
      color: "#000000",
      align: "left",
      isListItem: false,
      isOrderedListItem: false,
    };
    let activeTableId: string | null = null;
    let activeTableFirstCellId: string | null = null;

    if (selection) {
      const blockId = selection.anchor.blockId;
      const tableInfo = findParentTable(state.document, blockId);
      if (tableInfo) {
        activeTableId = tableInfo.table.id;
        activeTableFirstCellId = (tableInfo.table as any).rows[0].cells[0].id;
      }

      const targetBlock = findBlockById(state.document, blockId);

      if (targetBlock && isTextBlock(targetBlock)) {
        const marks: MarkSet =
          targetBlock.children.length > 0 ? targetBlock.children[0].marks : {};
        const effectiveMarks = {
          ...marks,
          ...(state.pendingMarks || {}),
        };

        selectionState = {
          bold: !!effectiveMarks.bold,
          italic: !!effectiveMarks.italic,
          underline: !!effectiveMarks.underline,
          color: effectiveMarks.color || "#000000",
          align: targetBlock.align || "left",
          isListItem: targetBlock.kind === "list-item",
          isOrderedListItem: targetBlock.kind === "ordered-list-item",
        };
      } else if (targetBlock && targetBlock.kind === "image") {
        selectionState = {
          ...selectionState,
          align: targetBlock.align || "left",
        };
      }
    } else if (state.pendingMarks) {
      // If no selection but we have pending marks, reflect them in the toolbar
      selectionState = {
        ...selectionState,
        bold: !!state.pendingMarks.bold,
        italic: !!state.pendingMarks.italic,
        underline: !!state.pendingMarks.underline,
        color: state.pendingMarks.color || "#000000",
      };
    }

    return {
      templateId: firstSection.pageTemplateId,
      metrics: {
        revision: String(state.document.revision),
        pages: String(layout.pages.length),
        sections: String(state.document.sections.length),
        template: firstSection.pageTemplateId,
        backend: "Document Runtime + Pagination Engine",
      },
      status: `Revision ${state.document.revision} • ${layout.pages.length} pages`,
      selectionState,
      selection,
      selectedImageId: state.selectedImageId ?? null,
      activeTableId,
      activeTableFirstCellId,
      layout,
    };
  }
}
