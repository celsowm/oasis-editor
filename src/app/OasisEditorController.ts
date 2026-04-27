import { Operations } from "../core/operations/OperationFactory.js";
import { Logger } from "../core/utils/Logger.js";
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
import { DragStateService } from "./services/DragStateService.js";
import { DropTargetService } from "./services/DropTargetService.js";
import { getAllBlocks } from "../core/document/BlockUtils.js";
import { isTextBlock } from "../core/document/BlockTypes.js";
import { IFontManager } from "../core/typography/FontManager.js";
import { FieldInstructions } from "../core/document/FieldUtils.js";
import { CommandBus } from "./commands/CommandBus.js";
import * as Formatting from "./commands/FormattingCommands.js";
import * as Annotations from "./commands/AnnotationCommands.js";
import * as Navigation from "./commands/NavigationCommands.js";

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
  fontManager: IFontManager;
  dragState: DragStateService;
}

export class OasisEditorController {
  private runtime: DocumentRuntime;
  private layoutService: DocumentLayoutService;
  private presenter: OasisEditorPresenter;
  private view: OasisEditorView;
  private fontManager: IFontManager;
  private latestLayout: LayoutState | null;
  private positionCalculator: PositionCalculator | null;
  private dragState: DragStateService;
  private dropTargetService: DropTargetService;

  private formatPainter: FormatPainterController;
  private mouseController: MouseController;
  private zoneClick: ZoneClickController;
  private wordSelection: WordSelectionController;
  private importExport: ImportExportController;
  private tableDrag: TableDragController;
  private cursorCalc: CursorPositionCalculator;
  private draggingBlockId: string | null = null;
  private commandBus: CommandBus;
  private domHitTester: DomHitTester;
  private windowListeners: Array<{ type: string; handler: EventListener }> = [];

  constructor(deps: ControllerDeps) {
    this.runtime = deps.runtime;
    this.layoutService = deps.layoutService;
    this.presenter = deps.presenter;
    this.view = deps.view;
    this.fontManager = deps.fontManager;
    this.domHitTester = deps.domHitTester;
    this.dragState = deps.dragState;
    this.dropTargetService = new DropTargetService(deps.domHitTester);
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

    this.commandBus = new CommandBus({
      runtime: this.runtime,
      presenter: this.presenter,
      view: this.view,
    });
    this.registerCommands();
  }

  private registerCommands(): void {
    this.commandBus.register("bold", new Formatting.ToggleBoldCommand());
    this.commandBus.register("italic", new Formatting.ToggleItalicCommand());
    this.commandBus.register("underline", new Formatting.ToggleUnderlineCommand());
    this.commandBus.register("undo", new Formatting.UndoCommand());
    this.commandBus.register("redo", new Formatting.RedoCommand());
    this.commandBus.register("insertText", new Formatting.InsertTextCommand());
    this.commandBus.register("align", new Formatting.SetAlignmentCommand());
    this.commandBus.register("style", new Formatting.SetStyleCommand());
    this.commandBus.register("bullets", new Formatting.ToggleBulletsCommand());
    this.commandBus.register("numberedList", new Formatting.ToggleNumberedListCommand());
    this.commandBus.register("indent", new Formatting.IndentCommand());
    
    this.commandBus.register("footnote", new Annotations.InsertFootnoteCommand());
    this.commandBus.register("endnote", new Annotations.InsertEndnoteCommand());
    this.commandBus.register("comment", new Annotations.InsertCommentCommand());
    this.commandBus.register("equation", new Annotations.InsertEquationCommand());
    this.commandBus.register("bookmark", new Annotations.InsertBookmarkCommand());
    this.commandBus.register("field", new Annotations.InsertFieldCommand());

    this.commandBus.register("escape", new Navigation.EscapeCommand());
    this.commandBus.register("moveCaret", new Navigation.MoveCaretCommand());
  }

  start(): void {
    this.refresh();
    this.view.bind({
      onFormatPainterToggle: () => this.toggleFormatPainter(),
      onFormatPainterDoubleClick: () => this.toggleFormatPainter(true),
      onBold: () => this.commandBus.execute("bold"),
      onItalic: () => this.commandBus.execute("italic"),
      onUnderline: () => this.commandBus.execute("underline"),
      onStrikethrough: () => this.runtime.dispatch(Operations.toggleMark("strike")),
      onSuperscript: () => this.toggleSuperscript(),
      onSubscript: () => this.toggleSubscript(),
      onInsertLink: (url) => this.runtime.dispatch(Operations.setMark("link", url)),
      onRemoveLink: () => this.runtime.dispatch(Operations.setMark("link", undefined)),
      onColorChange: (color) => this.runtime.dispatch(Operations.setMark("color", color)),
      onHighlightColorChange: (color) => this.runtime.dispatch(Operations.setMark("highlight", color || undefined)),
      onFontFamilyChange: (fontFamily) => this.runtime.dispatch(Operations.setMark("fontFamily", fontFamily)),
      onUndo: () => this.commandBus.execute("undo"),
      onRedo: () => this.commandBus.execute("redo"),
      onTemplateChange: (templateId) => this.setTemplate(templateId),
      onTextInput: (text) => {
        Logger.debug("CONTROLLER: onTextInput", { text });
        return this.commandBus.execute("insertText", text);
      },
      onDelete: () => this.runtime.dispatch(Operations.deleteText()),
      onEnter: (isShift) => {
        Logger.debug("CONTROLLER: onEnter", { isShift });
        return isShift ? this.commandBus.execute("insertText", "\n") : this.runtime.dispatch(Operations.insertParagraph());
      },
      onEscape: () => this.commandBus.execute("escape"),
      onArrowKey: (key) => this.commandBus.execute("moveCaret", key),
      onMouseDown: (e) => this.mouseController.handleMouseDown(e),
      onMouseMove: (e) => this.mouseController.handleMouseMove(e),
      onMouseUp: () => this.mouseController.handleMouseUp(),
      onDblClick: (e) => this.handleDblClick(e),
      onTripleClick: (e) => this.wordSelection.handleTripleClick(e),
      onAlign: (align) => this.commandBus.execute("align", align),
      onStyleChange: (styleId) => this.commandBus.execute("style", styleId),
      onToggleBullets: () => this.commandBus.execute("bullets"),
      onToggleNumberedList: () => this.commandBus.execute("numberedList"),
      onDecreaseIndent: () => this.commandBus.execute("indent", "decrease"),
      onIncreaseIndent: () => this.commandBus.execute("indent", "increase"),
      onInsertImage: (src, nw, nh, dw) => this.insertImage(src, nw, nh, dw),
      onImportDocx: (file) => this.importExport.importDocx(file),
      onExportDocx: () => this.importExport.exportDocx(),
      onExportPdf: () => this.importExport.exportPdf(this.latestLayout),
      onInsertPageBreak: () => this.runtime.dispatch(Operations.insertPageBreak()),
      onToggleTrackChanges: () => this.runtime.dispatch(Operations.toggleTrackChanges()),
      onResizeImage: (blockId, w, h) => this.resizeImage(blockId, w, h),
      onSelectImage: (blockId) => this.runtime.dispatch(Operations.selectImage(blockId)),
      onUpdateImageAlt: (blockId, alt) => this.updateImageAlt(blockId, alt),
      onDragOver: (e) => {
        e.preventDefault();
        if (this.dragState.shouldThrottleDragOver(Date.now())) return;

        const dropTarget = this.dropTargetService.findDropTarget(e, this.view.elements.pagesContainer);
        if (dropTarget) {
          this.view.showDropIndicator({
            pageId: dropTarget.pageId,
            pageX: dropTarget.pageX,
            pageY: dropTarget.pageY,
            width: dropTarget.rect.width,
            height: dropTarget.rect.height,
            isBefore: dropTarget.isBefore,
          });
        } else {
          this.view.hideDropIndicator();
        }
      },
      onDragLeave: () => {
        this.view.hideDropIndicator();
      },

      onDrop: (e) => {
        e.preventDefault();
        this.dragState.recordDrop();
        this.view.hideDropIndicator();

        if (this.draggingBlockId) {
          const dropTarget = this.dropTargetService.findDropTarget(e, this.view.elements.pagesContainer);
          Logger.debug("CONTROLLER: onDrop", {
            clientX: e.clientX,
            clientY: e.clientY,
            dropTarget,
          });
          if (dropTarget && dropTarget.blockId !== this.draggingBlockId) {
            this.runtime.dispatch(
              Operations.moveBlock(
                this.draggingBlockId,
                dropTarget.blockId,
                dropTarget.isBefore,
              ),
            );
          }
          this.draggingBlockId = null;
          return;
        }

        const pos = this.cursorCalc.calculateFromMouseEvent(e);
        Logger.debug("CONTROLLER: onDrop", {
          clientX: e.clientX,
          clientY: e.clientY,
          pos,
        });
        if (pos) {
          this.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
        }
      },

      onImageDragStart: (blockId, e) => {
        Logger.debug("CONTROLLER: onImageDragStart", { blockId });
        this.draggingBlockId = blockId;
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/oasis-block-id", blockId);
          e.dataTransfer.effectAllowed = "move";
        }
      },
      onInsertTable: (rows, cols) => this.runtime.dispatch(Operations.insertTable(rows, cols)),
      onInsertRowAbove: () => this.handleTableAction("addRowAbove", this.getActiveTableId() || ""),
      onInsertRowBelow: () => this.handleTableAction("addRowBelow", this.getActiveTableId() || ""),
      onInsertColumnLeft: () => this.handleTableAction("addColumnLeft", this.getActiveTableId() || ""),
      onInsertColumnRight: () => this.handleTableAction("addColumnRight", this.getActiveTableId() || ""),
      onDeleteRow: () => this.handleTableAction("deleteRow", this.getActiveTableId() || ""),
      onDeleteColumn: () => this.handleTableAction("deleteColumn", this.getActiveTableId() || ""),
      onDeleteTable: () => this.handleTableAction("deleteTable", this.getActiveTableId() || ""),
      onToggleTableHeaderRow: () => this.handleTableAction("toggleHeaderRow", this.getActiveTableId() || ""),
      onToggleTableFirstColumn: () => this.handleTableAction("toggleFirstColumn", this.getActiveTableId() || ""),
      onTableMoveStart: (e) => this.tableDrag.handleDragStart(this.getActiveTableId() || "", e),
      onTableMoveEnd: (e) => this.tableDrag.handleMouseUp(e),
      onInsertPageNumber: () => this.commandBus.execute("field", "page", FieldInstructions.PAGE),
      onInsertNumPages: () => this.commandBus.execute("field", "numpages", FieldInstructions.NUMPAGES),
      onInsertDate: () => this.commandBus.execute("field", "date", FieldInstructions.DATE),
      onInsertTime: () => this.commandBus.execute("field", "time", FieldInstructions.TIME),
      onInsertEquation: (latex, display) => this.commandBus.execute("equation", latex, display),
      onInsertBookmark: (name) => this.commandBus.execute("bookmark", name),
      onInsertFootnote: () => this.commandBus.execute("footnote"),
      onInsertEndnote: () => this.commandBus.execute("endnote"),
      onInsertComment: (text) => this.commandBus.execute("comment", text),
      onTableAction: (action, tableId) => this.handleTableAction(action, tableId),
      onTableMove: (tableId, targetBlockId, isBefore) => {
        this.runtime.dispatch(Operations.moveBlock(tableId, targetBlockId, isBefore));
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

    this.addWindowListener("mousemove", (e) => {
      if (this.tableDrag.isDraggingTable) this.tableDrag.handleDragging(e as MouseEvent);
    });

    this.addWindowListener("mouseup", (e) => {
      if (this.tableDrag.isDraggingTable) this.tableDrag.handleMouseUp(e as MouseEvent);
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
        const fnId = target.getAttribute("data-footnote-id");
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
        const fnId = fnEntry.getAttribute("data-footnote-id");
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
    this.runtime.dispatch(Operations.toggleMark("vertAlign", "superscript"));
  }

  toggleSubscript(): void {
    this.runtime.dispatch(Operations.toggleMark("vertAlign", "subscript"));
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

  setFontFamily(fontFamily: string): void {
    this.runtime.dispatch(Operations.setMark("fontFamily", fontFamily));
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
    Logger.debug("CONTROLLER: insertImage", { src: src.substring(0, 50) + "..." });
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
      case "insertRowAbove":
        this.runtime.dispatch(
          Operations.tableInsertRowAbove(tableId, selection.anchor.blockId),
        );
        break;
      case "insertRowBelow":
        this.runtime.dispatch(
          Operations.tableInsertRowBelow(tableId, selection.anchor.blockId),
        );
        break;
      case "insertColumnLeft":
        this.runtime.dispatch(
          Operations.tableInsertColumnLeft(tableId, selection.anchor.blockId),
        );
        break;
      case "insertColumnRight":
        this.runtime.dispatch(
          Operations.tableInsertColumnRight(tableId, selection.anchor.blockId),
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
      case "toggleHeaderRow":
        this.runtime.dispatch(Operations.tableToggleHeaderRow(tableId));
        break;
      case "toggleFirstColumn":
        this.runtime.dispatch(Operations.tableToggleFirstColumn(tableId));
        break;
    }
  }

  private getActiveTableId(): string | null {
    return this.presenter.present({
      state: this.runtime.getState(),
      layout: this.latestLayout!,
    }).activeTableId || null;
  }

  /**
   * Register a window event listener for automatic cleanup on destroy.
   */
  private addWindowListener(type: string, handler: EventListener): void {
    window.addEventListener(type, handler);
    this.windowListeners.push({ type, handler });
  }

  /**
   * Clean up all tracked listeners and destroy sub-components.
   */
  destroy(): void {
    for (const { type, handler } of this.windowListeners) {
      window.removeEventListener(type, handler);
    }
    this.windowListeners = [];
    this.view.destroy();
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
