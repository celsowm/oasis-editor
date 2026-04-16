export class OasisEditorDom {
  constructor(documentRef) {
    this.document = documentRef;
  }

  getRoot() {
    return this.requireElement('oasis-editor-app');
  }

  getPagesContainer() {
    return this.requireElement('oasis-editor-pages');
  }

  getTemplateSelect() {
    return this.requireElement('oasis-editor-template');
  }

  getAddParagraphButton() {
    return this.requireElement('oasis-editor-add-paragraph');
  }

  getAddBatchButton() {
    return this.requireElement('oasis-editor-add-batch');
  }

  getRepaginateButton() {
    return this.requireElement('oasis-editor-repaginate');
  }

  getExportButton() {
    return this.requireElement('oasis-editor-export');
  }

  getStatus() {
    return this.requireElement('oasis-editor-status');
  }

  getRevision() {
    return this.requireElement('oasis-editor-revision');
  }

  getPagesCount() {
    return this.requireElement('oasis-editor-pages-count');
  }

  getSectionsCount() {
    return this.requireElement('oasis-editor-sections-count');
  }

  getTemplateName() {
    return this.requireElement('oasis-editor-template-name');
  }

  getBackend() {
    return this.requireElement('oasis-editor-backend');
  }

  getNotesList() {
    return this.requireElement('oasis-editor-notes');
  }

  requireElement(id) {
    const element = this.document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required oasis-editor element: #${id}`);
    }
    return element;
  }
}
