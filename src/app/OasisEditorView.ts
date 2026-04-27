import { EditorViewModel, SelectionState } from "./presenters/OasisEditorPresenter.js";
import { setStore } from "../ui/EditorStore.js";
import { OasisEditorDom } from "./dom/OasisEditorDom.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { PageLayer } from "../ui/pages/PageLayer.tsx";
import { PageViewport } from "../ui/pages/PageViewport.js";
import { ImageResizeOverlay } from "../ui/selection/ImageResizeOverlay.js";
import {
  TableFloatingToolbar,
  TableToolbarEvents,
} from "../ui/selection/TableFloatingToolbar.tsx";
import {
  TableMoveHandle,
  MoveHandleEvents,
} from "../ui/selection/TableMoveHandle.js";
import { LayoutFragment } from "../core/layout/LayoutFragment.js";
import { h } from "../ui/utils/dom.js";
import {
  ColorPickerListener,
  TablePickerListener,
  ViewEventBindings,
} from "./events/ViewEventBindings.js";
import { ColorPicker } from "../ui/components/ColorPicker.tsx";
import { TablePicker } from "../ui/components/TablePicker.tsx";

import { DragStateService } from "./services/DragStateService.js";
import { Logger } from "../core/utils/Logger.js";

export interface ViewElements {
  root: HTMLElement;
  pagesContainer: HTMLElement;
  templateSelect: HTMLSelectElement;
  hiddenInput: HTMLInputElement;
  imageFileInput: HTMLInputElement;
  importDocxInput: HTMLInputElement;
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

export class OasisEditorView {
  private dom: OasisEditorDom;
  private presenter: OasisEditorPresenter;
  readonly elements: ViewElements;
  private pageLayer: PageLayer;
  private viewport: PageViewport;
  private colorPicker!: ColorPicker;
  private tablePicker!: TablePicker;
  private imageResizeOverlay: ImageResizeOverlay | null = null;
  private imageAltInput: HTMLElement | null = null;
  private tableToolbar!: TableFloatingToolbar;
  private tableMoveHandle!: TableMoveHandle;
  private events!: ViewEventBindings;
  private deps: ViewDeps;
  private dragState?: DragStateService;
  private isBound = false;
  private dropIndicator: HTMLElement | null = null;

  constructor(deps: ViewDeps) {
    this.deps = deps;
    this.dom = deps.dom;
    this.presenter = deps.presenter;
    this.elements = {
      root: this.dom.getRoot(),
      pagesContainer: this.dom.getPagesContainer(),
      templateSelect: this.dom.getTemplateSelect(),
      hiddenInput: this.dom.getHiddenInput(),
      imageFileInput: this.dom.getImageFileInput(),
      importDocxInput: this.dom.getImportDocxInput(),
    };

    this.pageLayer = new PageLayer(this.elements.pagesContainer);
    this.viewport = new PageViewport(
      this.elements.pagesContainer,
      this.pageLayer,
      this.deps.measurer,
    );

    this.tableToolbar = this.deps.tableToolbarFactory({
      onAddRowAbove: () => this.events.onInsertRowAbove(),
      onAddRowBelow: () => this.events.onInsertRowBelow(),
      onAddColumnLeft: () => this.events.onInsertColumnLeft(),
      onAddColumnRight: () => this.events.onInsertColumnRight(),
      onDeleteRow: () => this.events.onDeleteRow(),
      onDeleteColumn: () => this.events.onDeleteColumn(),
      onDeleteTable: () => this.events.onDeleteTable(),
    });

    this.tableMoveHandle = this.deps.tableMoveHandleFactory({
      onDragStart: (_blockId: string, e: MouseEvent) =>
        this.events.onTableMoveStart(e),
    });
  }

  setDragState(dragState: DragStateService): void {
    this.dragState = dragState;
  }

  showDropIndicator(target: {
    pageId: string;
    pageX: number;
    pageY: number;
    width: number;
    height: number;
    isBefore: boolean;
  }): void {
    if (!this.dropIndicator) {
      this.dropIndicator = document.createElement("div");
      this.dropIndicator.className = "oasis-drop-indicator";
    }

    const pageEl = this.elements.root.querySelector(
      `[data-page-id="${target.pageId}"]`,
    );
    if (!pageEl) return;

    if (this.dropIndicator.parentElement !== pageEl) {
      pageEl.appendChild(this.dropIndicator);
    }

    this.dropIndicator.style.display = "block";
    this.dropIndicator.style.left = `${target.pageX}px`;
    this.dropIndicator.style.width = `${target.width}px`;
    this.dropIndicator.style.top = `${target.isBefore ? target.pageY - 2 : target.pageY + target.height - 1}px`;
  }

  hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = "none";
    }
  }

  bind(events: ViewEventBindings): void {
    if (this.isBound) {
      this.events = events; // Allow updating handlers, but don't re-bind DOM
      setStore("events", events);
      return;
    }
    this.isBound = true;
    this.events = events;
    setStore("events", events);

    this.elements.templateSelect.addEventListener("change", (e) => {
      events.onTemplateChange((e.target as HTMLSelectElement).value);
    });

    // Hidden input for keyboard handling
    this.elements.hiddenInput.addEventListener("input", (e) => {
      const inputEvent = e as InputEvent;
      events.onTextInput(inputEvent.data ?? "");
      this.elements.hiddenInput.value = "";
    });

    this.elements.hiddenInput.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      
      // Strict check for ghost Enter keys after drop or during drag
      const isDragging = this.dragState?.isDragging;
      const lastDropTime = this.dragState?.lastDropTime || 0;
      const timeSinceDrop = Date.now() - lastDropTime;
      const justDropped = timeSinceDrop < 500;

      if (ke.key === "Enter") {
        if (isDragging || justDropped) {
          Logger.log("VIEW: Suppressed ghost Enter", { isDragging, justDropped, timeSinceDrop });
          ke.preventDefault();
          ke.stopImmediatePropagation();
          return;
        }
      }

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
        if (ke.key === "b") {
          events.onBold();
          ke.preventDefault();
        } else if (ke.key === "i") {
          events.onItalic();
          ke.preventDefault();
        } else if (ke.key === "u") {
          events.onUnderline();
          ke.preventDefault();
        } else if (ke.key === "z") {
          events.onUndo();
          ke.preventDefault();
        } else if (ke.key === "y") {
          events.onRedo();
          ke.preventDefault();
        }
      }
    });

    // Detecção de cliques múltiplos
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
    });

    this.elements.root.addEventListener("mousemove", (e) => {
      if (events.onMouseMove) events.onMouseMove(e as MouseEvent);
    });

    this.elements.root.addEventListener("mouseup", (e) => {
      if (events.onMouseUp) events.onMouseUp(e as MouseEvent);
    });

    // Image insertion via file picker
    this.elements.imageFileInput.addEventListener("change", () => {
      const file = this.elements.imageFileInput.files?.[0];
      if (!file) return;
      this.handleImageFile(file, events);
    });

    // Drag and Drop support
    window.addEventListener("dragenter", (e) => {
      e.preventDefault();
      this.dragState?.enter();
    });

    window.addEventListener("dragleave", (e) => {
      this.dragState?.leave();
      if (events.onDragLeave) events.onDragLeave(e as DragEvent);
    });

    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.dragState) this.dragState.isDragging = true;
      if (events.onDragOver) events.onDragOver(e as DragEvent);
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    });

    window.addEventListener("dragend", (e) => {
      this.dragState?.reset();
    });

    window.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dragState?.recordDrop();

      if (events.onDrop) events.onDrop(e as DragEvent);
      
      const dt = (e as DragEvent).dataTransfer;
      if (!dt) return;

      const file = Array.from(dt.files).find((f) => f.type.startsWith("image/"));
      if (file) {
        this.handleImageFile(file, events);
      }
    });

    this.elements.root.addEventListener("dragstart", (e) => {
        if (this.dragState) this.dragState.isDragging = true;
        const target = e.target as HTMLElement;
        const wrapper = target.closest(".oasis-image-wrapper");
        if (wrapper) {
            const blockId = wrapper.getAttribute("data-block-id");
            if (blockId && events.onImageDragStart) {
                events.onImageDragStart(blockId, e as DragEvent);
            }
        }
    });

    this.elements.importDocxInput.addEventListener("change", () => {
      const file = this.elements.importDocxInput.files?.[0];
      if (!file) return;
      events.onImportDocx(file);
    });

    this.elements.root.addEventListener("image-select", (e) => {
      const ce = e as CustomEvent;
      const { blockId } = ce.detail as { blockId: string };
      events.onSelectImage(blockId);
    });

    this.colorPicker = this.deps.colorPickerFactory(
      "oasis-editor-color-picker-container",
      {
        onColorSelected: (color: string) => events.onColorChange(color),
      },
    );

    this.tablePicker = this.deps.tablePickerFactory(
      "oasis-editor-insert-table",
      {
        onTableSelected: (rows: number, cols: number) =>
          events.onInsertTable(rows, cols),
      },
    );
  }

  render(viewModel: EditorViewModel): void {
    // Update SolidJS store for reactive UI (Toolbar, Status bar)
    setStore("view", viewModel);

    this.viewport.render(
      viewModel.layout,
      viewModel.selection,
      viewModel.editingMode,
    );

    this.updateImageOverlay(viewModel);
    this.updateTableToolbar(viewModel);
    this.updateEditingModeBanner(viewModel.editingMode);

    if (viewModel.selection) {
      // Use requestAnimationFrame to ensure focus happens after browser
      // finishes processing mouse events. In headless contexts, synchronous
      // focus during mousedown handling gets immediately canceled by the
      // browser's native focus management.
      requestAnimationFrame(() => {
        this.elements.hiddenInput.focus({ preventScroll: true });
        // Double-check: if focus was stolen again, try once more
        if (document.activeElement !== this.elements.hiddenInput) {
          requestAnimationFrame(() => {
            this.elements.hiddenInput.focus({ preventScroll: true });
          });
        }
      });
    }
  }

  private updateEditingModeBanner(
    mode: "main" | "header" | "footer" | "footnote",
  ): void {
    const existing = document.getElementById("oasis-editing-mode-banner");
    if (existing) existing.remove();

    if (mode === "main") return;

    const labelMap: Record<string, string> = {
      header: "Editing Header",
      footer: "Editing Footer",
      footnote: "Editing Footnote",
    };
    const label = labelMap[mode] ?? `Editing ${mode}`;
    const banner = h(
      "div",
      {
        id: "oasis-editing-mode-banner",
        style: {
          position: "fixed",
          top: "8px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#2563eb",
          color: "white",
          padding: "6px 16px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "500",
          zIndex: "3000",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        },
      },
      [
        label,
        h(
          "button",
          {
            style: {
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              padding: "2px 10px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "12px",
            },
            onClick: () => {
              if (this.events.onEscape) this.events.onEscape();
            },
          },
          "Back to Document",
        ),
      ],
    );

    document.body.appendChild(banner);
  }

  private updateTableToolbar(viewModel: EditorViewModel): void {
    if (!viewModel.activeTableId || !viewModel.selection) {
      this.tableToolbar.hide();
      this.tableMoveHandle.hide();
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
    if (!viewModel.selectedImageId) {
      if (this.imageResizeOverlay) {
        this.imageResizeOverlay.detach();
        this.imageResizeOverlay = null;
      }
      if (this.imageAltInput) {
        this.imageAltInput.remove();
        this.imageAltInput = null;
      }
      return;
    }

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

      if (pageEl) {
        if (
          this.imageResizeOverlay &&
          this.imageResizeOverlay.getContainer() !== pageEl
        ) {
          this.imageResizeOverlay.detach();
          this.imageResizeOverlay = null;
        }

        if (!this.imageResizeOverlay) {
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
        this.imageResizeOverlay.attach(imageFragment);
        this.renderImageAltInput(imageFragment, pageEl, viewModel);
      }
    } else {
      if (this.imageResizeOverlay) {
        this.imageResizeOverlay.detach();
        this.imageResizeOverlay = null;
      }
      if (this.imageAltInput) {
        this.imageAltInput.remove();
        this.imageAltInput = null;
      }
    }
  }

  private renderImageAltInput(
    fragment: LayoutFragment,
    pageEl: HTMLElement,
    viewModel: EditorViewModel,
  ): void {
    if (this.imageAltInput) this.imageAltInput.remove();

    const input = h("input", {
      type: "text",
      placeholder: "Alt text...",
      value: fragment.imageAlt || "",
      style: {
        position: "absolute",
        left: `${fragment.rect.x}px`,
        top: `${fragment.rect.y + fragment.rect.height + 4}px`,
        width: `${Math.max(120, fragment.rect.width)}px`,
        padding: "4px 8px",
        fontSize: "12px",
        border: "1px solid #cbd5e1",
        borderRadius: "4px",
        background: "white",
        zIndex: "1001",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const val = (e.target as HTMLInputElement).value;
          if (this.events.onUpdateImageAlt && viewModel.selectedImageId) {
            this.events.onUpdateImageAlt(viewModel.selectedImageId, val);
          }
          input.blur();
        }
      },
      onBlur: () => {
        setTimeout(() => {
          if (this.imageAltInput === input) {
            this.imageAltInput.remove();
            this.imageAltInput = null;
          }
        }, 200);
      },
    });

    pageEl.appendChild(input);
    input.focus();
    this.imageAltInput = input;
  }

  private handleImageFile(file: File, events: ViewEventBindings): void {
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
  }

  setFormatPainterActive(active: boolean, sticky: boolean = false): void {
      // Delegated to DOM directly for now
  }
}
