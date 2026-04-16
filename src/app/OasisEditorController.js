import { Operations } from '../core/operations/OperationFactory.js';

const DEMO_PARAGRAPH = 'Novo parágrafo adicionado para testar crescimento do documento, reflow e paginação dentro da arquitetura limpa do oasis-editor.';
const DEMO_BATCH = [
  'Batch paragraph 1. O documento lógico permanece contínuo e a página continua sendo derivada.',
  'Batch paragraph 2. O projeto foi reorganizado para reduzir acoplamento e deixar responsabilidades mais claras.',
  'Batch paragraph 3. Controller, presenter, runtime, composição e renderização evoluem de forma isolada.',
  'Batch paragraph 4. O nome e a identidade da aplicação permanecem oasis-editor em toda a base.',
  'Batch paragraph 5. A próxima etapa natural é ligar a edição rica real ao document model definitivo.',
];

export class OasisEditorController {
  constructor({ runtime, layoutService, presenter, view }) {
    this.runtime = runtime;
    this.layoutService = layoutService;
    this.presenter = presenter;
    this.view = view;
  }

  start() {
    this.view.renderTemplateOptions(this.presenter.getTemplateOptions());
    this.view.bind({
      onAddParagraph: () => this.addParagraph(),
      onAddBatch: () => this.addBatch(),
      onRepaginate: () => this.refresh(),
      onExport: () => this.exportDocument(),
      onTemplateChange: (templateId) => this.setTemplate(templateId),
    });

    this.runtime.subscribe(() => {
      this.refresh();
    });
  }

  addParagraph() {
    this.runtime.dispatch(Operations.appendParagraph(DEMO_PARAGRAPH));
  }

  addBatch() {
    DEMO_BATCH.forEach((text) => this.runtime.dispatch(Operations.appendParagraph(text)));
  }

  setTemplate(templateId) {
    const firstSection = this.runtime.getState().document.sections[0];
    this.runtime.dispatch(Operations.setSectionTemplate(firstSection.id, templateId));
  }

  refresh() {
    const state = this.runtime.getState();
    const layout = this.layoutService.compose(state.document);
    const viewModel = this.presenter.present({ state, layout });
    this.view.render(viewModel);
  }

  exportDocument() {
    this.view.downloadJson('oasis-editor-document.json', this.runtime.exportJson());
  }
}
