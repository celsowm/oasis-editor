import { EditorViewModel } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorDom } from "./dom/OasisEditorDom.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { PageLayer } from "../ui/pages/PageLayer.js";
import { PageViewport } from "../ui/pages/PageViewport.js";
import {
  ColorPicker,
  ColorPickerListener,
} from "../ui/components/ColorPicker.js";
import {
  TablePicker,
  TablePickerListener,
} from "../ui/components/TablePicker.js";
import { ImageResizeOverlay } from "../ui/selection/ImageResizeOverlay.js";
import {
  TableFloatingToolbar,
  TableToolbarEvents,
} from "../ui/selection/TableFloatingToolbar.js";
import {
  TableMoveHandle,
  MoveHandleEvents,
} from "../ui/selection/TableMoveHandle.js";
import { LayoutFragment } from "../core/layout/LayoutFragment.js";
import { h, fragment } from "../ui/utils/dom.js";
export type {
  ViewEventBindings,
  KeyboardEvents,
  MouseEvents,
  FormattingEvents,
  CommandEvents,
  ListEvents,
  ImageEvents,
  TableEvents,
} from "./events/ViewEventBindings.js";
import { ViewEventBindings } from "./events/ViewEventBindings.js";

export interface ViewElements {
  root: HTMLElement;
  pagesContainer: HTMLElement;
  templateSelect: HTMLSelectElement;
  formatPainterButton: HTMLElement;
  boldButton: HTMLElement;
  italicButton: HTMLElement;
  underlineButton: HTMLElement;
  undoButton: HTMLElement;
  redoButton: HTMLElement;
  printButton: HTMLElement;
  status: HTMLElement;
  metrics: HTMLElement;
  hiddenInput: HTMLInputElement;
  alignLeft: HTMLElement;
  alignCenter: HTMLElement;
  alignRight: HTMLElement;
  alignJustify: HTMLElement;
  bulletsButton: HTMLElement;
  orderedListButton: HTMLElement;
  decreaseIndentButton: HTMLElement;
  increaseIndentButton: HTMLElement;
  colorPickerContainer: HTMLElement;
  insertImageButton: HTMLElement;
  imageFileInput: HTMLInputElement;
  insertTableButton: HTMLElement;
  menuFile: HTMLElement;
  menuEdit: HTMLElement;
  menuView: HTMLElement;
  menuInsert: HTMLElement;
  menuFormat: HTMLElement;
  menuTools: HTMLElement;
  menuExtensions: HTMLElement;
  menuHelp: HTMLElement;
  importDocxInput: HTMLInputElement;
  zoomSelect: HTMLSelectElement;
}

export interface SelectionState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: "left" | "center" | "right" | "justify";
  isListItem: boolean;
  isOrderedListItem: boolean;
}

export interface ViewDeps {
  dom: OasisEditorDom;
  presenter: OasisEditorPresenter;
  measurer: TextMeasurer;
  colorPickerFactory: (
    containerId: string,
    listener: ColorPickerListener,
  ) => ColorPicker;
  tablePickerFactory: (
    containerId: string,
    options: TablePickerListener,
  ) => TablePicker;
  tableToolbarFactory: (events: TableToolbarEvents) => TableFloatingToolbar;
  tableMoveHandleFactory: (events: MoveHandleEvents) => TableMoveHandle;
  imageResizeOverlayFactory: (
    container: HTMLElement,
    onResize: (data: {
      blockId: string;
      width: number;
      height: number;
    }) => void,
  ) => ImageResizeOverlay;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
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
  private activeMenu: HTMLElement | null = null;

  constructor(deps: ViewDeps) {
    this.deps = deps;
    this.dom = deps.dom;
    this.presenter = deps.presenter;
    this.elements = {
      root: this.dom.getRoot(),
      pagesContainer: this.dom.getPagesContainer(),
      templateSelect: this.dom.getTemplateSelect(),
      formatPainterButton: this.dom.getFormatPainterButton(),
      boldButton: this.dom.getBoldButton(),
      italicButton: this.dom.getItalicButton(),
      underlineButton: this.dom.getUnderlineButton(),
      undoButton: this.dom.getUndoButton(),
      redoButton: this.dom.getRedoButton(),
      printButton: this.dom.getPrintButton(),
      status: this.dom.getStatus(),
      metrics: this.dom.getMetrics(),
      hiddenInput: this.dom.getHiddenInput(),
      alignLeft: this.dom.getAlignLeftButton(),
      alignCenter: this.dom.getAlignCenterButton(),
      alignRight: this.dom.getAlignRightButton(),
      alignJustify: this.dom.getAlignJustifyButton(),
      bulletsButton: this.dom.getBulletsButton(),
      orderedListButton: this.dom.getOrderedListButton(),
      decreaseIndentButton: this.dom.getDecreaseIndentButton(),
      increaseIndentButton: this.dom.getIncreaseIndentButton(),
      colorPickerContainer: this.dom.getColorPickerContainer(),
      insertImageButton: this.dom.getInsertImageButton(),
      imageFileInput: this.dom.getImageFileInput(),
      insertTableButton: this.dom.getInsertTableButton(),
      menuFile: this.dom.getMenuFileElement(),
      menuEdit: this.dom.getMenuEditElement(),
      menuView: this.dom.getMenuViewElement(),
      menuInsert: this.dom.getMenuInsertElement(),
      menuFormat: this.dom.getMenuFormatElement(),
      menuTools: this.dom.getMenuToolsElement(),
      menuExtensions: this.dom.getMenuExtensionsElement(),
      menuHelp: this.dom.getMenuHelpElement(),
      importDocxInput: this.dom.getImportDocxInput(),
      zoomSelect: this.dom.getZoomSelect(),
    };

    this.pageLayer = new PageLayer(this.elements.pagesContainer);
    this.viewport = new PageViewport(
      this.elements.root,
      this.pageLayer,
      deps.measurer,
    );

    // Global click listener to close menus
    document.addEventListener("click", () => this.closeMenu());
  }

  renderTemplateOptions(options: { value: string; label: string }[]): void {
    this.elements.templateSelect.innerHTML = "";

    const frags = fragment(
        ...options.map(opt => h('option', { value: opt.value }, opt.label))
    );
    this.elements.templateSelect.appendChild(frags);
  }

  bind(events: ViewEventBindings): void {
    this.events = events;
    this.elements.formatPainterButton.addEventListener(
      "click",
      events.onFormatPainterToggle,
    );
    this.elements.formatPainterButton.addEventListener(
      "dblclick",
      events.onFormatPainterDoubleClick,
    );
    this.elements.boldButton.addEventListener("click", events.onBold);
    this.elements.italicButton.addEventListener("click", events.onItalic);
    this.elements.underlineButton.addEventListener("click", events.onUnderline);

    this.colorPicker = this.deps.colorPickerFactory(
      "oasis-editor-color-picker-container",
      {
        onColorSelected: (color) => events.onColorChange(color),
      },
    );

    this.tablePicker = this.deps.tablePickerFactory(
      "oasis-editor-insert-table",
      {
        onTableSelected: (rows: number, cols: number) =>
          events.onInsertTable(rows, cols),
      },
    );

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
        const ce = new CustomEvent("table-drag-start", {
          detail: { tableId: id, originalEvent: e },
        });
        this.elements.root.dispatchEvent(ce);
      },
    });

    this.elements.undoButton.addEventListener("click", events.onUndo);
    this.elements.redoButton.addEventListener("click", events.onRedo);
    this.elements.printButton.addEventListener("click", () => events.onPrint ? events.onPrint() : window.print());
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
    this.elements.bulletsButton.addEventListener("click", () =>
      events.onToggleBullets(),
    );
    this.elements.orderedListButton.addEventListener("click", () =>
      events.onToggleNumberedList(),
    );
    this.elements.decreaseIndentButton.addEventListener("click", () =>
      events.onDecreaseIndent(),
    );
    this.elements.increaseIndentButton.addEventListener("click", () =>
      events.onIncreaseIndent(),
    );

    // Zoom select
    this.elements.zoomSelect.addEventListener("change", (e) => {
      const zoom = (e.target as HTMLSelectElement).value;
      console.log("Zoom changed to:", zoom);
      // For now we don't have a specific event for zoom in bindings, but we could add it.
      // Or just apply CSS scale to pages container.
      if (zoom === "fit") {
        // Implement fit logic
      } else {
        const scale = parseInt(zoom) / 100;
        this.elements.pagesContainer.style.transform = `scale(${scale})`;
        this.elements.pagesContainer.style.transformOrigin = "top center";
      }
    });

    // Hidden input for keyboard handling
    this.elements.hiddenInput.addEventListener("input", (e) => {
      const inputEvent = e as InputEvent;
      events.onTextInput(inputEvent.data ?? "");
      this.elements.hiddenInput.value = "";
    });

    this.elements.hiddenInput.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Backspace") {
        events.onDelete();
        ke.preventDefault();
      } else if (ke.key === "Enter") {
        events.onEnter(ke.shiftKey);
        ke.preventDefault();
      } else if (ke.key === "Tab") {
        if (ke.shiftKey) {
          events.onDecreaseIndent();
        } else {
          events.onIncreaseIndent();
        }
        ke.preventDefault();
      } else if (ke.key === "Escape") {
        events.onEscape();
        ke.preventDefault();
      } else if (
        ke.key.startsWith("Arrow") ||
        ke.key === "Home" ||
        ke.key === "End"
      ) {
        events.onArrowKey(ke.key);
        ke.preventDefault();
      } else if (ke.ctrlKey || ke.metaKey) {
          if (ke.key === 'b') { events.onBold(); ke.preventDefault(); }
          else if (ke.key === 'i') { events.onItalic(); ke.preventDefault(); }
          else if (ke.key === 'u') { events.onUnderline(); ke.preventDefault(); }
          else if (ke.key === 'z') { events.onUndo(); ke.preventDefault(); }
          else if (ke.key === 'y') { events.onRedo(); ke.preventDefault(); }
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
          events.onInsertImage(
            dataUrl,
            img.naturalWidth,
            img.naturalHeight,
            displayW,
          );
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    // ── Menus ──
    this.setupMenus(events);

    this.elements.importDocxInput.addEventListener("change", () => {
      const file = this.elements.importDocxInput.files?.[0];
      if (!file) return;
      events.onImportDocx(file);
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

  private setupMenus(events: ViewEventBindings): void {
    // File Menu
    this.elements.menuFile.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(this.elements.menuFile, [
        { label: "New", action: () => console.log("New document") },
        { label: "Open", action: () => console.log("Open document") },
        { separator: true, label: "" },
        { label: "Import DOCX...", action: () => this.elements.importDocxInput.click() },
        { label: "Export DOCX...", action: () => events.onExportDocx?.() },
        { label: "Export PDF...", action: () => events.onExportPdf?.() },
        { label: "Download", action: () => console.log("Download") },
        { separator: true, label: "" },
        { label: "Print", shortcut: "Ctrl+P", action: () => events.onPrint ? events.onPrint() : window.print() },
      ]);
    });

    // Edit Menu
    this.elements.menuEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(this.elements.menuEdit, [
        { label: "Undo", shortcut: "Ctrl+Z", action: () => events.onUndo() },
        { label: "Redo", shortcut: "Ctrl+Y", action: () => events.onRedo() },
        { separator: true, label: "" },
        { label: "Cut", shortcut: "Ctrl+X", action: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "Ctrl+V", action: () => document.execCommand("paste") },
      ]);
    });

    // Insert Menu
    this.elements.menuInsert.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(this.elements.menuInsert, [
        { label: "Image", action: () => this.elements.insertImageButton.click() },
        { label: "Table", action: () => console.log("Open table picker") },
        { label: "Drawing", action: () => console.log("Insert drawing") },
        { label: "Horizontal line", action: () => console.log("Insert HR") },
      ]);
    });

    // Format Menu
    this.elements.menuFormat.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(this.elements.menuFormat, [
        { label: "Bold", shortcut: "Ctrl+B", action: () => events.onBold() },
        { label: "Italic", shortcut: "Ctrl+I", action: () => events.onItalic() },
        { label: "Underline", shortcut: "Ctrl+U", action: () => events.onUnderline() },
        { separator: true, label: "" },
        { label: "Align Left", action: () => events.onAlign("left") },
        { label: "Align Center", action: () => events.onAlign("center") },
        { label: "Align Right", action: () => events.onAlign("right") },
        { label: "Justify", action: () => events.onAlign("justify") },
        { separator: true, label: "" },
        { label: "Clear formatting", action: () => console.log("Clear formatting") },
      ]);
    });

    // Help Menu
    this.elements.menuHelp.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu(this.elements.menuHelp, [
        { label: "Help Center", action: () => window.open("https://github.com", "_blank") },
        { label: "Keyboard shortcuts", action: () => console.log("Show shortcuts") },
        { separator: true, label: "" },
        { label: "About Oasis Editor", action: () => alert("Oasis Editor v1.0.0") },
      ]);
    });

    // Other menus just as placeholders
    [this.elements.menuView, this.elements.menuTools, this.elements.menuExtensions].forEach(menu => {
        menu.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleMenu(menu, [
                { label: "Placeholder Item", action: () => console.log("Placeholder") }
            ]);
        });
    });
  }

  private toggleMenu(anchor: HTMLElement, items: MenuItem[]): void {
    if (this.activeMenu) {
      const wasThisAnchor = this.activeMenu.dataset.anchorId === anchor.id;
      this.closeMenu();
      if (wasThisAnchor) return;
    }

    const rect = anchor.getBoundingClientRect();
    
    const dropdown = h('div', {
        className: 'oasis-dropdown-menu show',
        dataset: { anchorId: anchor.id },
        style: {
            left: `${rect.left}px`,
            top: `${rect.bottom}px`
        }
    }, items.map(item => {
        if (item.separator) {
            return h('div', { className: 'oasis-dropdown-separator' });
        }

        return h('div', {
            className: 'oasis-dropdown-item',
            onClick: (e: MouseEvent) => {
                e.stopPropagation();
                this.closeMenu();
                if (item.action) item.action();
            }
        }, [
            h('span', {}, item.label),
            item.shortcut ? h('span', { className: 'shortcut' }, item.shortcut) : null
        ]);
    }));

    document.body.appendChild(dropdown);
    this.activeMenu = dropdown;
    anchor.classList.add("active");
  }

  private closeMenu(): void {
    if (this.activeMenu) {
      const anchorId = this.activeMenu.dataset.anchorId;
      if (anchorId) {
        const anchor = document.getElementById(anchorId);
        if (anchor) anchor.classList.remove("active");
      }
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }

  setFormatPainterActive(active: boolean, sticky: boolean = false): void {
    if (active) {
      this.elements.formatPainterButton.classList.add("active");
      if (sticky) {
        this.elements.formatPainterButton.classList.add("sticky");
      } else {
        this.elements.formatPainterButton.classList.remove("sticky");
      }
    } else {
      this.elements.formatPainterButton.classList.remove("active");
      this.elements.formatPainterButton.classList.remove("sticky");
    }
  }

  render(viewModel: EditorViewModel): void {
    this.viewport.render(
      viewModel.layout,
      viewModel.selection,
      viewModel.editingMode,
    );
    this.elements.templateSelect.value = viewModel.templateId;
    this.elements.status.textContent = viewModel.status;
    this.elements.metrics.textContent = `Rev: ${viewModel.metrics.revision} | Pages: ${viewModel.metrics.pages}`;

    this.updateToolbar(viewModel.selectionState);
    this.updateImageOverlay(viewModel);
    this.updateTableToolbar(viewModel);

    // Ensure hiddenInput is always focused after render to maintain keyboard input
    if (viewModel.selection) {
      this.elements.hiddenInput.focus({ preventScroll: true });
    }
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
        currentCellFragment =
          page.fragments.find(
            (f) => f.blockId === viewModel.selection!.anchor.blockId,
          ) || null;
      }
      if (!firstCellFragment && viewModel.activeTableFirstCellId) {
        firstCellFragment =
          page.fragments.find(
            (f) => f.blockId === viewModel.activeTableFirstCellId,
          ) || null;
      }
      if (
        currentCellFragment &&
        (firstCellFragment || !viewModel.activeTableFirstCellId)
      )
        break;
    }

    if (currentCellFragment) {
      const pageEl = this.elements.root.querySelector(
        `[data-page-id="${currentCellFragment.pageId}"]`,
      ) as HTMLElement | null;
      if (pageEl) {
        this.tableToolbar.show(
          viewModel.activeTableId,
          currentCellFragment,
          pageEl,
        );
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
        this.tableMoveHandle.show(
          viewModel.activeTableId,
          firstCellFragment,
          pageEl,
        );
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

      console.log(
        "VIEW: Found image fragment on page",
        imageFragment.pageId,
        "pageEl exists?",
        !!pageEl,
      );

      if (pageEl) {
        // Se o container mudou (ex: imagem mudou de página), precisamos recriar o overlay
        if (
          this.imageResizeOverlay &&
          this.imageResizeOverlay.getContainer() !== pageEl
        ) {
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
    this.elements.bulletsButton.classList.toggle(
      "active",
      selectionState.isListItem,
    );
    this.elements.orderedListButton.classList.toggle(
      "active",
      selectionState.isOrderedListItem,
    );

    if (this.colorPicker) {
      this.colorPicker.setCurrentColor(selectionState.color);
    }
  }
}
