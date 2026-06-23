import type { EditorFootnoteSettings } from "@/core/model.js";
import { imageContentTypeDefaults } from "@/utils/imageFormats.js";
import type { DocContext, PartDefinition } from "./docxTypes.js";
import {
  escapeXml,
  OFFICE_REL_NS,
  PACKAGE_REL_NS,
  pointsToTwips,
  WORD_NS,
} from "./xmlUtils.js";

// Builders for the OPC package scaffolding XML parts: `[Content_Types].xml`,
// the root and document relationship parts, `settings.xml` and per-part
// relationships. Extracted from exportEditorDocumentToDocx so the orchestrator
// only assembles parts, not their markup (S2).

export function buildContentTypesXml(
  hasNumbering: boolean,
  imageExtensions: Iterable<string>,
  hasSettings: boolean,
  parts: PartDefinition[],
  hasFootnotes: boolean,
  hasEndnotes: boolean,
  hasStyles: boolean,
  hasComments: boolean,
): string {
  const overrides = parts
    .map((part) => {
      const contentType =
        part.kind === "header"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml";
      return `<Override PartName="/word/${part.path}" ContentType="${contentType}"/>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageContentTypeDefaults(
    imageExtensions,
  )}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${
    hasStyles
      ? '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      : ""
  }${
    hasNumbering
      ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
      : ""
  }${
    hasSettings
      ? '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
      : ""
  }${
    hasFootnotes
      ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>'
      : ""
  }${
    hasEndnotes
      ? '<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>'
      : ""
  }${
    hasComments
      ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' +
        '<Override PartName="/word/commentsExtended.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml"/>'
      : ""
  }${overrides}</Types>`;
}

export function buildRootRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`;
}

export function buildDocumentRelationshipsXml(
  hasNumbering: boolean,
  hasSettings: boolean,
  images: DocContext["images"],
  hyperlinks: DocContext["hyperlinks"],
  parts: PartDefinition[],
  hasFootnotes: boolean,
  hasEndnotes: boolean,
  hasStyles: boolean,
  hasComments: boolean,
): string {
  let rels = "";
  if (hasStyles)
    rels += `<Relationship Id="rIdStyles" Type="${OFFICE_REL_NS}/styles" Target="styles.xml"/>`;
  if (hasNumbering)
    rels += `<Relationship Id="rIdNum" Type="${OFFICE_REL_NS}/numbering" Target="numbering.xml"/>`;
  if (hasSettings)
    rels += `<Relationship Id="rIdSettings" Type="${OFFICE_REL_NS}/settings" Target="settings.xml"/>`;
  for (const hyperlink of hyperlinks) {
    rels += `<Relationship Id="${hyperlink.rId}" Type="${OFFICE_REL_NS}/hyperlink" Target="${escapeXml(hyperlink.href)}" TargetMode="External"/>`;
  }
  for (const img of images) {
    const targetMode = img.kind === "linked" ? ' TargetMode="External"' : "";
    rels += `<Relationship Id="${img.rId}" Type="${OFFICE_REL_NS}/image" Target="${escapeXml(img.target)}"${targetMode}/>`;
  }
  for (const part of parts) {
    const relType = part.kind === "header" ? "header" : "footer";
    rels += `<Relationship Id="${part.relId}" Type="${OFFICE_REL_NS}/${relType}" Target="${part.path}"/>`;
  }
  if (hasFootnotes) {
    rels += `<Relationship Id="rIdFootnotes" Type="${OFFICE_REL_NS}/footnotes" Target="footnotes.xml"/>`;
  }
  if (hasEndnotes) {
    rels += `<Relationship Id="rIdEndnotes" Type="${OFFICE_REL_NS}/endnotes" Target="endnotes.xml"/>`;
  }
  if (hasComments) {
    rels += `<Relationship Id="rIdComments" Type="${OFFICE_REL_NS}/comments" Target="comments.xml"/>`;
    rels += `<Relationship Id="rIdCommentsExtended" Type="http://schemas.microsoft.com/office/2011/relationships/commentsExtended" Target="commentsExtended.xml"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}">${rels}</Relationships>`;
}

const NOTE_NUMBER_FORMATS: Record<
  NonNullable<EditorFootnoteSettings["numberFormat"]>,
  string
> = {
  decimal: "decimal",
  lowerRoman: "lowerRoman",
  upperRoman: "upperRoman",
  lowerLetter: "lowerLetter",
  upperLetter: "upperLetter",
  symbol: "symbol",
};

const NOTE_RESTARTS: Record<
  NonNullable<EditorFootnoteSettings["restart"]>,
  string
> = {
  continuous: "continuous",
  eachSection: "eachSect",
};

function serializeNoteSettings(
  tagName: "footnotePr" | "endnotePr",
  settings: EditorFootnoteSettings | undefined,
): string | null {
  if (!settings) return null;
  const parts: string[] = [];
  if (settings.numberFormat) {
    parts.push(
      `<w:numFmt w:val="${NOTE_NUMBER_FORMATS[settings.numberFormat]}"/>`,
    );
  }
  if (settings.startAt !== undefined) {
    parts.push(`<w:numStart w:val="${Math.max(1, settings.startAt)}"/>`);
  }
  if (settings.restart) {
    parts.push(`<w:numRestart w:val="${NOTE_RESTARTS[settings.restart]}"/>`);
  }
  return parts.length > 0
    ? `<w:${tagName}>${parts.join("")}</w:${tagName}>`
    : null;
}

export interface HyphenationSettingsXml {
  autoHyphenation?: boolean;
  consecutiveHyphenLimit?: number;
  hyphenationZone?: number;
  doNotHyphenateCaps?: boolean;
}

export function buildSettingsXml(
  hasEvenAndOddHeaders: boolean,
  defaultTabStop?: number,
  footnoteSettings?: EditorFootnoteSettings,
  endnoteSettings?: EditorFootnoteSettings,
  allowSpaceOfSameStyleInTable?: boolean,
  hyphenation?: HyphenationSettingsXml,
): string {
  const parts: string[] = [];
  const defaultTabStopTwips = pointsToTwips(defaultTabStop);
  if (defaultTabStopTwips !== null) {
    parts.push(`<w:defaultTabStop w:val="${defaultTabStopTwips}"/>`);
  }
  if (hyphenation?.autoHyphenation) {
    parts.push("<w:autoHyphenation/>");
  }
  if (
    hyphenation?.consecutiveHyphenLimit !== undefined &&
    hyphenation.consecutiveHyphenLimit >= 0
  ) {
    parts.push(
      `<w:consecutiveHyphenLimit w:val="${hyphenation.consecutiveHyphenLimit}"/>`,
    );
  }
  const hyphenationZoneTwips = pointsToTwips(hyphenation?.hyphenationZone);
  if (hyphenationZoneTwips !== null) {
    parts.push(`<w:hyphenationZone w:val="${hyphenationZoneTwips}"/>`);
  }
  if (hyphenation?.doNotHyphenateCaps) {
    parts.push("<w:doNotHyphenateCaps/>");
  }
  const footnotePr = serializeNoteSettings("footnotePr", footnoteSettings);
  if (footnotePr) {
    parts.push(footnotePr);
  }
  const endnotePr = serializeNoteSettings("endnotePr", endnoteSettings);
  if (endnotePr) {
    parts.push(endnotePr);
  }
  if (hasEvenAndOddHeaders) {
    parts.push("<w:evenAndOddHeaders/>");
  }
  if (allowSpaceOfSameStyleInTable) {
    parts.push(`<w:compat><w:allowSpaceOfSameStyleInTable/></w:compat>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${WORD_NS}">${parts.join("")}</w:settings>`;
}

export function buildPartRelationshipsXml(
  images: DocContext["images"],
  hyperlinks: DocContext["hyperlinks"],
): string {
  let rels = "";
  for (const hyperlink of hyperlinks) {
    rels += `<Relationship Id="${hyperlink.rId}" Type="${OFFICE_REL_NS}/hyperlink" Target="${escapeXml(hyperlink.href)}" TargetMode="External"/>`;
  }
  for (const img of images) {
    const targetMode = img.kind === "linked" ? ' TargetMode="External"' : "";
    rels += `<Relationship Id="${img.rId}" Type="${OFFICE_REL_NS}/image" Target="${escapeXml(img.target)}"${targetMode}/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}">${rels}</Relationships>`;
}
