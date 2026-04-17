// @ts-nocheck








import { BrowserTextMeasurer } from "../../bridge/measurement/BrowserTextMeasurer.js";
import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { PAGE_TEMPLATES } from "../../core/pages/PageTemplateFactory.js";
import { DocumentLayoutService } from "../services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "../presenters/OasisEditorPresenter.js";
import { OasisEditorDom } from "../dom/OasisEditorDom.js";
import { OasisEditorView } from "../OasisEditorView.js";
import { OasisEditorController } from "../OasisEditorController.js";

export const createOasisEditorApp = () => {
  const runtime = new DocumentRuntime();
  const textMeasurer = new BrowserTextMeasurer();
  const layoutService = new DocumentLayoutService(textMeasurer);
  const presenter = new OasisEditorPresenter(Object.values(PAGE_TEMPLATES));
  const dom = new OasisEditorDom(document);
  const view = new OasisEditorView(dom, presenter, textMeasurer);

  return new OasisEditorController({
    runtime,
    layoutService,
    presenter,
    view,
    measurer: textMeasurer,
  });
};
