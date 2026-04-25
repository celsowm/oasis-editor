import { paginateDocument } from "../../core/pagination/PaginationEngine.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate } from "../../core/pages/PageTemplateTypes.js";

export class DocumentLayoutService {
  private textMeasurementBridge: TextMeasurer;
  private templates: Record<string, PageTemplate>;

  constructor(textMeasurementBridge: TextMeasurer, templates: Record<string, PageTemplate>) {
    this.textMeasurementBridge = textMeasurementBridge;
    this.templates = templates;
  }

  compose(documentModel: DocumentModel): LayoutState {
    return paginateDocument(documentModel, this.textMeasurementBridge, this.templates);
  }
}
