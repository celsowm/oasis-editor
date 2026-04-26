import { XMLBuilder } from "../XMLBuilder.js";
import { DocumentMetadata } from "../../../core/document/DocumentTypes.js";
import { W_NS, pxToTwip } from "./WmlConstants.js";

export class SectPrWriter {
  writeSectPr(
    b: XMLBuilder,
    section: any,
    metadata: DocumentMetadata,
    headerRelId?: string,
    footerRelId?: string,
  ): void {
    b.open(W_NS, "sectPr");

    // Page size
    const isLandscape = section.orientation === "landscape";
    const width = isLandscape ? 16838 : 11906;
    const height = isLandscape ? 11906 : 16838;
    b.selfClose(W_NS, "pgSz", { "w:w": width, "w:h": height, "w:orient": isLandscape ? "landscape" : "portrait" });

    // Margins
    const pxToTwipVal = (px: number) => Math.round((px / 96) * 1440);
    b.selfClose(W_NS, "pgMar", {
      "w:top": pxToTwipVal(section.margins.top),
      "w:right": pxToTwipVal(section.margins.right),
      "w:bottom": pxToTwipVal(section.margins.bottom),
      "w:left": pxToTwipVal(section.margins.left),
      "w:header": pxToTwipVal(section.margins.top * 0.5),
      "w:footer": pxToTwipVal(section.margins.bottom * 0.5),
      "w:gutter": 0,
    });

    if (headerRelId) {
      b.selfClose(W_NS, "headerReference", { "w:type": "default", "r:id": headerRelId });
    }
    if (footerRelId) {
      b.selfClose(W_NS, "footerReference", { "w:type": "default", "r:id": footerRelId });
    }

    b.selfClose(W_NS, "pgNumType");
    b.selfClose(W_NS, "docGrid", { "w:linePitch": 360 });

    b.close(W_NS, "sectPr");
  }
}
