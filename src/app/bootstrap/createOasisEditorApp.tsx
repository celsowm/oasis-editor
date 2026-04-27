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
import { ColorPicker } from "../../ui/components/ColorPicker.tsx";
import { TablePicker } from "../../ui/components/TablePicker.tsx";
import { TableFloatingToolbar } from "../../ui/selection/TableFloatingToolbar.tsx";
import { TableMoveHandle } from "../../ui/selection/TableMoveHandle.js";
import { ImageResizeOverlay } from "../../ui/selection/ImageResizeOverlay.js";
import { DocxImporter } from "../../engine/import/DocxImporter.js";
import { DocxExporter } from "../../engine/export/DocxExporter.js";
import { PdfExporter } from "../../engine/export/PdfExporter.js";
import { DefaultFontManager } from "../../core/typography/FontManager.js";

export interface OasisEditorInstance {
  controller: OasisEditorController;
  shell: HTMLElement;
  dispose: () => void;
}

export function createOasisEditor(container: HTMLElement): OasisEditorInstance {
  const disposeSolid = render(() => <OasisEditor />, container);
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
    colorPickerFactory: (id, listener) => new ColorPicker(id, listener),
    tablePickerFactory: (id, options) => new TablePicker(id, options),
    tableToolbarFactory: (events) => new TableFloatingToolbar(events),
    tableMoveHandleFactory: (events) => new TableMoveHandle(events),
    imageResizeOverlayFactory: (container, onResize) =>
      new ImageResizeOverlay(container, onResize),
  });

  // Focus hidden input on startup so arrow keys work immediately
  view.elements.hiddenInput.focus();

  const importer = new DocxImporter();
  const exporter = new DocxExporter(fontManager);
  const pdfExporter = new PdfExporter(fontManager);
  const domHitTester = new BrowserDomHitTester();
  const dragState = new DragStateService();

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
  });

  view.setDragState(dragState);

  function dispose(): void {
    disposeSolid();
    shell?.remove();
  }

  return { controller, shell, dispose };
}
