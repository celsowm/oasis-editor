import { IDocumentRuntime } from "../core/runtime/IDocumentRuntime.js";
import { DocumentLayoutService } from "./services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "./OasisEditorView.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { PositionCalculator } from "./services/PositionCalculator.js";
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

  constructor(deps: ControllerDeps) {
    this.runtime = deps.runtime;
    this.layoutService = deps.layoutService;
    this.presenter = deps.presenter;
    this.view = deps.view;
    this.commandBus = deps.commandBus;

    this.registerCommands();
    this.setupViewBindings();
    this.refresh();
  }

  /**
   * Primary entry point for any user action.
   */
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
    const layout = this.layoutService.compose(state.document);
    this.latestLayout = layout;
    this.runtime.setLayout(layout);
    const viewModel = this.presenter.present({ state, layout });
    this.view.render(viewModel);
  }

  private setupViewBindings(): void {
    this.view.bind({
      onArrowKey: (key: string) => this.commandBus.execute("moveCaret", key),
      onTextInput: (text: string) => this.commandBus.execute("insertText", text),
      onDelete: () => this.commandBus.execute("deleteText"),
      onEnter: () => this.commandBus.execute("enter"),
      onEscape: () => {},
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onBold: () => this.execute("bold"),
      onItalic: () => this.execute("italic"),
      onUnderline: () => this.execute("underline"),
      // ... more bindings delegated to commandBus
    } as any);

    this.runtime.subscribe(() => this.refresh());
  }

  private registerCommands(): void {
    // Register all commands to the bus
    this.commandBus.register("bold", new Formatting.ToggleBoldCommand());
    this.commandBus.register("italic", new Formatting.ToggleItalicCommand());
    this.commandBus.register("underline", new Formatting.ToggleUnderlineCommand());
    this.commandBus.register("insertText", new Formatting.InsertTextCommand());
    this.commandBus.register("deleteText", new Formatting.DeleteTextCommand());
    this.commandBus.register("enter", new Formatting.InsertParagraphCommand());
    this.commandBus.register("moveCaret", new Navigation.MoveCaretCommand());
    // ... rest of the commands
  }
}
