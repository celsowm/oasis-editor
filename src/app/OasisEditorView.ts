// @ts-nocheck








import { PageLayer } from "../ui/pages/PageLayer.js";
import { PageViewport } from "../ui/pages/PageViewport.js";

export class OasisEditorView {









  constructor(dom, presenter, measurer) {
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

  renderTemplateOptions(options) {
    this.elements.templateSelect.innerHTML = "";

    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      this.elements.templateSelect.appendChild(optionElement);
    });
  }

  bind(events) {
    this.elements.boldButton.addEventListener("click", events.onBold);
    this.elements.italicButton.addEventListener("click", events.onItalic);
    this.elements.underlineButton.addEventListener("click", events.onUnderline);
    this.elements.undoButton.addEventListener("click", events.onUndo);
    this.elements.redoButton.addEventListener("click", events.onRedo);
    this.elements.exportButton.addEventListener("click", events.onExport);
    this.elements.templateSelect.addEventListener("change", (event) =>
      events.onTemplateChange(event.target.value),
    );

    // Hidden input for keyboard handling
    this.elements.hiddenInput.addEventListener("input", (e) => {
      console.log('=== Hidden input event ===', e.data);
      console.log('Hidden input focado?', document.activeElement === this.elements.hiddenInput);
      events.onTextInput(e.data || "");
      this.elements.hiddenInput.value = "";
    });

    this.elements.hiddenInput.addEventListener("keydown", (e) => {
      console.log('=== Hidden input keydown ===', e.key);
      console.log('Hidden input focado?', document.activeElement === this.elements.hiddenInput);
      if (e.key === "Backspace") {
        events.onDelete();
        e.preventDefault();
      } else if (e.key === "Enter") {
        events.onEnter(e.shiftKey);
        e.preventDefault();
      } else if (e.key.startsWith("Arrow")) {
        events.onArrowKey(e.key);
        e.preventDefault();
      }
    });

    // Detecção de cliques múltiplos (Word style)
    let lastMouseDownTime = 0;
    let lastMouseDownPos = { x: 0, y: 0 };
    let clickCount = 0;

    this.elements.root.addEventListener("mousedown", (e) => {
      const now = Date.now();
      const dist = Math.sqrt(Math.pow(e.clientX - lastMouseDownPos.x, 2) + Math.pow(e.clientY - lastMouseDownPos.y, 2));
      
      if (now - lastMouseDownTime < 350 && dist < 15) {
        clickCount++;
      } else {
        clickCount = 1;
      }

      lastMouseDownTime = now;
      lastMouseDownPos = { x: e.clientX, y: e.clientY };

      if (clickCount === 2) {
        if (events.onDblClick) events.onDblClick(e);
        e.preventDefault();
        return;
      }

      if (clickCount === 3) {
        if (events.onTripleClick) events.onTripleClick(e);
        e.preventDefault();
        return;
      }

      events.onMouseDown(e);
      setTimeout(() => this.elements.hiddenInput.focus(), 0);
    });

    this.elements.root.addEventListener("dblclick", (e) => {
      e.preventDefault(); // Já lidado pelo mousedown manual
    }, true);

    this.elements.root.addEventListener("mousemove", (e) => {
      if (events.onMouseMove) events.onMouseMove(e);
    });

    this.elements.root.addEventListener("mouseup", (e) => {
      if (events.onMouseUp) events.onMouseUp(e);
    });
  }

  render(viewModel) {
    this.viewport.render(viewModel.layout, viewModel.selection);
    this.elements.templateSelect.value = viewModel.templateId;
    this.elements.status.textContent = viewModel.status;
    this.elements.metrics.textContent = `Rev: ${viewModel.metrics.revision} | Pages: ${viewModel.metrics.pages}`;

    this.updateToolbar(viewModel.selectionState);
  }

  updateToolbar(selectionState) {
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

  downloadJson(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
