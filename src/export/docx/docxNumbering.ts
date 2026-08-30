import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocument, EditorParagraphNode } from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import type { NumberingContext, NumberingDefinition } from "./docxTypes.js";
import { escapeXml, WORD_NS } from "./xmlUtils.js";
import { visitBlocks } from "./docxBlockVisitor.js";
import {
  getEditorListOoxmlNumberingMetadata,
  getEffectiveEditorListOoxmlFormat,
} from "@/ooxml/word/numberingMetadata.js";

function getAttributeByLocalName(
  element: XmlElement,
  localName: string,
): string | undefined {
  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute?.localName === localName) {
      return attribute.value;
    }
  }
  return undefined;
}

function sourceNumberingXml(document: EditorDocument): string | undefined {
  const sourcePackage = document.sourcePackage;
  if (!sourcePackage) {
    return undefined;
  }
  const mainPart = sourcePackage.parts[sourcePackage.mainDocumentPart];
  const relationship = mainPart?.relationships?.find(
    (candidate): boolean =>
      candidate.targetMode !== "External" &&
      candidate.type.endsWith("/numbering") &&
      Boolean(candidate.resolvedTarget),
  );
  const part = relationship?.resolvedTarget
    ? sourcePackage.parts[relationship.resolvedTarget]
    : undefined;
  return part?.kind === "xml" ? part.data : undefined;
}

function maxSourceNumberingId(
  xml: string | undefined,
  elementName: "abstractNum" | "num",
  attributeName: "abstractNumId" | "numId",
): number {
  if (!xml) {
    return 0;
  }
  const document = new DOMParser().parseFromString(xml, "application/xml");
  let max = 0;
  for (const element of Array.from(
    document.getElementsByTagNameNS(WORD_NS, elementName),
  )) {
    const raw = getAttributeByLocalName(element, attributeName);
    if (!raw || !/^\d+$/.test(raw)) {
      continue;
    }
    const value = Number.parseInt(raw, 10);
    if (Number.isSafeInteger(value)) {
      max = Math.max(max, value);
    }
  }
  return max;
}

function isValidSourceId(
  value: number | undefined,
  minimum: number,
): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value >= minimum;
}

/**
 * Walks the document (including headers/footers and nested content) collecting
 * list paragraphs into abstract numbering definitions and a per-paragraph
 * numId/level map. Imported list identities are retained whenever possible so
 * source-backed export can key granular numbering preservation by stable OOXML
 * ids. New ids are allocated above the source package's maximum to avoid
 * colliding with source-only definitions that still need preservation.
 */
export function buildNumberingContext(
  document: EditorDocument,
): NumberingContext {
  const numberingInfo = new Map<string, { numId: number; level: number }>();
  const definitionMap = new Map<string, NumberingDefinition>();
  const definitions: NumberingDefinition[] = [];
  const usedAbstractNumIds = new Set<number>();
  const usedNumIds = new Set<number>();

  const originalNumberingXml = sourceNumberingXml(document);
  let nextAbstractNumId = Math.max(
    1,
    maxSourceNumberingId(originalNumberingXml, "abstractNum", "abstractNumId") +
      1,
  );
  let nextNumId = Math.max(
    1,
    maxSourceNumberingId(originalNumberingXml, "num", "numId") + 1,
  );

  const claimAbstractNumId = (preferred: number | undefined): number => {
    if (isValidSourceId(preferred, 0) && !usedAbstractNumIds.has(preferred)) {
      usedAbstractNumIds.add(preferred);
      return preferred;
    }
    while (usedAbstractNumIds.has(nextAbstractNumId)) {
      nextAbstractNumId += 1;
    }
    const allocated = nextAbstractNumId;
    nextAbstractNumId += 1;
    usedAbstractNumIds.add(allocated);
    return allocated;
  };

  const claimNumId = (preferred: number | undefined): number => {
    if (isValidSourceId(preferred, 1) && !usedNumIds.has(preferred)) {
      usedNumIds.add(preferred);
      return preferred;
    }
    while (usedNumIds.has(nextNumId)) {
      nextNumId += 1;
    }
    const allocated = nextNumId;
    nextNumId += 1;
    usedNumIds.add(allocated);
    return allocated;
  };

  const listParagraphs: EditorParagraphNode[] = [];
  const collectParagraph = (paragraph: EditorParagraphNode): void => {
    if (paragraph.list) {
      listParagraphs.push(paragraph);
    }
  };

  for (const section of getDocumentSections(document)) {
    visitBlocks(section.blocks, collectParagraph);
    if (section.header) {
      visitBlocks(section.header, collectParagraph);
    }
    if (section.firstPageHeader) {
      visitBlocks(section.firstPageHeader, collectParagraph);
    }
    if (section.evenPageHeader) {
      visitBlocks(section.evenPageHeader, collectParagraph);
    }
    if (section.footer) {
      visitBlocks(section.footer, collectParagraph);
    }
    if (section.firstPageFooter) {
      visitBlocks(section.firstPageFooter, collectParagraph);
    }
    if (section.evenPageFooter) {
      visitBlocks(section.evenPageFooter, collectParagraph);
    }
  }

  for (const paragraph of listParagraphs) {
    const list = paragraph.list!;
    const level = Math.max(0, list.level ?? 0);
    // Imported numIds remain independent. Lists created by the editor retain
    // the historical appearance-based sharing behaviour.
    const bulletGlyph = list.bulletGlyph ?? "";
    const key = list.instanceId
      ? `instance:${list.instanceId}`
      : `legacy:${list.kind}:${level}:${bulletGlyph}`;
    let definition = definitionMap.get(key);
    if (!definition) {
      const sourceMetadata = getEditorListOoxmlNumberingMetadata(list);
      const canReuseSourceIdentity =
        sourceMetadata?.sourceNumId !== undefined &&
        list.instanceId === String(sourceMetadata.sourceNumId);
      definition = {
        abstractNumId: claimAbstractNumId(
          canReuseSourceIdentity
            ? sourceMetadata.sourceAbstractNumId
            : undefined,
        ),
        numId: claimNumId(
          canReuseSourceIdentity ? sourceMetadata.sourceNumId : undefined,
        ),
        levels: [],
      };
      definitionMap.set(key, definition);
      definitions.push(definition);
    }
    if (
      !definition.levels.some((candidate): boolean => candidate.level === level)
    ) {
      const sourceMetadata = getEditorListOoxmlNumberingMetadata(list);
      const sourceFormat = getEffectiveEditorListOoxmlFormat(list);
      definition.levels.push({
        kind: list.kind,
        level,
        format: list.format,
        startAt: list.startAt,
        levelText: list.levelText,
        suffix: list.suffix,
        alignment: list.alignment,
        legal: list.legal,
        bulletGlyph: list.bulletGlyph,
        bulletFont: list.bulletFont,
        ...(sourceMetadata
          ? {
              ooxml: {
                ...sourceMetadata,
                ...(sourceFormat
                  ? { format: sourceFormat }
                  : { format: undefined }),
              },
            }
          : {}),
      });
    }
    numberingInfo.set(paragraph.id, { numId: definition.numId, level });
  }

  return { numberingInfo, definitions };
}

export function buildNumberingXml(definitions: NumberingDefinition[]): string {
  const abstractNums = definitions
    .map(({ abstractNumId, levels }): string => {
      const levelsXml = levels
        .sort((a, b): number => a.level - b.level)
        .map(
          ({
            kind,
            level,
            format,
            startAt,
            levelText,
            suffix,
            alignment,
            legal,
            bulletGlyph,
            bulletFont,
            ooxml,
          }): string => {
            const numFmtVal =
              kind === "bullet"
                ? "bullet"
                : (ooxml?.format ?? format ?? "decimal");
            const effectiveLevelText =
              levelText ??
              (kind === "bullet" ? (bulletGlyph ?? "") : `%${level + 1}.`);
            const startVal = startAt ?? 1;
            const fontName =
              kind === "bullet" ? (bulletFont ?? "Symbol") : undefined;
            const runFonts = fontName
              ? `<w:rPr><w:rFonts w:ascii="${escapeXml(fontName)}" w:hAnsi="${escapeXml(fontName)}" w:hint="default"/></w:rPr>`
              : "";

            const suffixXml =
              suffix && suffix !== "tab" ? `<w:suff w:val="${suffix}"/>` : "";
            const legalXml = legal ? "<w:isLgl/>" : "";
            const restartXml =
              ooxml?.restartAfterLevel !== undefined
                ? `<w:lvlRestart w:val="${ooxml.restartAfterLevel}"/>`
                : "";
            const paragraphStyleXml = ooxml?.paragraphStyleId
              ? `<w:pStyle w:val="${escapeXml(ooxml.paragraphStyleId)}"/>`
              : "";
            return `<w:lvl w:ilvl="${level}"><w:start w:val="${startVal}"/><w:numFmt w:val="${escapeXml(numFmtVal)}"/>${restartXml}${paragraphStyleXml}<w:lvlText w:val="${escapeXml(effectiveLevelText)}"/><w:lvlJc w:val="${alignment ?? "left"}"/>${suffixXml}${legalXml}${runFonts}</w:lvl>`;
          },
        )
        .join("");
      return `<w:abstractNum w:abstractNumId="${abstractNumId}">${levelsXml}</w:abstractNum>`;
    })
    .join("");

  const nums = definitions
    .map(
      ({ abstractNumId, numId }): string =>
        `<w:num w:numId="${numId}"><w:abstractNumId w:val="${abstractNumId}"/></w:num>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${WORD_NS}">${abstractNums}${nums}</w:numbering>`;
}
