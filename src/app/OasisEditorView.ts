import { EditorViewModel } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorDom } from "./dom/OasisEditorDom.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { PageLayer } from "../ui/pages/PageLayer.js";
import { PageViewport } from "../ui/pages/PageViewport.js";

export interface ViewElements {
  root: HTMLElement;
  pagesContainer: HTMLElement;
  templateSelect: HTMLSelectElement;
  boldButton: HTMLElement;
  italicButton: HTMLElement;
  underlineButton: HTMLElement;
  undoButton: HTMLElement;
  redoButton: HTMLElement;
  exportButton: HTMLElement;
  status: HTMLElement;
  metrics: HTMLElement;
  hiddenInput: HTMLInputElement;
}

export interface SelectionState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface ViewEventBindings {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onTemplateChange: (templateId: string) => void;
  onTextInput: (text: string) => void;
  onDelete: () => void;
  onEnter: (isShift: boolean) => void;
  onArrowKey: (key: string) => void;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onTripleClick?: (e: MouseEvent) => void;
}

export class OasisEditorView {
  private dom: OasisEditorDom;
  private presenter: OasisEditorPresenter;
  readonly elements: ViewElements;
  private pageLayer: PageLayer;
  private viewport: PageViewport;

  constructor(
    dom: OasisEditorDom,
    presenter: OasisEditorPresenter,
    measurer: TextMeasurer,
  ) {
    this.dom = dom;
    this.presenter = presenter;
    this.elements = {
      root: dom.getRoot(),
      pagesContainer: dom.getPagesContainer(),
      templateSelect: dom.getTemplateSelect(),
      boldButton: dom.getBoldButton(),
      italicButton: dom.getItalicButton(),
      underlineButton: dom.getUnderlineButton(),
      undoButton: dom.getUndoButton(),
      redoButton: dom.getRedoButton(),
      exportButton: dom.getExportButton(),
      status: dom.getStatus(),
      metrics: dom.getMetrics(),
      hiddenInput: dom.getHiddenInput(),
    };

    this.pageLayer = new PageLayer(this.elements.pagesContainer);
    this.viewport = new PageViewport(
      this.elements.root,
      this.pageLayer,
      measurer,
    );
  }

  renderTemplateOptions(options: { value: string; label: string }[]): void {
    this.elements.templateSelect.innerHTML = "";

    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      this.elements.templateSelect.appendChild(optionElement);
    });
  }

  bind(events: ViewEventBindings): void {
    this.elements.boldButton.addEventListener("click", events.onBold);
    this.elements.italicButton.addEventListener("click", events.onItalic);
    this.elements.underlineButton.addEventListener("click", events.onUnderline);
    this.elements.undoButton.addEventListener("click", events.onUndo);
    this.elements.redoButton.addEventListener("click", events.onRedo);
    this.elements.exportButton.addEventListener("click", events.onExport);
    this.elements.templateSelect.addEventListener("change", (event) =>
      events.onTemplateChange((event.target as HTMLSelectElement).value),
    );

    // Hidden input for keyboard handling
    this.elements.hiddenInput.addEventListener("input", (e) => {
      const inputEvent = e as InputEvent;
      console.log("=== Hidden input event ===", inputEvent.data);
      console.log(
        "Hidden input focado?",
        document.activeElement === this.elements.hiddenInput,
      );
      events.onTextInput(inputEvent.data ?? "");
      this.elements.hiddenInput.value = "";
    });

    this.elements.hiddenInput.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      console.log("=== Hidden input keydown ===", ke.key);
      console.log(
        "Hidden input focado?",
        document.activeElement === this.elements.hiddenInput,
      );
      if (ke.key === "Backspace") {
        events.onDelete();
        ke.preventDefault();
      } else if (ke.key === "Enter") {
        events.onEnter(ke.shiftKey);
        ke.preventDefault();
      } else if (
        ke.key.startsWith("Arrow") ||
        ke.key === "Home" ||
        ke.key === "End"
      ) {
        events.onArrowKey(ke.key);
        ke.preventDefault();
      }
    });

    // Detecção de cliques múltiplos (Word style)
    let lastMouseDownTime = 0;
    let lastMouseDownPos = { x: 0, y: 0 };
    let clickCount = 0;

    this.elements.root.addEventListener("mousedown", (e) => {
      const me = e as MouseEvent;
      const now = Date.now();
      const dist = Math.sqrt(
        Math.pow(me.clientX - lastMouseDownPos.x, 2) +
          Math.pow(me.clientY - lastMouseDownPos.y, 2),
      );

      if (now - lastMouseDownTime < 350 && dist < 15) {
        clickCount++;
      } else {
        clickCount = 1;
      }

      lastMouseDownTime = now;
      lastMouseDownPos = { x: me.clientX, y: me.clientY };

      if (clickCount === 2) {
        if (events.onDblClick) events.onDblClick(me);
        me.preventDefault();
        return;
      }

      if (clickCount === 3) {
        if (events.onTripleClick) events.onTripleClick(me);
        me.preventDefault();
        return;
      }

      events.onMouseDown(me);
      setTimeout(() => this.elements.hiddenInput.focus(), 0);
    });

    this.elements.root.addEventListener(
      "dblclick",
      (e) => {
        e.preventDefault();
      },
      true,
    );

    this.elements.root.addEventListener("mousemove", (e) => {
      if (events.onMouseMove) events.onMouseMove(e as MouseEvent);
    });

    this.elements.root.addEventListener("mouseup", (e) => {
      if (events.onMouseUp) events.onMouseUp(e as MouseEvent);
    });
  }

  render(viewModel: EditorViewModel): void {
    this.viewport.render(viewModel.layout, viewModel.selection);
    this.elements.templateSelect.value = viewModel.templateId;
    this.elements.status.textContent = viewModel.status;
    this.elements.metrics.textContent = `Rev: ${viewModel.metrics.revision} | Pages: ${viewModel.metrics.pages}`;

    this.updateToolbar(viewModel.selectionState);
  }

  updateToolbar(selectionState: SelectionState | undefined): void {
    if (!selectionState) return;
    this.elements.boldButton.classList.toggle("active", selectionState.bold);
    this.elements.italicButton.classList.toggle(
      "active",
      selectionState.italic,
    );
    this.elements.underlineButton.classList.toggle(
      "active",
      selectionState.underline,
    );
  }

  downloadJson(filename: string, content: string): void {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
