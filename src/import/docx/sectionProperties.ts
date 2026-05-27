import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorNamedStyle,
  EditorPageSettings,
  EditorParagraphNode,
} from "../../core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "../../core/model.js";
import {
  WORD_NS,
  OFFICE_REL_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { twipsToPx } from "./units.js";
import type { DocxSettings } from "./settings.js";

export interface SectionProperties {
  pageSettings?: EditorPageSettings;
  headerRIds: Partial<Record<"default" | "first" | "even", string>>;
  footerRIds: Partial<Record<"default" | "first" | "even", string>>;
  docGridLinePitchPx?: number;
  docGridMode?: "explicit" | "implicit";
  docGridType?: string | null;
}

export function parseSectionProperties(sectPr: XmlElement): SectionProperties {
  const pageSize = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgSz");
  const pageMargins = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgMar");

  let pageSettings: EditorPageSettings | undefined;
  if (pageSize || pageMargins) {
    const width = twipsToPx(getAttributeValue(pageSize, "w"), 816);
    const height = twipsToPx(getAttributeValue(pageSize, "h"), 1056);
    const orientationValue = getAttributeValue(pageSize, "orient");

    pageSettings = {
      width,
      height,
      orientation:
        orientationValue === "landscape"
          ? "landscape"
          : orientationValue === "portrait"
            ? "portrait"
            : width > height
              ? "landscape"
              : "portrait",
      margins: {
        top: twipsToPx(getAttributeValue(pageMargins, "top"), 96),
        right: twipsToPx(getAttributeValue(pageMargins, "right"), 96),
        bottom: twipsToPx(getAttributeValue(pageMargins, "bottom"), 96),
        left: twipsToPx(getAttributeValue(pageMargins, "left"), 96),
        header: twipsToPx(getAttributeValue(pageMargins, "header"), 48),
        footer: twipsToPx(getAttributeValue(pageMargins, "footer"), 48),
        gutter: twipsToPx(getAttributeValue(pageMargins, "gutter"), 0),
      },
    };
  }

  const parseSectionReferences = (localName: "headerReference" | "footerReference") => {
    const refs: Partial<Record<"default" | "first" | "even", string>> = {};
    for (const ref of getChildrenByTagNameNS(sectPr, WORD_NS, localName)) {
      const type = getAttributeValue(ref, "type") ?? "default";
      if (type !== "default" && type !== "first" && type !== "even") {
        continue;
      }
      const rId =
        ref.getAttribute("r:id") ??
        ref.getAttributeNS(OFFICE_REL_NS, "id") ??
        null;
      if (rId) {
        refs[type] = rId;
      }
    }
    return refs;
  };
  const headerRIds = parseSectionReferences("headerReference");
  const footerRIds = parseSectionReferences("footerReference");
  const docGrid = getFirstChildByTagNameNS(sectPr, WORD_NS, "docGrid");
  const docGridType = getAttributeValue(docGrid, "type");
  const docGridLinePitchPx = twipsToPx(getAttributeValue(docGrid, "linePitch"), Number.NaN);

  return {
    pageSettings,
    headerRIds,
    footerRIds,
    docGridLinePitchPx:
      Number.isFinite(docGridLinePitchPx) && docGridLinePitchPx > 0
        ? docGridLinePitchPx
        : undefined,
    docGridMode:
      docGridType === "lines" ||
      docGridType === "linesAndChars" ||
      docGridType === "snapToChars"
        ? "explicit"
        : docGrid && docGridType === null
          ? "implicit"
          : undefined,
    docGridType,
  };
}

export function parsePageSettings(body: XmlElement | undefined): EditorPageSettings | undefined {
  if (!body) {
    return undefined;
  }

  const sectionProperties = getFirstChildByTagNameNS(body, WORD_NS, "sectPr");
  if (!sectionProperties) {
    return undefined;
  }

  const pageSize = getFirstChildByTagNameNS(sectionProperties, WORD_NS, "pgSz");
  const pageMargins = getFirstChildByTagNameNS(sectionProperties, WORD_NS, "pgMar");
  if (!pageSize && !pageMargins) {
    return undefined;
  }

  const width = twipsToPx(getAttributeValue(pageSize, "w"), 816);
  const height = twipsToPx(getAttributeValue(pageSize, "h"), 1056);
  const orientationValue = getAttributeValue(pageSize, "orient");

  return {
    width,
    height,
    orientation:
      orientationValue === "landscape"
        ? "landscape"
        : orientationValue === "portrait"
          ? "portrait"
          : width > height
            ? "landscape"
            : "portrait",
    margins: {
      top: twipsToPx(getAttributeValue(pageMargins, "top"), 96),
      right: twipsToPx(getAttributeValue(pageMargins, "right"), 96),
      bottom: twipsToPx(getAttributeValue(pageMargins, "bottom"), 96),
      left: twipsToPx(getAttributeValue(pageMargins, "left"), 96),
      header: twipsToPx(getAttributeValue(pageMargins, "header"), 48),
      footer: twipsToPx(getAttributeValue(pageMargins, "footer"), 48),
      gutter: twipsToPx(getAttributeValue(pageMargins, "gutter"), 0),
    },
  };
}

export function getParagraphMaxFontSize(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  const paragraphTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );

  return paragraph.runs.reduce((maxFontSize, run) => {
    const runTextStyle = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      styles,
    );
    return Math.max(maxFontSize, runTextStyle.fontSize ?? maxFontSize);
  }, paragraphTextStyle.fontSize ?? 15);
}

export function applyDocGridLinePitch(
  blocks: EditorBlockNode[],
  linePitchPx: number | undefined,
  mode: SectionProperties["docGridMode"],
  docGridType: string | null | undefined,
  settings: DocxSettings,
): void {
  if (!linePitchPx || !mode) {
    return;
  }

  for (const block of blocks) {
    if (block.type === "paragraph") {
      const isHeading = block.style?.styleId && /heading/i.test(block.style.styleId);
      if (
        block.style?.lineHeight === undefined &&
        block.style?.snapToGrid !== false &&
        !isHeading
      ) {
        const lineGridType = mode === "implicit" ? "implicit" : (docGridType as any);
        block.style = {
          ...(block.style ?? {}),
          lineGridPitch: linePitchPx,
          lineGridType,
        };
      }
      continue;
    }

    if (settings.adjustLineHeightInTable) {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          applyDocGridLinePitch(cell.blocks, linePitchPx, mode, docGridType, settings);
        }
      }
    }
  }
}
