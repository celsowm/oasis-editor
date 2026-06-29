import type { EditorDocument, EditorParagraphNode } from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import type { NumberingContext, NumberingDefinition } from "./docxTypes.js";
import { escapeXml, WORD_NS } from "./xmlUtils.js";
import { visitBlocks } from "./docxBlockVisitor.js";

/**
 * Walks the document (including headers/footers and nested content) collecting
 * list paragraphs into abstract numbering definitions and a per-paragraph
 * numId/level map. Extracted from exportEditorDocumentToDocx (S2).
 */
export function buildNumberingContext(
  document: EditorDocument,
): NumberingContext {
  const numberingInfo = new Map<string, { numId: number; level: number }>();
  const definitionMap = new Map<string, NumberingDefinition>();
  const definitions: NumberingDefinition[] = [];
  let nextAbstractNumId = 1;
  let nextNumId = 1;

  const traverseParagraph = (paragraph: EditorParagraphNode): void => {
    if (!paragraph.list) {
      return;
    }

    const level = Math.max(0, paragraph.list.level ?? 0);
    // Imported numIds remain independent. Lists created by the editor retain
    // the historical appearance-based sharing behaviour.
    const bulletGlyph = paragraph.list.bulletGlyph ?? "";
    const key = paragraph.list.instanceId
      ? `instance:${paragraph.list.instanceId}`
      : `legacy:${paragraph.list.kind}:${level}:${bulletGlyph}`;
    let definition = definitionMap.get(key);
    if (!definition) {
      definition = {
        abstractNumId: nextAbstractNumId++,
        numId: nextNumId++,
        levels: [],
      };
      definitionMap.set(key, definition);
      definitions.push(definition);
    }
    if (!definition.levels.some((candidate): boolean => candidate.level === level)) {
      definition.levels.push({
        kind: paragraph.list.kind,
        level,
        format: paragraph.list.format,
        startAt: paragraph.list.startAt,
        levelText: paragraph.list.levelText,
        suffix: paragraph.list.suffix,
        alignment: paragraph.list.alignment,
        legal: paragraph.list.legal,
        bulletGlyph: paragraph.list.bulletGlyph,
        bulletFont: paragraph.list.bulletFont,
      });
    }
    numberingInfo.set(paragraph.id, { numId: definition.numId, level });
  };

  for (const section of getDocumentSections(document)) {
    visitBlocks(section.blocks, traverseParagraph);
    if (section.header) {
      visitBlocks(section.header, traverseParagraph);
    }
    if (section.firstPageHeader) {
      visitBlocks(section.firstPageHeader, traverseParagraph);
    }
    if (section.evenPageHeader) {
      visitBlocks(section.evenPageHeader, traverseParagraph);
    }
    if (section.footer) {
      visitBlocks(section.footer, traverseParagraph);
    }
    if (section.firstPageFooter) {
      visitBlocks(section.firstPageFooter, traverseParagraph);
    }
    if (section.evenPageFooter) {
      visitBlocks(section.evenPageFooter, traverseParagraph);
    }
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
          }): string => {
            const numFmtVal =
              kind === "bullet" ? "bullet" : (format ?? "decimal");
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
            return `<w:lvl w:ilvl="${level}"><w:start w:val="${startVal}"/><w:numFmt w:val="${numFmtVal}"/><w:lvlText w:val="${escapeXml(effectiveLevelText)}"/><w:lvlJc w:val="${alignment ?? "left"}"/>${suffixXml}${legalXml}${runFonts}</w:lvl>`;
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
