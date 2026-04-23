import { BrowserTextMeasurer } from "../../bridge/measurement/BrowserTextMeasurer.js";
import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { PAGE_TEMPLATES } from "../../core/pages/PageTemplateFactory.js";
import { DocumentLayoutService } from "../services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "../presenters/OasisEditorPresenter.js";
import { OasisEditorDom } from "../dom/OasisEditorDom.js";
import { OasisEditorView } from "../OasisEditorView.js";
import { OasisEditorController } from "../OasisEditorController.js";
import { TextMeasurementService } from "../services/TextMeasurementService.js";
import { ColorPicker } from "../../ui/components/ColorPicker.js";
import { TablePicker } from "../../ui/components/TablePicker.js";
import { TableFloatingToolbar } from "../../ui/selection/TableFloatingToolbar.js";
import { TableMoveHandle } from "../../ui/selection/TableMoveHandle.js";
import { ImageResizeOverlay } from "../../ui/selection/ImageResizeOverlay.js";

export const createOasisEditorApp = (): OasisEditorController => {
  const runtime = new DocumentRuntime();
  const textMeasurer = new BrowserTextMeasurer();
  const measurementService = new TextMeasurementService(textMeasurer);
  const layoutService = new DocumentLayoutService(textMeasurer);
  const presenter = new OasisEditorPresenter(Object.values(PAGE_TEMPLATES));
  const dom = new OasisEditorDom(document);
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

  return new OasisEditorController({
    runtime,
    layoutService,
    presenter,
    view,
    measurementService,
  });
};
