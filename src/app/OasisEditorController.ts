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
      onSuperscript: () => this.toggleSuperscript(),
      onSubscript: () => this.toggleSubscript(),
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
        if (state.editingMode === "footnote") {
          // Exit footnote mode, return cursor to the footnote reference in body
          this.runtime.dispatch(Operations.setEditingMode("main"));
          // Try to find the footnote reference in body text
          const fnId = state.editingFootnoteId;
          if (fnId) {
            for (const section of state.document.sections) {
              for (const block of section.children) {
                if (!isTextBlock(block)) continue;
                for (const run of block.children) {
                  if (run.footnoteId === fnId) {
                    const pos = {
                      sectionId: section.id,
                      blockId: block.id,
                      inlineId: run.id,
                      offset: 0,
                    };
                    this.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
                    return;
                  }
                }
              }
            }
          }
        }
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
      onStyleChange: (styleId) => this.setStyle(styleId),
      onToggleBullets: () => this.toggleBullets(),
      onToggleNumberedList: () => this.toggleNumberedList(),
      onDecreaseIndent: () => this.decreaseIndent(),
      onIncreaseIndent: () => this.increaseIndent(),
      onInsertImage: (src, nw, nh, dw) => this.insertImage(src, nw, nh, dw),
      onImportDocx: (file) => this.importExport.importDocx(file),
      onExportDocx: () => this.importExport.exportDocx(),
      onExportPdf: () => this.importExport.exportPdf(),
      onInsertPageBreak: () => this.insertPageBreak(),
      onToggleTrackChanges: () => this.toggleTrackChanges(),
      onResizeImage: (blockId, w, h) => this.resizeImage(blockId, w, h),
      onSelectImage: (blockId) => this.selectImage(blockId),
      onUpdateImageAlt: (blockId, alt) => this.updateImageAlt(blockId, alt),
      onInsertTable: (rows, cols) => this.insertTable(rows, cols),
      onInsertPageNumber: () => this.insertField("page", "PAGE \\* MERGEFORMAT"),
      onInsertNumPages: () => this.insertField("numpages", "NUMPAGES \\* MERGEFORMAT"),
      onInsertDate: () => this.insertField("date", "DATE \\@ \"dd/MM/yyyy\""),
      onInsertTime: () => this.insertField("time", "TIME \\@ \"HH:mm\""),
      onInsertEquation: (latex, display) => this.insertEquation(latex, display),
      onInsertBookmark: (name) => this.insertBookmark(name),
      onInsertFootnote: () => this.insertFootnote(),
      onInsertEndnote: () => this.insertEndnote(),
      onInsertComment: (text) => this.insertComment(text),
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

    // Handle clicks on inline footnote markers
    this.view.elements.root.addEventListener("click", ((e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(".oasis-footnote-ref") as HTMLElement | null;
      if (target) {
        const fnId = target.dataset.footnoteId;
        if (fnId) {
          e.preventDefault();
          e.stopPropagation();
          this.enterFootnote(fnId);
        }
        return;
      }

      // Handle clicks on footnote entry text (stay in footnote mode)
      const fnEntry = (e.target as HTMLElement)?.closest?.(".oasis-footnote-entry") as HTMLElement | null;
      if (fnEntry) {
        const fnId = fnEntry.dataset.footnoteId;
        if (fnId) {
          const state = this.runtime.getState();
          if (state.editingMode !== "footnote" || state.editingFootnoteId !== fnId) {
            e.preventDefault();
            e.stopPropagation();
            this.enterFootnote(fnId);
          }
        }
      }
    }) as EventListener);

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

  toggleSuperscript(): void {
    const state = this.runtime.getState();
    const current = state.pendingMarks?.vertAlign;
    const next = current === "superscript" ? undefined : "superscript";
    this.runtime.dispatch(Operations.setMark("vertAlign", next));
  }

  toggleSubscript(): void {
    const state = this.runtime.getState();
    const current = state.pendingMarks?.vertAlign;
    const next = current === "subscript" ? undefined : "subscript";
    this.runtime.dispatch(Operations.setMark("vertAlign", next));
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

  setStyle(styleId: string): void {
    this.runtime.dispatch(Operations.setStyle(styleId));
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

  insertField(type: "page" | "numpages" | "date" | "time", instruction: string): void {
    this.runtime.dispatch(
      Operations.insertField({ type, instruction }),
    );
  }

  insertEquation(latex: string, display: boolean): void {
    this.runtime.dispatch(Operations.insertEquation(latex, display));
  }

  insertBookmark(name: string): void {
    this.runtime.dispatch(Operations.insertBookmark(name));
  }

  insertFootnote(): void {
    this.runtime.dispatch(Operations.insertFootnote());
    // Auto-switch to footnote editing mode and place cursor
    const state = this.runtime.getState();
    const fnId = state.editingFootnoteId;
    if (fnId) {
      const fn = state.document.footnotes?.find((f) => f.id === fnId);
      const firstBlock = fn?.blocks[0];
      if (firstBlock && isTextBlock(firstBlock)) {
        const pos = {
          sectionId: "footnote",
          blockId: firstBlock.id,
          inlineId: firstBlock.children[0]?.id || "",
          offset: 0,
        };
        this.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
      }
    }
  }

  enterFootnote(footnoteId: string): void {
    const state = this.runtime.getState();
    const fn = state.document.footnotes?.find((f) => f.id === footnoteId);
    if (!fn) return;
    const firstBlock = fn.blocks[0];
    if (!firstBlock || !isTextBlock(firstBlock)) return;

    this.runtime.dispatch(Operations.setEditingMode("footnote", footnoteId));
    const pos = {
      sectionId: "footnote",
      blockId: firstBlock.id,
      inlineId: firstBlock.children[0]?.id || "",
      offset: 0,
    };
    this.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
  }

  insertEndnote(): void {
    this.runtime.dispatch(Operations.insertEndnote());
  }

  insertComment(text: string): void {
    this.runtime.dispatch(Operations.insertComment(text));
  }

  toggleTrackChanges(): void {
    this.runtime.dispatch(Operations.toggleTrackChanges());
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
