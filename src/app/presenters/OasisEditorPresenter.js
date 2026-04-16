export class OasisEditorPresenter {
  constructor(pageTemplates) {
    this.pageTemplates = pageTemplates;
  }

  getTemplateOptions() {
    return this.pageTemplates.map((template) => ({
      value: template.id,
      label: template.name,
    }));
  }

  present({ state, layout }) {
    const firstSection = state.document.sections[0];
    const selection = state.selection;

    let selectionState = {
      bold: false,
      italic: false,
      underline: false,
    };

    if (selection) {
      const blockId = selection.anchor.blockId;
      let targetBlock;
      for (const section of state.document.sections) {
        targetBlock = section.children.find(b => b.id === blockId);
        if (targetBlock) break;
      }

      if (targetBlock && targetBlock.children.length > 0) {
        // Just take marks from the first run for now
        const marks = targetBlock.children[0].marks;
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
        backend: 'Document Runtime + Pagination Engine',
      },
      status: `Revision ${state.document.revision} • ${layout.pages.length} pages`,
      selectionState,
      selection,
      layout,
    };
  }
}
