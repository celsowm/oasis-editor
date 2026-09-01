import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorColumnsSettings,
  EditorNamedStyle,
  EditorPageNumbering,
  EditorPageSettings,
  EditorPageBorder,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorSectionVerticalAlign,
  EditorSectionPropertiesSnapshot,
  EditorPropertyRevision,
} from "@/core/model.js";
import { resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
import { DEFAULT_FONT_SIZE_PX } from "@/core/units.js";
import {
  WORD_NS,
  OFFICE_REL_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  parseOnOffProperty,
} from "./xmlHelpers.js";
import { twipsToPx } from "./units.js";
import type { DocxSettings } from "./settings.js";
import { parseRevisionMetadata } from "./revisionMetadata.js";

export interface SectionProperties {
  pageSettings?: EditorPageSettings;
  pageBorder?: EditorPageBorder;
  headerRIds: Partial<Record<"default" | "first" | "even", string>>;
  footerRIds: Partial<Record<"default" | "first" | "even", string>>;
  docGridLinePitchPx?: number;
  docGridMode?: "explicit";
  docGridType?: string | null;
  /**
   * `w:type` — section break type. In OOXML this sits on the sectPr that
   * *ends* a section and describes how the *following* section begins; the
   * import driver applies the off-by-one when building `EditorSection` objects.
   */
  breakType?: "nextPage" | "continuous" | "evenPage" | "oddPage" | "nextColumn";
  /** `w:pgNumType` — page numbering format/start/chapter. Round-trip only. */
  pageNumbering?: EditorPageNumbering;
  /** `w:vAlign` — vertical justification of page contents. Round-trip only. */
  verticalAlignment?: EditorSectionVerticalAlign;
  /** `w:bidi` — right-to-left section layout. Round-trip only. */
  bidi?: boolean;
  propertyRevision?: EditorPropertyRevision<EditorSectionPropertiesSnapshot>;
}

const DEFAULT_SECTION_PAGE_SETTINGS: EditorPageSettings = {
  width: 816,
  height: 1056,
  orientation: "portrait",
  margins: {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    header: 48,
    footer: 48,
    gutter: 0,
  },
};

function sectionPropertiesSnapshot(
  properties: SectionProperties,
  fallbackPageSettings?: EditorPageSettings,
): EditorSectionPropertiesSnapshot {
  return {
    pageSettings:
      properties.pageSettings ?? fallbackPageSettings ?? DEFAULT_SECTION_PAGE_SETTINGS,
    ...(properties.pageBorder ? { pageBorder: properties.pageBorder } : {}),
    ...(properties.pageNumbering
      ? { pageNumbering: properties.pageNumbering }
      : {}),
    ...(properties.verticalAlignment
      ? { verticalAlignment: properties.verticalAlignment }
      : {}),
    ...(properties.bidi !== undefined ? { bidi: properties.bidi } : {}),
    ...(properties.breakType ? { nextBreakType: properties.breakType } : {}),
  };
}

function isXmlTrue(value: string | null | undefined): boolean {
  return value === "1" || value === "true" || value === "on";
}

function parseColumns(sectPr: XmlElement): EditorColumnsSettings | undefined {
  const cols = getFirstChildByTagNameNS(sectPr, WORD_NS, "cols");
  if (!cols) {
    return undefined;
  }
  const count = Number.parseInt(getAttributeValue(cols, "num") ?? "1", 10);
  if (!Number.isFinite(count) || count <= 1) {
    return undefined;
  }
  const space = twipsToPx(getAttributeValue(cols, "space"), 0);
  const sepAttr = getAttributeValue(cols, "sep");
  const equalWidthAttr = getAttributeValue(cols, "equalWidth");
  const colChildren = getChildrenByTagNameNS(cols, WORD_NS, "col");
  const explicit = colChildren.map((col): { width: number; space: number } => ({
    width: twipsToPx(getAttributeValue(col, "w"), 0),
    space: twipsToPx(getAttributeValue(col, "space"), space),
  }));
  // `w:equalWidth` defaults to true; explicit per-column widths only matter
  // when the section is declared unequal.
  const equalWidth = equalWidthAttr == null ? true : isXmlTrue(equalWidthAttr);

  return {
    count,
    space,
    ...(isXmlTrue(sepAttr) ? { separator: true } : {}),
    ...(equalWidth ? {} : { equalWidth: false }),
    ...(!equalWidth && explicit.length > 0 ? { columns: explicit } : {}),
  };
}

export function parseSectionProperties(sectPr: XmlElement): SectionProperties {
  const pageSize = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgSz");
  const pageMargins = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgMar");
  const columns = parseColumns(sectPr);
  const pageBorders = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgBorders");
  const borderNode = getFirstChildByTagNameNS(pageBorders, WORD_NS, "top");
  const borderStyle = getAttributeValue(borderNode, "val");
  const borderColor = getAttributeValue(borderNode, "color");
  const borderSize = Number.parseInt(
    getAttributeValue(borderNode, "sz") ?? "0",
    10,
  );
  const pageBorder =
    borderStyle && borderColor && borderStyle !== "nil"
      ? {
          style: (borderStyle === "double" ||
          borderStyle === "dashed" ||
          borderStyle === "dotted"
            ? borderStyle
            : "single") as EditorPageBorder["style"],
          color: `#${borderColor.replace(/^#/, "")}`,
          width:
            Number.isFinite(borderSize) && borderSize > 0 ? borderSize / 8 : 1,
          distance: Number(getAttributeValue(borderNode, "space") ?? 0),
        }
      : undefined;

  let pageSettings: EditorPageSettings | undefined;
  if (pageSize || pageMargins || columns) {
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
      ...(columns ? { columns } : {}),
    };
  }

  const parseSectionReferences = (
    localName: "headerReference" | "footerReference",
  ): Partial<Record<"default" | "first" | "even", string>> => {
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
  const docGridLinePitchPx = twipsToPx(
    getAttributeValue(docGrid, "linePitch"),
    Number.NaN,
  );

  // w:type — section break type. In OOXML this lives on the sectPr that *ends*
  // a section and describes how the *following* section begins (e.g. a
  // `continuous` type here means the next section flows without a page break).
  // The import driver applies the off-by-one when building EditorSection objects
  // so that `section[i].breakType` describes how section *i* begins.
  const typeElement = getFirstChildByTagNameNS(sectPr, WORD_NS, "type");
  const typeValue = getAttributeValue(typeElement, "val");
  const breakType: SectionProperties["breakType"] =
    typeValue === "continuous" ||
    typeValue === "nextPage" ||
    typeValue === "evenPage" ||
    typeValue === "oddPage" ||
    typeValue === "nextColumn"
      ? typeValue
      : undefined;

  // w:pgNumType — page numbering format/start/chapter. Preserved for
  // round-trip; `start` is intended to seed PAGE-field numbering in a future
  // pass. The `fmt` string is kept verbatim from the OOXML ST_NumberFormat
  // vocabulary so uncommon formats survive round-trip.
  const pgNumType = getFirstChildByTagNameNS(sectPr, WORD_NS, "pgNumType");
  let pageNumbering: EditorPageNumbering | undefined;
  if (pgNumType) {
    const startRaw = getAttributeValue(pgNumType, "start");
    const start = startRaw !== null ? Number.parseInt(startRaw, 10) : undefined;
    const format = getAttributeValue(pgNumType, "fmt") ?? undefined;
    const chapterStyle = getAttributeValue(pgNumType, "chapStyle") ?? undefined;
    const chapterSeparator =
      getAttributeValue(pgNumType, "chapSep") ?? undefined;
    if (
      (start !== undefined && Number.isFinite(start)) ||
      format ||
      chapterStyle ||
      chapterSeparator
    ) {
      pageNumbering = {
        ...(start !== undefined && Number.isFinite(start) ? { start } : {}),
        ...(format ? { format } : {}),
        ...(chapterStyle ? { chapterStyle } : {}),
        ...(chapterSeparator ? { chapterSeparator } : {}),
      };
    }
  }

  // w:vAlign — vertical justification of page contents (top|center|both|bottom).
  // `top` is the Word default and is normalized away here so the model only
  // carries non-default values (symmetric with export, which omits `top`).
  const vAlignElement = getFirstChildByTagNameNS(sectPr, WORD_NS, "vAlign");
  const vAlignValue = getAttributeValue(vAlignElement, "val");
  const verticalAlignment: EditorSectionVerticalAlign | undefined =
    vAlignValue === "center" ||
    vAlignValue === "both" ||
    vAlignValue === "bottom"
      ? vAlignValue
      : undefined;

  // w:bidi — right-to-left section layout (on/off element).
  const bidi = parseOnOffProperty(sectPr, "bidi");

  const propertyChange = getFirstChildByTagNameNS(
    sectPr,
    WORD_NS,
    "sectPrChange",
  );
  const revisionMetadata = parseRevisionMetadata(propertyChange);
  const previousSectPr = getFirstChildByTagNameNS(
    propertyChange,
    WORD_NS,
    "sectPr",
  );
  const propertyRevision =
    revisionMetadata && previousSectPr
      ? {
          ...revisionMetadata,
          type: "property" as const,
          previous: sectionPropertiesSnapshot(
            parseSectionProperties(previousSectPr),
            pageSettings,
          ),
        }
      : undefined;

  return {
    pageSettings,
    ...(pageBorder ? { pageBorder } : {}),
    headerRIds,
    footerRIds,
    docGridLinePitchPx:
      Number.isFinite(docGridLinePitchPx) && docGridLinePitchPx > 0
        ? docGridLinePitchPx
        : undefined,
    // Only a "lines"/"linesAndChars" grid snaps line height to the pitch. A
    // "default" grid (type omitted) — which Word writes into virtually every
    // document's sectPr as a leftover of the Normal template — must NOT affect
    // Latin line height; treating it as a grid floored every body line to the
    // pitch (e.g. 360 twips = 24px), inflating spacing well beyond Word.
    docGridMode:
      docGridType === "lines" || docGridType === "linesAndChars"
        ? "explicit"
        : undefined,
    docGridType,
    breakType,
    pageNumbering,
    verticalAlignment,
    bidi,
    propertyRevision,
  };
}

export function parsePageSettings(
  body: XmlElement | undefined,
): EditorPageSettings | undefined {
  if (!body) {
    return undefined;
  }

  const sectionProperties = getFirstChildByTagNameNS(body, WORD_NS, "sectPr");
  if (!sectionProperties) {
    return undefined;
  }

  const pageSize = getFirstChildByTagNameNS(sectionProperties, WORD_NS, "pgSz");
  const pageMargins = getFirstChildByTagNameNS(
    sectionProperties,
    WORD_NS,
    "pgMar",
  );
  const columns = parseColumns(sectionProperties);
  if (!pageSize && !pageMargins && !columns) {
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
    ...(columns ? { columns } : {}),
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

  return paragraph.runs.reduce((maxFontSize, run): number => {
    const runTextStyle = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      styles,
    );
    return Math.max(maxFontSize, runTextStyle.fontSize ?? maxFontSize);
  }, paragraphTextStyle.fontSize ?? DEFAULT_FONT_SIZE_PX);
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
      const isHeading =
        block.style?.styleId && /heading/i.test(block.style.styleId);
      if (
        block.style?.lineHeight === undefined &&
        block.style?.snapToGrid !== false &&
        !isHeading
      ) {
        block.style = {
          ...(block.style ?? {}),
          lineGridPitch: linePitchPx,
          lineGridType: docGridType as EditorParagraphStyle["lineGridType"],
        };
      }
      continue;
    }

    if (settings.adjustLineHeightInTable) {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          applyDocGridLinePitch(
            cell.blocks,
            linePitchPx,
            mode,
            docGridType,
            settings,
          );
        }
      }
    }
  }
}
