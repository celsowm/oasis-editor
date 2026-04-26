import { paginateDocument } from "../../core/pagination/PaginationEngine.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { PageTemplate } from "../../core/pages/PageTemplateTypes.js";
import { IFontManager } from "../../core/typography/FontManager.js";

export class DocumentLayoutService {
  private textMeasurementBridge: TextMeasurer;
  private templates: Record<string, PageTemplate>;
  private fontManager: IFontManager;

  constructor(
    textMeasurementBridge: TextMeasurer,
    templates: Record<string, PageTemplate>,
    fontManager: IFontManager,
  ) {
    this.textMeasurementBridge = textMeasurementBridge;
    this.templates = templates;
    this.fontManager = fontManager;
  }

  compose(documentModel: DocumentModel): LayoutState {
    return paginateDocument(
      documentModel,
      this.textMeasurementBridge,
      this.templates,
      this.fontManager,
    );
  }
}
