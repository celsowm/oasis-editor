import { render } from "solid-js/web";
import OasisEditor from "../../ui/OasisEditor.tsx";
import { BrowserTextMeasurer } from "../../bridge/measurement/BrowserTextMeasurer.js";
import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { PAGE_TEMPLATES } from "../../core/pages/PageTemplateFactory.js";
import { DocumentLayoutService } from "../services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "../presenters/OasisEditorPresenter.js";
import { OasisEditorDom } from "../dom/OasisEditorDom.js";
import { OasisEditorView } from "../OasisEditorView.js";
import { OasisEditorController } from "../OasisEditorController.js";
import { TextMeasurementService } from "../services/TextMeasurementService.js";
import { BrowserDomHitTester } from "../services/DomHitTester.js";
import { DragStateService } from "../services/DragStateService.js";
import { TableFloatingToolbar } from "../../ui/selection/TableFloatingToolbar.tsx";
import { TableMoveHandle } from "../../ui/selection/TableMoveHandle.js";
import { ImageResizeOverlay } from "../../ui/selection/ImageResizeOverlay.js";
import { DocxImporter } from "../../engine/import/DocxImporter.js";
import { DocxExporter } from "../../engine/export/DocxExporter.js";
import { PdfExporter } from "../../engine/export/PdfExporter.js";
import { DefaultFontManager } from "../../core/typography/FontManager.js";
import { FormatPainterController } from "../controllers/FormatPainterController.js";
import { CursorPositionCalculator } from "../services/CursorPositionCalculator.js";
import { MouseController } from "../controllers/MouseController.js";
import { ZoneClickController } from "../controllers/ZoneClickController.js";
import { WordSelectionController } from "../controllers/WordSelectionController.js";
import { ImportExportController } from "../controllers/ImportExportController.js";
import { TableDragController } from "../controllers/TableDragController.js";
import { DropTargetService } from "../services/DropTargetService.js";
import { CommandBus } from "../commands/CommandBus.js";
import { getAllBlocks } from "../../core/document/BlockUtils.js";

export interface OasisEditorInstance {
  controller: OasisEditorController;
  shell: HTMLElement;
  dispose: () => void;
}

import { registerAllBehaviors } from "../../core/document/behaviors/index.js";

import { I18nService } from "../../core/utils/I18nService.js";

// Initialize block behaviors registry
registerAllBehaviors();

export function createOasisEditor(container: HTMLElement): OasisEditorInstance {
  const i18n = new I18nService();
  const disposeSolid = render(() => <OasisEditor i18n={i18n} />, container);
  const shell = container.querySelector<HTMLElement>(".oasis-editor-shell");
  if (!shell) {
    throw new Error("OasisEditor: failed to find mounted editor shell");
  }

  const runtime = new DocumentRuntime();
  const textMeasurer = new BrowserTextMeasurer();
  const fontManager = new DefaultFontManager();
  const measurementService = new TextMeasurementService(textMeasurer);
  const layoutService = new DocumentLayoutService(
    textMeasurer,
    PAGE_TEMPLATES,
    fontManager,
  );
  const presenter = new OasisEditorPresenter(Object.values(PAGE_TEMPLATES));
  const dom = new OasisEditorDom(shell);
  const view = new OasisEditorView({
    dom,
    presenter,
    measurer: textMeasurer,
    tableToolbarFactory: (events) => new TableFloatingToolbar(events),
    tableMoveHandleFactory: (events) => new TableMoveHandle(events),
    imageResizeOverlayFactory: (container, onResize) =>
      new ImageResizeOverlay(container, onResize),
  });

  const importer = new DocxImporter();
  const exporter = new DocxExporter(fontManager);
  const pdfExporter = new PdfExporter(fontManager);
  const domHitTester = new BrowserDomHitTester();
  const dragState = new DragStateService();

  // Instantiate sub-controllers for injection
  const formatPainter = new FormatPainterController(
    runtime,
    presenter,
    view,
    () => runtime.getLayout()!,
  );

  const cursorCalc = new CursorPositionCalculator(
    measurementService,
    () => runtime.getLayout()!,
    () => getAllBlocks(runtime.getState().document),
    domHitTester,
  );

  const mouseController = new MouseController(
    runtime,
    cursorCalc,
    formatPainter,
  );

  const zoneClick = new ZoneClickController(
    runtime,
    () => runtime.getLayout()!,
    () => PAGE_TEMPLATES,
    domHitTester,
  );

  const wordSelection = new WordSelectionController(
    runtime,
    cursorCalc,
    () => null, // This will be set by controller later if needed, or we can improve this factory
    formatPainter,
  );

  const importExport = new ImportExportController(
    runtime,
    importer,
    exporter,
    pdfExporter,
  );

  const tableDrag = new TableDragController(
    runtime,
    view,
    () => runtime.getLayout()!,
    domHitTester,
  );

  const dropTargetService = new DropTargetService(domHitTester);

  const commandBus = new CommandBus({
    runtime,
    presenter,
    view,
  });

  const controller = new OasisEditorController({
    runtime,
    layoutService,
    presenter,
    view,
    measurementService,
    importer,
    exporter,
    pdfExporter,
    domHitTester,
    fontManager,
    dragState,
    formatPainter,
    cursorCalc,
    mouseController,
    zoneClick,
    wordSelection,
    importExport,
    tableDrag,
    dropTargetService,
    commandBus,
  });

  view.setDragState(dragState);

  function dispose(): void {
    disposeSolid();
    shell?.remove();
  }

  return { controller, shell, dispose };
}
