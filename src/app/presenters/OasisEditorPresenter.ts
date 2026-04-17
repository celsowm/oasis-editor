import { EditorState } from "../../core/runtime/EditorState.js";
import { EditorSelection } from "../../core/selection/SelectionTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { PageTemplate } from "../../core/pages/PageTemplateTypes.js";
import { MarkSet } from "../../core/document/BlockTypes.js";

export interface TemplateOption {
  value: string;
  label: string;
}

export interface SelectionState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
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
    };

    if (selection) {
      const blockId = selection.anchor.blockId;
      let targetBlock = undefined;
      for (const section of state.document.sections) {
        targetBlock = section.children.find((b) => b.id === blockId);
        if (targetBlock) break;
      }

      if (targetBlock && targetBlock.children.length > 0) {
        const marks: MarkSet = targetBlock.children[0].marks;
        selectionState = {
          bold: !!marks.bold,
          italic: !!marks.italic,
          underline: !!marks.underline,
        };
      }
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
      layout,
    };
  }
}
