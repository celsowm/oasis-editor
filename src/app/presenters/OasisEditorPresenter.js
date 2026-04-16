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

    return {
      templateId: firstSection.pageTemplateId,
      metrics: {
        revision: String(state.document.revision),
        pages: String(layout.pages.length),
        sections: String(state.document.sections.length),
        template: firstSection.pageTemplateId,
        backend: 'Document Runtime + Pagination Engine',
      },
      status: `revision ${state.document.revision} • sections ${state.document.sections.length} • pages ${layout.pages.length}`,
      notes: [
        'oasis-editor tem identidade única e permanente.',
        'Documento, composição e paginação continuam separados.',
        'A UI recebe dados apresentados e não conhece regras do core.',
      ],
      layout,
    };
  }
}
