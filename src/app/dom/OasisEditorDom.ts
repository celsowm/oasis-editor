export class OasisEditorDom {
  private document: Document;

  constructor(documentRef: Document) {
    this.document = documentRef;
  }

  getRoot(): HTMLElement {
    return this.requireElement("oasis-editor-app");
  }

  getPagesContainer(): HTMLElement {
    return this.requireElement("oasis-editor-pages");
  }

  getTemplateSelect(): HTMLSelectElement {
    return this.requireElement("oasis-editor-template") as HTMLSelectElement;
  }

  getBoldButton(): HTMLElement {
    return this.requireElement("oasis-editor-bold");
  }

  getItalicButton(): HTMLElement {
    return this.requireElement("oasis-editor-italic");
  }

  getUnderlineButton(): HTMLElement {
    return this.requireElement("oasis-editor-underline");
  }

  getColorPickerContainer(): HTMLElement {
    return this.requireElement("oasis-editor-color-picker-container");
  }

  getAlignLeftButton(): HTMLElement {
    return this.requireElement("oasis-editor-align-left");
  }

  getAlignCenterButton(): HTMLElement {
    return this.requireElement("oasis-editor-align-center");
  }

  getAlignRightButton(): HTMLElement {
    return this.requireElement("oasis-editor-align-right");
  }

  getAlignJustifyButton(): HTMLElement {
    return this.requireElement("oasis-editor-align-justify");
  }

  getUndoButton(): HTMLElement {
    return this.requireElement("oasis-editor-undo");
  }

  getRedoButton(): HTMLElement {
    return this.requireElement("oasis-editor-redo");
  }

  getExportButton(): HTMLElement {
    return this.requireElement("oasis-editor-export");
  }

  getInsertImageButton(): HTMLElement {
    return this.requireElement("oasis-editor-insert-image");
  }

  getImageFileInput(): HTMLInputElement {
    return this.requireElement("oasis-editor-image-input") as HTMLInputElement;
  }

  getStatus(): HTMLElement {
    return this.requireElement("oasis-editor-status");
  }

  getMetrics(): HTMLElement {
    return this.requireElement("oasis-editor-metrics");
  }

  getHiddenInput(): HTMLInputElement {
    return this.requireElement("oasis-editor-input") as HTMLInputElement;
  }

  requireElement(id: string): HTMLElement {
    const element = this.document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required oasis-editor element: #${id}`);
    }
    return element;
  }
}
