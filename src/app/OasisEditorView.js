import { PageLayer } from '../ui/pages/PageLayer.js';
import { PageViewport } from '../ui/pages/PageViewport.js';

export class OasisEditorView {
  constructor(dom) {
    this.dom = dom;
    this.elements = {
      root: dom.getRoot(),
      pagesContainer: dom.getPagesContainer(),
      templateSelect: dom.getTemplateSelect(),
      addParagraphButton: dom.getAddParagraphButton(),
      addBatchButton: dom.getAddBatchButton(),
      repaginateButton: dom.getRepaginateButton(),
      exportButton: dom.getExportButton(),
      status: dom.getStatus(),
      revision: dom.getRevision(),
      pages: dom.getPagesCount(),
      sections: dom.getSectionsCount(),
      activeTemplate: dom.getTemplateName(),
      backend: dom.getBackend(),
      notesList: dom.getNotesList(),
    };

    this.pageLayer = new PageLayer(this.elements.pagesContainer);
    this.viewport = new PageViewport(this.elements.root, this.pageLayer);
  }

  renderTemplateOptions(options) {
    this.elements.templateSelect.innerHTML = '';

    options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      this.elements.templateSelect.appendChild(optionElement);
    });
  }

  bind(events) {
    this.elements.addParagraphButton.addEventListener('click', events.onAddParagraph);
    this.elements.addBatchButton.addEventListener('click', events.onAddBatch);
    this.elements.repaginateButton.addEventListener('click', events.onRepaginate);
    this.elements.exportButton.addEventListener('click', events.onExport);
    this.elements.templateSelect.addEventListener('change', (event) => events.onTemplateChange(event.target.value));
  }

  render(viewModel) {
    this.viewport.render(viewModel.layout);
    this.elements.templateSelect.value = viewModel.templateId;
    this.elements.status.textContent = viewModel.status;
    this.elements.revision.textContent = viewModel.metrics.revision;
    this.elements.pages.textContent = viewModel.metrics.pages;
    this.elements.sections.textContent = viewModel.metrics.sections;
    this.elements.activeTemplate.textContent = viewModel.metrics.template;
    this.elements.backend.textContent = viewModel.metrics.backend;
    this.renderNotes(viewModel.notes);
  }

  renderNotes(notes) {
    this.elements.notesList.innerHTML = '';

    notes.forEach((note) => {
      const item = document.createElement('li');
      item.textContent = note;
      this.elements.notesList.appendChild(item);
    });
  }

  downloadJson(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
