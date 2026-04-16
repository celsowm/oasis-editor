import { Operations } from '../core/operations/OperationFactory.js';

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
      onBold: () => this.toggleBold(),
      onItalic: () => this.toggleItalic(),
      onUnderline: () => this.toggleUnderline(),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onExport: () => this.exportDocument(),
      onTemplateChange: (templateId) => this.setTemplate(templateId),
      onTextInput: (text) => this.insertText(text),
      onDelete: () => this.deleteText(),
      onEnter: () => this.insertParagraph(),
      onArrowKey: (key) => this.moveCaret(key),
      onMouseDown: (e) => this.handleMouseDown(e),
    });

    this.runtime.subscribe(() => {
      this.refresh();
    });
  }

  toggleBold() {
    this.runtime.dispatch(Operations.toggleMark('bold'));
  }

  toggleItalic() {
    this.runtime.dispatch(Operations.toggleMark('italic'));
  }

  toggleUnderline() {
    this.runtime.dispatch(Operations.toggleMark('underline'));
  }

  undo() {
    this.runtime.undo();
  }

  redo() {
    this.runtime.redo();
  }

  insertText(text) {
    if (!text) return;
    this.runtime.dispatch(Operations.insertText(text));
  }

  deleteText() {
    this.runtime.dispatch(Operations.deleteText());
  }

  insertParagraph() {
    this.runtime.dispatch(Operations.insertParagraph());
  }

  moveCaret(key) {
    this.runtime.dispatch(Operations.moveSelection(key));
  }

  setTemplate(templateId) {
    const firstSection = this.runtime.getState().document.sections[0];
    this.runtime.dispatch(Operations.setSectionTemplate(firstSection.id, templateId));
  }

  handleMouseDown(event) {
    // Selection logic will go here
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
