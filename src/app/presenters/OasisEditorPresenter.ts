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
  strike: boolean;
  link: string | null;
  color: string;
  fontFamily: string;
  vertAlign: "superscript" | "subscript" | null;
  align: "left" | "center" | "right" | "justify";
  isListItem: boolean;
  isOrderedListItem: boolean;
  indentation: number;
  trackChangesEnabled: boolean;
}

export interface EditorViewModel {
  pageTemplate: PageTemplate;
  templateId: string;
  templateOptions: TemplateOption[];
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
  editingMode: "main" | "header" | "footer" | "footnote";
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
      strike: false,
      link: null,
      color: "#000000",
      fontFamily: "Inter",
      vertAlign: null,
      align: "left",
      isListItem: false,
      isOrderedListItem: false,
      indentation: 0,
      trackChangesEnabled: !!state.trackChangesEnabled,
    };
    let activeTableId: string | null = null;
    let activeTableFirstCellId: string | null = null;

    if (selection) {
      const blockId = selection.anchor.blockId;
      const tableInfo = findParentTable(state.document, blockId);
      if (tableInfo) {
        activeTableId = tableInfo.table.id;
        activeTableFirstCellId = tableInfo.table.rows[0].cells[0].id;
      }

      const targetBlock = findBlockById(state.document, blockId);

      if (targetBlock && isTextBlock(targetBlock)) {
        // Find marks at the specific inlineId from selection
        const targetRun = targetBlock.children.find(r => r.id === selection.anchor.inlineId);
        
        // If we are at the very end of a run, the "active" marks for typing 
        // usually follow that run UNLESS we have pendingMarks.
        let marks: MarkSet = {};
        if (targetRun) {
            marks = { ...targetRun.marks };
        } else if (targetBlock.children.length > 0) {
            marks = { ...targetBlock.children[0].marks };
        }
        
        const effectiveMarks = {
          ...marks,
          ...(state.pendingMarks || {}),
        };

        if (state.pendingMarks) {
            for (const key in state.pendingMarks) {
                if ((state.pendingMarks as any)[key] === undefined) {
                    delete (effectiveMarks as any)[key];
                }
            }
        }

        selectionState = {
          bold: !!effectiveMarks.bold,
          italic: !!effectiveMarks.italic,
          underline: !!effectiveMarks.underline,
          strike: !!effectiveMarks.strike,
          link: effectiveMarks.link || null,
          color: effectiveMarks.color || "#000000",
          fontFamily: effectiveMarks.fontFamily || "Inter",
          vertAlign: effectiveMarks.vertAlign || null,
          align: targetBlock.align || "left",
          isListItem: targetBlock.kind === "list-item",
          isOrderedListItem: targetBlock.kind === "ordered-list-item",
          indentation:
            "indentation" in targetBlock && targetBlock.indentation
              ? (targetBlock.indentation as number)
              : 0,
          trackChangesEnabled: !!state.trackChangesEnabled,
        };
      } else if (targetBlock && targetBlock.kind === "image") {
        selectionState = {
          ...selectionState,
          align: targetBlock.align || "left",
          trackChangesEnabled: !!state.trackChangesEnabled,
        };
      }
    } else if (state.pendingMarks) {
      // If no selection but we have pending marks, reflect them in the toolbar
      selectionState = {
        ...selectionState,
        bold: !!state.pendingMarks.bold,
        italic: !!state.pendingMarks.italic,
        underline: !!state.pendingMarks.underline,
        strike: !!state.pendingMarks.strike,
        link: state.pendingMarks.link || null,
        color: state.pendingMarks.color || "#000000",
        fontFamily: state.pendingMarks.fontFamily || "Inter",
        vertAlign: state.pendingMarks.vertAlign || null,
        trackChangesEnabled: !!state.trackChangesEnabled,
      };
    }

    return {
      pageTemplate:
        this.pageTemplates.find((t) => t.id === firstSection.pageTemplateId) ||
        this.pageTemplates[0],
      templateId: firstSection.pageTemplateId,
      templateOptions: this.getTemplateOptions(),
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
      editingMode: state.editingMode,
      layout,
    };
  }
}
