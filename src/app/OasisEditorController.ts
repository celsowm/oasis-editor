import { Operations } from "../core/operations/OperationFactory.js";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { DocumentLayoutService } from "./services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "./OasisEditorView.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { PositionCalculator } from "./services/PositionCalculator.js";
import { TextMeasurementService } from "./services/TextMeasurementService.js";
import { DocumentImporter } from "../core/import/DocumentImporter.js";
import { DocumentExporter } from "../core/export/DocumentExporter.js";
import { PAGE_TEMPLATES } from "../core/pages/PageTemplateFactory.js";
import { FormatPainterController } from "./controllers/FormatPainterController.js";
import { CursorPositionCalculator } from "./services/CursorPositionCalculator.js";
import { TableDragController } from "./controllers/TableDragController.js";
import { MouseController } from "./controllers/MouseController.js";
import { ZoneClickController } from "./controllers/ZoneClickController.js";
import { WordSelectionController } from "./controllers/WordSelectionController.js";
import { ImportExportController } from "./controllers/ImportExportController.js";
import { DomHitTester } from "./services/DomHitTester.js";
import { getAllBlocks } from "../core/document/BlockUtils.js";
import { isTextBlock } from "../core/document/BlockTypes.js";

export interface ControllerDeps {
  runtime: DocumentRuntime;
  layoutService: DocumentLayoutService;
  presenter: OasisEditorPresenter;
  view: OasisEditorView;
  measurementService: TextMeasurementService;
  importer: DocumentImporter;
  exporter: DocumentExporter;
  pdfExporter: DocumentExporter;
  domHitTester: DomHitTester;
}

export class OasisEditorController {
  private runtime: DocumentRuntime;
  private layoutService: DocumentLayoutService;
  private presenter: OasisEditorPresenter;
  private view: OasisEditorView;
  private latestLayout: LayoutState | null;
  private positionCalculator: PositionCalculator | null;

  private formatPainter: FormatPainterController;
  private mouseController: MouseController;
  private zoneClick: ZoneClickController;
  private wordSelection: WordSelectionController;
  private importExport: ImportExportController;
  private tableDrag: TableDragController;
  private cursorCalc: CursorPositionCalculator;

  constructor(deps: ControllerDeps) {
    this.runtime = deps.runtime;
    this.layoutService = deps.layoutService;
    this.presenter = deps.presenter;
    this.view = deps.view;
    this.latestLayout = null;
    this.positionCalculator = null;

    this.formatPainter = new FormatPainterController(
      this.runtime,
      this.presenter,
      this.view,
      () => this.latestLayout!,
    );

    this.cursorCalc = new CursorPositionCalculator(
      deps.measurementService,
      () => this.latestLayout,
      () => getAllBlocks(this.runtime.getState().document),
      deps.domHitTester,
    );

    this.mouseController = new MouseController(
      this.runtime,
      this.cursorCalc,
      this.formatPainter,
    );

    this.zoneClick = new ZoneClickController(
      this.runtime,
      () => this.latestLayout,
      () => PAGE_TEMPLATES,
      deps.domHitTester,
    );

    this.wordSelection = new WordSelectionController(
      this.runtime,
      this.cursorCalc,
      () => this.positionCalculator,
      this.formatPainter,
    );

    this.importExport = new ImportExportController(
      this.runtime,
      deps.importer,
      deps.exporter,
      deps.pdfExporter,
    );

    this.tableDrag = new TableDragController(
      this.runtime,
      this.view,
      () => this.latestLayout,
      deps.domHitTester,
    );
  }

  start(): void {
    this.view.renderTemplateOptions(this.presenter.getTemplateOptions());
    this.view.bind({
      onFormatPainterToggle: () => this.toggleFormatPainter(),
      onFormatPainterDoubleClick: () => this.toggleFormatPainter(true),
      onBold: () => this.toggleBold(),
      onItalic: () => this.toggleItalic(),
      onUnderline: () => this.toggleUnderline(),
      onStrikethrough: () => this.toggleStrikethrough(),
      onInsertLink: (url) => this.insertLink(url),
      onRemoveLink: () => this.removeLink(),
      onColorChange: (color) => this.setColor(color),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onTemplateChange: (templateId) => this.setTemplate(templateId),
      onTextInput: (text) => this.insertText(text),
      onDelete: () => this.deleteText(),
      onEnter: (isShift) =>
        isShift ? this.insertText("\n") : this.insertParagraph(),
      onEscape: () => {
        const state = this.runtime.getState();
        if (state.editingMode !== "main") {
          this.runtime.dispatch(Operations.setEditingMode("main"));
          // Move selection back to first main content block
          const section = state.document.sections[0];
          const firstBlock = section?.children[0];
          if (firstBlock && isTextBlock(firstBlock)) {
            const pos = {
              sectionId: section.id,
              blockId: firstBlock.id,
              inlineId: firstBlock.children[0]?.id || "",
              offset: 0,
            };
            this.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
          }
        }
      },
      onArrowKey: (key) => this.moveCaret(key),
      onMouseDown: (e) => this.mouseController.handleMouseDown(e),
      onMouseMove: (e) => this.mouseController.handleMouseMove(e),
      onMouseUp: () => this.mouseController.handleMouseUp(),
      onDblClick: (e) => this.handleDblClick(e),
      onTripleClick: (e) => this.wordSelection.handleTripleClick(e),
      onAlign: (align) => this.setAlign(align),
      onToggleBullets: () => this.toggleBullets(),
      onToggleNumberedList: () => this.toggleNumberedList(),
      onDecreaseIndent: () => this.decreaseIndent(),
      onIncreaseIndent: () => this.increaseIndent(),
      onInsertImage: (src, nw, nh, dw) => this.insertImage(src, nw, nh, dw),
      onImportDocx: (file) => this.importExport.importDocx(file),
      onExportDocx: () => this.importExport.exportDocx(),
      onExportPdf: () => this.importExport.exportPdf(),
      onInsertPageBreak: () => this.insertPageBreak(),
      onResizeImage: (blockId, w, h) => this.resizeImage(blockId, w, h),
      onSelectImage: (blockId) => this.selectImage(blockId),
      onUpdateImageAlt: (blockId, alt) => this.updateImageAlt(blockId, alt),
      onInsertTable: (rows, cols) => this.insertTable(rows, cols),
      onTableAction: (action, tableId) =>
        this.handleTableAction(action, tableId),
      onTableMove: (tableId, targetBlockId, isBefore) => {
        this.runtime.dispatch(
          Operations.moveBlock(tableId, targetBlockId, isBefore),
        );
      },
      onPrint: () => window.print(),
    });

    this.view.elements.root.addEventListener(
      "table-drag-start",
      ((e: CustomEvent) => {
        this.tableDrag.handleDragStart(
          e.detail.tableId,
          e.detail.originalEvent,
        );
      }) as EventListener,
    );

    window.addEventListener("mousemove", (e) => {
      if (this.tableDrag.isDraggingTable) this.tableDrag.handleDragging(e);
    });

    window.addEventListener("mouseup", (e) => {
      if (this.tableDrag.isDraggingTable) this.tableDrag.handleMouseUp(e);
    });

    this.view.elements.root.addEventListener(
      "image-resize-request",
      ((e: CustomEvent) => {
        const { blockId, width, height } = e.detail;
        this.resizeImage(blockId, width, height);
      }) as EventListener,
    );

    this.runtime.subscribe(() => {
      this.refresh();
    });
  }

  private handleDblClick(event: MouseEvent): void {
    const handled = this.zoneClick.handleDblClick(event);
    if (!handled) {
      this.wordSelection.handleDblClick(event);
    }
  }

  toggleFormatPainter(isDoubleClick: boolean = false): void {
    this.formatPainter.toggle(isDoubleClick);
  }

  toggleBold(): void {
    this.runtime.dispatch(Operations.toggleMark("bold"));
  }

  toggleItalic(): void {
    this.runtime.dispatch(Operations.toggleMark("italic"));
  }

  toggleUnderline(): void {
    this.runtime.dispatch(Operations.toggleMark("underline"));
  }

  toggleStrikethrough(): void {
    this.runtime.dispatch(Operations.toggleMark("strike"));
  }

  insertLink(url: string): void {
    this.runtime.dispatch(Operations.setMark("link", url));
  }

  removeLink(): void {
    this.runtime.dispatch(Operations.setMark("link", undefined));
  }

  insertPageBreak(): void {
    this.runtime.dispatch(Operations.insertPageBreak());
  }

  setColor(color: string): void {
    this.runtime.dispatch(Operations.setMark("color", color));
  }

  undo(): void {
    this.runtime.undo();
  }

  redo(): void {
    this.runtime.redo();
  }

  insertText(text: string): void {
    if (!text) return;
    this.runtime.dispatch(Operations.insertText(text));
  }

  deleteText(): void {
    this.runtime.dispatch(Operations.deleteText());
  }

  insertParagraph(): void {
    this.runtime.dispatch(Operations.insertParagraph());
  }

  moveCaret(key: string): void {
    this.runtime.dispatch(Operations.moveSelection(key));
  }

  setTemplate(templateId: string): void {
    const firstSection = this.runtime.getState().document.sections[0];
    this.runtime.dispatch(
      Operations.setSectionTemplate(firstSection.id, templateId),
    );
  }

  setAlign(align: "left" | "center" | "right" | "justify"): void {
    this.runtime.dispatch(Operations.setAlignment(align));
  }

  toggleBullets(): void {
    this.runtime.dispatch(Operations.toggleUnorderedList());
  }

  toggleNumberedList(): void {
    this.runtime.dispatch(Operations.toggleOrderedList());
  }

  decreaseIndent(): void {
    this.runtime.dispatch(Operations.decreaseIndent());
  }

  increaseIndent(): void {
    this.runtime.dispatch(Operations.increaseIndent());
  }

  insertImage(
    src: string,
    naturalWidth: number,
    naturalHeight: number,
    displayWidth: number,
  ): void {
    this.runtime.dispatch(
      Operations.insertImage(src, naturalWidth, naturalHeight, displayWidth),
    );
  }

  resizeImage(blockId: string, width: number, height: number): void {
    this.runtime.dispatch(Operations.resizeImage(blockId, width, height));
  }

  selectImage(blockId: string): void {
    this.runtime.dispatch(Operations.selectImage(blockId));
  }

  updateImageAlt(blockId: string, alt: string): void {
    this.runtime.dispatch(Operations.updateImage(blockId, alt));
  }

  insertTable(rows: number, cols: number): void {
    this.runtime.dispatch(Operations.insertTable(rows, cols));
  }

  handleTableAction(action: string, tableId: string): void {
    const selection = this.runtime.getState().selection;
    if (!selection) return;

    switch (action) {
      case "addRowAbove":
        this.runtime.dispatch(
          Operations.tableAddRowAbove(tableId, selection.anchor.blockId),
        );
        break;
      case "addRowBelow":
        this.runtime.dispatch(
          Operations.tableAddRowBelow(tableId, selection.anchor.blockId),
        );
        break;
      case "addColumnLeft":
        this.runtime.dispatch(
          Operations.tableAddColumnLeft(tableId, selection.anchor.blockId),
        );
        break;
      case "addColumnRight":
        this.runtime.dispatch(
          Operations.tableAddColumnRight(tableId, selection.anchor.blockId),
        );
        break;
      case "deleteRow":
        this.runtime.dispatch(
          Operations.tableDeleteRow(tableId, selection.anchor.blockId),
        );
        break;
      case "deleteColumn":
        this.runtime.dispatch(
          Operations.tableDeleteColumn(tableId, selection.anchor.blockId),
        );
        break;
      case "deleteTable":
        this.runtime.dispatch(Operations.tableDelete(tableId));
        break;
      case "mergeCells":
        this.runtime.dispatch(Operations.tableMergeCells(tableId, selection.anchor.blockId, selection.focus.blockId));
        break;
      case "splitCell":
        this.runtime.dispatch(Operations.tableSplitCell(tableId, selection.anchor.blockId));
        break;
    }
  }

  refresh(): void {
    const state = this.runtime.getState();
    const layout = this.layoutService.compose(state.document);
    this.latestLayout = layout;
    this.positionCalculator = new PositionCalculator(layout);
    this.runtime.setLayout(layout);
    const viewModel = this.presenter.present({ state, layout });
    this.view.render(viewModel);
  }
}
