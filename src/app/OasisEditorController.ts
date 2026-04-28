import { IDocumentRuntime } from "../core/runtime/IDocumentRuntime.js";
import { DocumentLayoutService } from "./services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "./OasisEditorView.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { TextMeasurementService } from "./services/TextMeasurementService.js";
import { DocumentImporter } from "../core/import/DocumentImporter.js";
import { DocumentExporter } from "../core/export/DocumentExporter.js";
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
import { IFontManager } from "../core/typography/FontManager.js";
import { CommandBus } from "./commands/CommandBus.js";
import * as Formatting from "./commands/FormattingCommands.js";
import * as Annotations from "./commands/AnnotationCommands.js";
import * as Navigation from "./commands/NavigationCommands.js";
import { ViewEventBindings } from "./events/ViewEventBindings.js";
import { Logger } from "../core/utils/Logger.js";

export interface ControllerDeps {
  runtime: IDocumentRuntime;
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
  formatPainter: FormatPainterController;
  cursorCalc: CursorPositionCalculator;
  mouseController: MouseController;
  zoneClick: ZoneClickController;
  wordSelection: WordSelectionController;
  importExport: ImportExportController;
  tableDrag: TableDragController;
  dropTargetService: DropTargetService;
  commandBus: CommandBus;
}

/**
 * OasisEditorController is the primary coordinator between the UI and Core.
 * Now a "Thin Controller" that delegates work to the CommandBus.
 */
export class OasisEditorController {
  private runtime: IDocumentRuntime;
  private layoutService: DocumentLayoutService;
  private presenter: OasisEditorPresenter;
  private view: OasisEditorView;
  private commandBus: CommandBus;
  private latestLayout: LayoutState | null = null;
  private windowListeners: Array<{ type: string; handler: EventListener }> = [];

  constructor(private deps: ControllerDeps) {
    this.runtime = deps.runtime;
    this.layoutService = deps.layoutService;
    this.presenter = deps.presenter;
    this.view = deps.view;
    this.commandBus = deps.commandBus;

    this.registerCommands();
    this.setupViewBindings();
    this.refresh();
  }

  execute(command: string, args?: any): void {
    this.commandBus.execute(command, args);
  }

  undo(): void { this.runtime.undo(); }
  redo(): void { this.runtime.redo(); }

  destroy(): void {
    for (const { type, handler } of this.windowListeners) {
      window.removeEventListener(type, handler);
    }
    this.view.destroy();
  }

  refresh(): void {
    const state = this.runtime.getState();
    Logger.debug("CTRL: refresh:start", {
      revision: state.document.revision,
      editingMode: state.editingMode,
      selection: state.selection,
      pendingMarks: state.pendingMarks ?? null,
    });
    const layout = this.layoutService.compose(state.document);
    this.latestLayout = layout;
    this.runtime.setLayout(layout);
    const viewModel = this.presenter.present({ state, layout });
    this.view.render(viewModel);
    Logger.debug("CTRL: refresh:end", {
      pages: layout.pages.length,
      editingMode: viewModel.editingMode,
      selection: viewModel.selection,
      selectedImageId: viewModel.selectedImageId,
      activeTableId: viewModel.activeTableId,
    });
  }

  private setupViewBindings(): void {
    const bindings: ViewEventBindings = {
      // Keyboard
      onTextInput: (text) => this.execute("insertText", text),
      onDelete: () => this.execute("deleteText"),
      onEnter: (isShift) => this.execute("enter", isShift),
      onEscape: () => this.execute("escape"),
      onArrowKey: (key) => this.execute("moveCaret", key),

      // Mouse
      onMouseDown: (e) => this.deps.mouseController.handleMouseDown(e),
      onMouseMove: (e) => this.deps.mouseController.handleMouseMove(e),
      onMouseUp: () => this.deps.mouseController.handleMouseUp(),
      onDblClick: (e) => this.deps.wordSelection.handleDblClick(e),
      onTripleClick: (e) => this.deps.wordSelection.handleTripleClick(e),

      // Formatting
      onFormatPainterToggle: () => this.deps.formatPainter.toggle(),
      onFormatPainterDoubleClick: () => this.deps.formatPainter.toggle(true),
      onBold: () => this.execute("bold"),
      onItalic: () => this.execute("italic"),
      onUnderline: () => this.execute("underline"),
      onStrikethrough: () => this.execute("strikethrough"),
      onSuperscript: () => this.execute("superscript"),
      onSubscript: () => this.execute("subscript"),
      onColorChange: (color) => this.execute("setColor", color),
      onHighlightColorChange: (color) => this.execute("setHighlight", color),
      onFontFamilyChange: (font) => this.execute("setFontFamily", font),
      onAlign: (align) => this.execute("setAlignment", align),
      onStyleChange: (style) => this.execute("setStyle", style),

      // Lists & Indent
      onToggleBullets: () => this.execute("toggleBullets"),
      onToggleNumberedList: () => this.execute("toggleNumberedList"),
      onDecreaseIndent: () => this.execute("decreaseIndent"),
      onIncreaseIndent: () => this.execute("increaseIndent"),

      // Command/Global
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onTemplateChange: (id) => this.execute("setTemplate", id),
      onPrint: () => window.print(),
      onToggleTrackChanges: () => this.execute("toggleTrackChanges"),

      // Image
      onInsertImage: (src, nw, nh, dw) => this.execute("insertImage", { src, nw, nh, dw }),
      onImportDocx: (file) => this.deps.importExport.importDocx(file),
      onResizeImage: (id, w, h) => this.execute("resizeImage", { id, w, h }),
      onSelectImage: (id) => this.execute("selectImage", id),
      onUpdateImageAlt: (id, alt) => this.execute("updateImageAlt", { id, alt }),

      // Table
      onInsertTable: (r, c) => this.execute("insertTable", { r, c }),
      onTableAction: (action, id) => this.execute("tableAction", { action, id }),
      onTableMove: (id, target, before) => this.execute("moveTable", { id, target, before }),
      onInsertRowAbove: () => this.execute("tableAction", { action: "insertRowAbove" }),
      onInsertRowBelow: () => this.execute("tableAction", { action: "insertRowBelow" }),
      onInsertColumnLeft: () => this.execute("tableAction", { action: "insertColumnLeft" }),
      onInsertColumnRight: () => this.execute("tableAction", { action: "insertColumnRight" }),
      onDeleteRow: () => this.execute("tableAction", { action: "deleteRow" }),
      onDeleteColumn: () => this.execute("tableAction", { action: "deleteColumn" }),
      onDeleteTable: () => this.execute("tableAction", { action: "deleteTable" }),
      onToggleTableHeaderRow: () => this.execute("tableAction", { action: "toggleHeaderRow" }),
      onToggleTableFirstColumn: () => this.execute("tableAction", { action: "toggleFirstColumn" }),
      onTableMoveStart: (e) => {
        // Find table ID from event or selection and start drag
        // This is a bit complex, for now let's assume we know which table
        this.deps.tableDrag.handleDragStart("table-1", e); 
      },
      onTableMoveEnd: (e) => this.deps.tableDrag.handleMouseUp(e),

      // Fields & Annotations
      onInsertPageNumber: () => this.execute("insertField", { type: "page" }),
      onInsertNumPages: () => this.execute("insertField", { type: "numpages" }),
      onInsertDate: () => this.execute("insertField", { type: "date" }),
      onInsertTime: () => this.execute("insertField", { type: "time" }),
      onInsertEquation: (latex, display) => this.execute("insertEquation", { latex, display }),
      onInsertBookmark: (name) => this.execute("insertBookmark", name),
      onInsertFootnote: () => this.execute("insertFootnote"),
      onInsertEndnote: () => this.execute("insertEndnote"),
      onInsertComment: (text) => this.execute("insertComment", text),
      onInsertLink: (url) => this.execute("insertLink", url),
      onRemoveLink: () => this.execute("removeLink"),
    };

    this.view.bind(bindings);
    this.runtime.subscribe(() => this.refresh());
  }

  private registerCommands(): void {
    // Formatting
    this.commandBus.register("bold", new Formatting.ToggleBoldCommand());
    this.commandBus.register("italic", new Formatting.ToggleItalicCommand());
    this.commandBus.register("underline", new Formatting.ToggleUnderlineCommand());
    this.commandBus.register("strikethrough", new Formatting.ToggleStrikethroughCommand());
    this.commandBus.register("superscript", new Formatting.ToggleSuperscriptCommand());
    this.commandBus.register("subscript", new Formatting.ToggleSubscriptCommand());
    this.commandBus.register("setColor", new Formatting.SetColorCommand());
    this.commandBus.register("setHighlight", new Formatting.SetHighlightCommand());
    this.commandBus.register("setFontFamily", new Formatting.SetFontFamilyCommand());
    this.commandBus.register("setAlignment", new Formatting.SetAlignmentCommand());
    this.commandBus.register("setStyle", new Formatting.SetStyleCommand());

    // Editing
    this.commandBus.register("insertText", new Formatting.InsertTextCommand());
    this.commandBus.register("deleteText", new Formatting.DeleteTextCommand());
    this.commandBus.register("enter", new Formatting.InsertParagraphCommand());
    this.commandBus.register("moveCaret", new Navigation.MoveCaretCommand());

    // Lists
    this.commandBus.register("toggleBullets", new Formatting.ToggleBulletsCommand());
    this.commandBus.register("toggleNumberedList", new Formatting.ToggleNumberedListCommand());
    this.commandBus.register("increaseIndent", new Formatting.IncreaseIndentCommand());
    this.commandBus.register("decreaseIndent", new Formatting.DecreaseIndentCommand());

    // History
    this.commandBus.register("undo", new Formatting.UndoCommand());
    this.commandBus.register("redo", new Formatting.RedoCommand());

    // Structure
    this.commandBus.register("setTemplate", new Formatting.SetTemplateCommand());
    this.commandBus.register("toggleTrackChanges", new Formatting.ToggleTrackChangesCommand());

    // Annotations
    this.commandBus.register("insertField", new Annotations.InsertFieldCommand());
    this.commandBus.register("insertEquation", new Annotations.InsertEquationCommand());
    this.commandBus.register("insertBookmark", new Annotations.InsertBookmarkCommand());
    this.commandBus.register("insertFootnote", new Annotations.InsertFootnoteCommand());
    this.commandBus.register("insertEndnote", new Annotations.InsertEndnoteCommand());
    this.commandBus.register("insertComment", new Annotations.InsertCommentCommand());
    this.commandBus.register("insertLink", new Formatting.InsertLinkCommand());
    this.commandBus.register("removeLink", new Formatting.RemoveLinkCommand());

    // Images & Tables
    this.commandBus.register("insertImage", new Formatting.InsertImageCommand());
    this.commandBus.register("resizeImage", new Formatting.ResizeImageCommand());
    this.commandBus.register("insertTable", new Formatting.InsertTableCommand());
    this.commandBus.register("tableAction", new Formatting.TableActionCommand());
  }
}
