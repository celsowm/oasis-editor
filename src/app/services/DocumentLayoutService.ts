import { paginateDocument } from "../../core/pagination/PaginationEngine.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";

export class DocumentLayoutService {
  private textMeasurementBridge: TextMeasurer;

  constructor(textMeasurementBridge: TextMeasurer) {
    this.textMeasurementBridge = textMeasurementBridge;
  }

  compose(documentModel: DocumentModel): LayoutState {
    return paginateDocument(documentModel, this.textMeasurementBridge);
  }
}
