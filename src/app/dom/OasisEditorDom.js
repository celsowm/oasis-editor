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

  getBoldButton() {
    return this.requireElement('oasis-editor-bold');
  }

  getItalicButton() {
    return this.requireElement('oasis-editor-italic');
  }

  getUnderlineButton() {
    return this.requireElement('oasis-editor-underline');
  }

  getUndoButton() {
    return this.requireElement('oasis-editor-undo');
  }

  getRedoButton() {
    return this.requireElement('oasis-editor-redo');
  }

  getExportButton() {
    return this.requireElement('oasis-editor-export');
  }

  getStatus() {
    return this.requireElement('oasis-editor-status');
  }

  getMetrics() {
    return this.requireElement('oasis-editor-metrics');
  }

  getHiddenInput() {
    return this.requireElement('oasis-editor-input');
  }

  requireElement(id) {
    const element = this.document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required oasis-editor element: #${id}`);
    }
    return element;
  }
}
