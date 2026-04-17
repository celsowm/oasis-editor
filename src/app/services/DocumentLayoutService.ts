// @ts-nocheck








import { paginateDocument } from "../../core/pagination/PaginationEngine.js";

export class DocumentLayoutService {








  constructor(textMeasurementBridge) {
    this.textMeasurementBridge = textMeasurementBridge;
  }

  compose(documentModel) {
    return paginateDocument(documentModel, this.textMeasurementBridge);
  }
}
