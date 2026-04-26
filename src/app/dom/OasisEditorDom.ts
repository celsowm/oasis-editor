export class OasisEditorDom {
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  getRoot(): HTMLElement {
    return this.requireElement("oasis-editor-app");
  }

  getPagesContainer(): HTMLElement {
    return this.requireElement("oasis-editor-pages");
  }

  getRulerContainer(): HTMLElement {
    return this.requireElement("oasis-editor-ruler");
  }

  getTemplateSelect(): HTMLSelectElement {
    return this.requireElement("oasis-editor-template") as HTMLSelectElement;
  }

  getFormatPainterButton(): HTMLElement {
    return this.requireElement("oasis-editor-format-painter");
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

  getStrikethroughButton(): HTMLElement {
    return this.requireElement("oasis-editor-strikethrough");
  }

  getSuperscriptButton(): HTMLElement {
    return this.requireElement("oasis-editor-superscript");
  }

  getSubscriptButton(): HTMLElement {
    return this.requireElement("oasis-editor-subscript");
  }

  getLinkButton(): HTMLElement {
    return this.requireElement("oasis-editor-link");
  }

  getTrackChangesButton(): HTMLElement {
    return this.requireElement("oasis-editor-track-changes");
  }

  getStyleSelect(): HTMLSelectElement {
    return this.requireElement(
      "oasis-editor-style-select",
    ) as HTMLSelectElement;
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

  getBulletsButton(): HTMLElement {
    return this.requireElement("oasis-editor-bullets");
  }

  getOrderedListButton(): HTMLElement {
    return this.requireElement("oasis-editor-ordered-list");
  }

  getDecreaseIndentButton(): HTMLElement {
    return this.requireElement("oasis-editor-decrease-indent");
  }

  getIncreaseIndentButton(): HTMLElement {
    return this.requireElement("oasis-editor-increase-indent");
  }

  getUndoButton(): HTMLElement {
    return this.requireElement("oasis-editor-undo");
  }

  getRedoButton(): HTMLElement {
    return this.requireElement("oasis-editor-redo");
  }

  getPrintButton(): HTMLElement {
    return this.requireElement("oasis-editor-print");
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

  getMenuFileElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-file");
  }

  getMenuEditElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-edit");
  }

  getMenuViewElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-view");
  }

  getMenuInsertElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-insert");
  }

  getMenuFormatElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-format");
  }

  getMenuToolsElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-tools");
  }

  getMenuExtensionsElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-extensions");
  }

  getMenuHelpElement(): HTMLElement {
    return this.requireElement("oasis-editor-menu-help");
  }

  getZoomSelect(): HTMLSelectElement {
    return this.requireElement("oasis-editor-zoom") as HTMLSelectElement;
  }

  getImportDocxInput(): HTMLInputElement {
    return this.requireElement(
      "oasis-editor-import-docx-input",
    ) as HTMLInputElement;
  }

  getInsertTableButton(): HTMLElement {
    return this.requireElement("oasis-editor-insert-table");
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
    const element = this.root.querySelector<HTMLElement>(`#${id}`);
    if (!element) {
      throw new Error(`Missing required oasis-editor element: #${id}`);
    }
    return element;
  }
}
