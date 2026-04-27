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

  getHiddenInput(): HTMLInputElement {
    return this.requireElement("oasis-editor-input") as HTMLInputElement;
  }

  getImageFileInput(): HTMLInputElement {
    return this.requireElement("oasis-editor-image-input") as HTMLInputElement;
  }

  getImportDocxInput(): HTMLInputElement {
    return this.requireElement(
      "oasis-editor-import-docx-input",
    ) as HTMLInputElement;
  }

  requireElement(id: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(`#${id}`);
    if (!element) {
      throw new Error(`Missing required oasis-editor element: #${id}`);
    }
    return element;
  }
}
