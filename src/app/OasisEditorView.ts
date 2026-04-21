import { EditorViewModel } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorDom } from "./dom/OasisEditorDom.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { PageLayer } from "../ui/pages/PageLayer.js";
import { PageViewport } from "../ui/pages/PageViewport.js";
import { ColorPicker, ColorPickerListener } from "../ui/components/ColorPicker.js";
import { TablePicker, TablePickerListener } from "../ui/components/TablePicker.js";
import { ImageResizeOverlay } from "../ui/selection/ImageResizeOverlay.js";
import { TableFloatingToolbar, TableToolbarEvents } from "../ui/selection/TableFloatingToolbar.js";
import { TableMoveHandle, MoveHandleEvents } from "../ui/selection/TableMoveHandle.js";
import { LayoutFragment } from "../core/layout/LayoutFragment.js";

export interface ViewElements {
  root: HTMLElement;
  pagesContainer: HTMLElement;
  templateSelect: HTMLSelectElement;
  boldButton: HTMLElement;
  italicButton: HTMLElement;
  underlineButton: HTMLElement;
  undoButton: HTMLElement;
  redoButton: HTMLElement;
  status: HTMLElement;
  metrics: HTMLElement;
  hiddenInput: HTMLInputElement;
  alignLeft: HTMLElement;
  alignCenter: HTMLElement;
  alignRight: HTMLElement;
  alignJustify: HTMLElement;
  colorPickerContainer: HTMLElement;
  insertImageButton: HTMLElement;
  imageFileInput: HTMLInputElement;
  insertTableButton: HTMLElement;
}

export interface SelectionState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: "left" | "center" | "right" | "justify";
}

export interface ViewEventBindings {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTemplateChange: (templateId: string) => void;
  onAlign: (align: "left" | "center" | "right" | "justify") => void;
  onTextInput: (text: string) => void;
  onDelete: () => void;
  onEnter: (isShift: boolean) => void;
  onArrowKey: (key: string) => void;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onTripleClick?: (e: MouseEvent) => void;
  onInsertImage: (
    src: string,
    naturalWidth: number,
    naturalHeight: number,
    displayWidth: number,
  ) => void;
  onResizeImage: (blockId: string, width: number, height: number) => void;
  onSelectImage: (blockId: string) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onTableAction: (action: string, tableId: string) => void;
  onTableMove: (tableId: string, targetBlockId: string, isBefore: boolean) => void;
}

export interface ViewDeps {
  dom: OasisEditorDom;
  presenter: OasisEditorPresenter;
  measurer: TextMeasurer;
  colorPickerFactory: (containerId: string, listener: ColorPickerListener) => ColorPicker;
  tablePickerFactory: (containerId: string, options: TablePickerListener) => TablePicker;
  tableToolbarFactory: (events: TableToolbarEvents) => TableFloatingToolbar;
  tableMoveHandleFactory: (events: MoveHandleEvents) => TableMoveHandle;
  imageResizeOverlayFactory: (container: HTMLElement, onResize: (data: { blockId: string, width: number, height: number }) => void) => ImageResizeOverlay;
}

export class OasisEditorView {
  private dom: OasisEditorDom;
  private presenter: OasisEditorPresenter;
  readonly elements: ViewElements;
  private pageLayer: PageLayer;
  private viewport: PageViewport;
  private colorPicker!: ColorPicker;
  private tablePicker!: TablePicker;
  private imageResizeOverlay: ImageResizeOverlay | null = null;
  private tableToolbar!: TableFloatingToolbar;
  private tableMoveHandle!: TableMoveHandle;
  private events!: ViewEventBindings;
  private deps: ViewDeps;

  constructor(deps: ViewDeps) {
    this.deps = deps;
    this.dom = deps.dom;
    this.presenter = deps.presenter;
    this.elements = {
      root: this.dom.getRoot(),
      pagesContainer: this.dom.getPagesContainer(),
      templateSelect: this.dom.getTemplateSelect(),
      boldButton: this.dom.getBoldButton(),
      italicButton: this.dom.getItalicButton(),
      underlineButton: this.dom.getUnderlineButton(),
      undoButton: this.dom.getUndoButton(),
      redoButton: this.dom.getRedoButton(),
      status: this.dom.getStatus(),
      metrics: this.dom.getMetrics(),
      hiddenInput: this.dom.getHiddenInput(),
      alignLeft: this.dom.getAlignLeftButton(),
      alignCenter: this.dom.getAlignCenterButton(),
      alignRight: this.dom.getAlignRightButton(),
      alignJustify: this.dom.getAlignJustifyButton(),
      colorPickerContainer: this.dom.getColorPickerContainer(),
      insertImageButton: this.dom.getInsertImageButton(),
      imageFileInput: this.dom.getImageFileInput(),
      insertTableButton: this.dom.getInsertTableButton(),
    };

    this.pageLayer = new PageLayer(this.elements.pagesContainer);
    this.viewport = new PageViewport(
      this.elements.root,
      this.pageLayer,
      deps.measurer,
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
    this.events = events;
    this.elements.boldButton.addEventListener("click", events.onBold);
    this.elements.italicButton.addEventListener("click", events.onItalic);
    this.elements.underlineButton.addEventListener("click", events.onUnderline);

    this.colorPicker = this.deps.colorPickerFactory("oasis-editor-color-picker-container", {
      onColorSelected: (color) => events.onColorChange(color),
    });

    this.tablePicker = this.deps.tablePickerFactory("oasis-editor-insert-table", {
      onTableSelected: (rows: number, cols: number) => events.onInsertTable(rows, cols),
    });

    this.tableToolbar = this.deps.tableToolbarFactory({
      onAddRowAbove: (id) => this.events.onTableAction("addRowAbove", id),
      onAddRowBelow: (id) => this.events.onTableAction("addRowBelow", id),
      onAddColumnLeft: (id) => this.events.onTableAction("addColumnLeft", id),
      onAddColumnRight: (id) => this.events.onTableAction("addColumnRight", id),
      onDeleteRow: (id) => this.events.onTableAction("deleteRow", id),
      onDeleteColumn: (id) => this.events.onTableAction("deleteColumn", id),
      onDeleteTable: (id) => this.events.onTableAction("deleteTable", id),
    });

    this.tableMoveHandle = this.deps.tableMoveHandleFactory({
      onDragStart: (id, e) => {
        // Create a custom event to notify controller
        const ce = new CustomEvent("table-drag-start", { detail: { tableId: id, originalEvent: e } });
        this.elements.root.dispatchEvent(ce);
      }
    });

    this.elements.undoButton.addEventListener("click", events.onUndo);
    this.elements.redoButton.addEventListener("click", events.onRedo);
    this.elements.templateSelect.addEventListener("change", (event) =>
      events.onTemplateChange((event.target as HTMLSelectElement).value),
    );
    this.elements.alignLeft.addEventListener("click", () =>
      events.onAlign("left"),
    );
    this.elements.alignCenter.addEventListener("click", () =>
      events.onAlign("center"),
    );
    this.elements.alignRight.addEventListener("click", () =>
      events.onAlign("right"),
    );
    this.elements.alignJustify.addEventListener("click", () =>
      events.onAlign("justify"),
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

    // ── Image insertion via file picker ──
    this.elements.insertImageButton.addEventListener("click", () => {
      this.elements.imageFileInput.value = "";
      this.elements.imageFileInput.click();
    });

    this.elements.imageFileInput.addEventListener("change", () => {
      const file = this.elements.imageFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const displayW = Math.min(img.naturalWidth, 500);
          events.onInsertImage(dataUrl, img.naturalWidth, img.naturalHeight, displayW);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    // ── Image select + resize overlay ──
    this.elements.root.addEventListener("image-select", (e) => {
      const ce = e as CustomEvent;
      const { blockId } = ce.detail as {
        blockId: string;
      };
      events.onSelectImage(blockId);
    });
  }

  render(viewModel: EditorViewModel): void {
    this.viewport.render(viewModel.layout, viewModel.selection);
    this.elements.templateSelect.value = viewModel.templateId;
    this.elements.status.textContent = viewModel.status;
    this.elements.metrics.textContent = `Rev: ${viewModel.metrics.revision} | Pages: ${viewModel.metrics.pages}`;

    this.updateToolbar(viewModel.selectionState);
    this.updateImageOverlay(viewModel);
    this.updateTableToolbar(viewModel);
  }

  private updateTableToolbar(viewModel: EditorViewModel): void {
      if (!viewModel.activeTableId || !viewModel.selection) {
          if (this.tableToolbar) this.tableToolbar.hide();
          if (this.tableMoveHandle) this.tableMoveHandle.hide();
          return;
      }

      let currentCellFragment: LayoutFragment | null = null;
      let firstCellFragment: LayoutFragment | null = null;

      for (const page of viewModel.layout.pages) {
          if (!currentCellFragment) {
              currentCellFragment = page.fragments.find(f => f.blockId === viewModel.selection!.anchor.blockId) || null;
          }
          if (!firstCellFragment && viewModel.activeTableFirstCellId) {
              firstCellFragment = page.fragments.find(f => f.blockId === viewModel.activeTableFirstCellId) || null;
          }
          if (currentCellFragment && (firstCellFragment || !viewModel.activeTableFirstCellId)) break;
      }

      if (currentCellFragment) {
          const pageEl = this.elements.root.querySelector(
            `[data-page-id="${currentCellFragment.pageId}"]`,
          ) as HTMLElement | null;
          if (pageEl) {
            this.tableToolbar.show(viewModel.activeTableId, currentCellFragment, pageEl);
          } else {
            this.tableToolbar.hide();
          }
      } else {
          this.tableToolbar.hide();
      }

      if (firstCellFragment) {
          const pageEl = this.elements.root.querySelector(
            `[data-page-id="${firstCellFragment.pageId}"]`,
          ) as HTMLElement | null;
          if (pageEl) {
            this.tableMoveHandle.show(viewModel.activeTableId, firstCellFragment, pageEl);
          } else {
            this.tableMoveHandle.hide();
          }
      } else {
          this.tableMoveHandle.hide();
      }
  }

  private updateImageOverlay(viewModel: EditorViewModel): void {
    console.log("VIEW: updateImageOverlay", viewModel.selectedImageId);
    if (!viewModel.selectedImageId) {
      if (this.imageResizeOverlay) {
        console.log("VIEW: Detaching overlay (no selection)");
        this.imageResizeOverlay.detach();
        this.imageResizeOverlay = null;
      }
      return;
    }

    // Find the fragment for this image
    let imageFragment: LayoutFragment | null = null;
    for (const page of viewModel.layout.pages) {
      const found = page.fragments.find(
        (f) => f.kind === "image" && f.blockId === viewModel.selectedImageId,
      );
      if (found) {
        imageFragment = found;
        break;
      }
    }

    if (imageFragment) {
      const pageEl = this.elements.root.querySelector(
        `[data-page-id="${imageFragment.pageId}"]`,
      ) as HTMLElement | null;

      console.log("VIEW: Found image fragment on page", imageFragment.pageId, "pageEl exists?", !!pageEl);

      if (pageEl) {
        // Se o container mudou (ex: imagem mudou de página), precisamos recriar o overlay
        if (this.imageResizeOverlay && (this.imageResizeOverlay as any).container !== pageEl) {
          console.log("VIEW: Recreating overlay due to container change");
          this.imageResizeOverlay.detach();
          this.imageResizeOverlay = null;
        }

        if (!this.imageResizeOverlay) {
          console.log("VIEW: Creating new ImageResizeOverlay");
          this.imageResizeOverlay = this.deps.imageResizeOverlayFactory(
            pageEl,
            ({ blockId, width, height }) => {
              const ce = new CustomEvent("image-resize-request", {
                detail: { blockId, width, height },
              });
              this.elements.root.dispatchEvent(ce);
            },
          );
        }
        console.log("VIEW: Attaching overlay to fragment");
        this.imageResizeOverlay.attach(imageFragment);
      }
    } else {
      console.log("VIEW: Image fragment not found in layout!");
      if (this.imageResizeOverlay) {
        this.imageResizeOverlay.detach();
        this.imageResizeOverlay = null;
      }
    }
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
    this.elements.alignLeft.classList.toggle(
      "active",
      selectionState.align === "left",
    );
    this.elements.alignCenter.classList.toggle(
      "active",
      selectionState.align === "center",
    );
    this.elements.alignRight.classList.toggle(
      "active",
      selectionState.align === "right",
    );
    this.elements.alignJustify.classList.toggle(
      "active",
      selectionState.align === "justify",
    );

    if (this.colorPicker) {
      this.colorPicker.setCurrentColor(selectionState.color);
    }
  }
}


