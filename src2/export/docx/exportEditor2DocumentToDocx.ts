import JSZip from "jszip";
import type {
  Editor2BlockNode,
  Editor2Document,
  Editor2ParagraphListStyle,
  Editor2ParagraphNode,
  Editor2TableNode,
  Editor2TextRun,
  Editor2TextStyle,
} from "../../core/model.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const DOCX_HIGHLIGHT_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  blue: [0, 0, 255],
  cyan: [0, 255, 255],
  green: [0, 128, 0],
  magenta: [255, 0, 255],
  red: [255, 0, 0],
  yellow: [255, 255, 0],
  white: [255, 255, 255],
  darkBlue: [0, 0, 139],
  darkCyan: [0, 139, 139],
  darkGreen: [0, 100, 0],
  darkMagenta: [139, 0, 139],
  darkRed: [139, 0, 0],
  darkYellow: [184, 134, 11],
  darkGray: [169, 169, 169],
  lightGray: [211, 211, 211],
};
const DOCX_HIGHLIGHT_HEX_ALIASES: Record<string, string> = {
  "ffff00": "yellow",
  "fef08a": "yellow",
  "ff0000": "red",
  "00ff00": "green",
  "0000ff": "blue",
  "00ffff": "cyan",
  "ff00ff": "magenta",
  "000000": "black",
  "ffffff": "white",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toTwips(value: number | null | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 20);
}

function toHalfPoints(value: number | null | undefined): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 2);
}

function parseHexColor(color: string): [number, number, number] | null {
  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function normalizeHighlightForDocx(highlight: string): string {
  if (highlight in DOCX_HIGHLIGHT_COLORS) {
    return highlight;
  }

  const normalizedHex = highlight.trim().replace(/^#/, "").toLowerCase();
  const directAlias = DOCX_HIGHLIGHT_HEX_ALIASES[normalizedHex];
  if (directAlias) {
    return directAlias;
  }

  const rgb = parseHexColor(highlight);
  if (!rgb) {
    return "yellow";
  }

  let bestName = "yellow";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [name, candidate] of Object.entries(DOCX_HIGHLIGHT_COLORS)) {
    const distance =
      (candidate[0] - rgb[0]) ** 2 + (candidate[1] - rgb[1]) ** 2 + (candidate[2] - rgb[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = name;
    }
  }
  return bestName;
}

function needsPreserveSpace(text: string): boolean {
  return /^\s|\s$/.test(text) || text.includes("  ");
}

function serializeTextSegment(segment: string): string {
  if (segment.length === 0) {
    return "";
  }
  const preserve = needsPreserveSpace(segment) ? ' xml:space="preserve"' : "";
  return `<w:t${preserve}>${escapeXml(segment)}</w:t>`;
}

function serializeRunText(text: string): string {
  if (text.length === 0) {
    return "<w:t></w:t>";
  }

  let result = "";
  let buffer = "";
  for (const char of text) {
    if (char === "\n") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:br/>";
      continue;
    }
    if (char === "\t") {
      result += serializeTextSegment(buffer);
      buffer = "";
      result += "<w:tab/>";
      continue;
    }
    buffer += char;
  }

  result += serializeTextSegment(buffer);
  return result || "<w:t></w:t>";
}

function serializeRunProperties(styles?: Editor2TextStyle): string {
  if (!styles) {
    return "";
  }

  const parts: string[] = [];
  if (styles.bold) {
    parts.push("<w:b/>");
  }
  if (styles.italic) {
    parts.push("<w:i/>");
  }
  if (styles.underline) {
    parts.push('<w:u w:val="single"/>');
  }
  if (styles.strike) {
    parts.push("<w:strike/>");
  }
  if (styles.superscript) {
    parts.push('<w:vertAlign w:val="superscript"/>');
  } else if (styles.subscript) {
    parts.push('<w:vertAlign w:val="subscript"/>');
  }
  if (styles.fontFamily) {
    parts.push(
      `<w:rFonts w:ascii="${escapeXml(styles.fontFamily)}" w:hAnsi="${escapeXml(styles.fontFamily)}" w:cs="${escapeXml(styles.fontFamily)}"/>`,
    );
  }
  if (styles.fontSize !== undefined && styles.fontSize !== null) {
    const size = toHalfPoints(styles.fontSize);
    if (size !== null) {
      parts.push(`<w:sz w:val="${size}"/>`);
    }
  }
  if (styles.color) {
    parts.push(`<w:color w:val="${escapeXml(styles.color.replace(/^#/, ""))}"/>`);
  }
  if (styles.highlight) {
    parts.push(`<w:highlight w:val="${escapeXml(normalizeHighlightForDocx(styles.highlight))}"/>`);
  }

  return parts.length > 0 ? `<w:rPr>${parts.join("")}</w:rPr>` : "";
}

function serializeRun(run: Editor2TextRun): string {
  return `<w:r>${serializeRunProperties(run.styles)}${serializeRunText(run.text)}</w:r>`;
}

function serializeParagraphProperties(
  paragraph: Editor2ParagraphNode,
  numberingInfo: Map<string, { numId: number; level: number }>,
): string {
  const parts: string[] = [];
  const style = paragraph.style;

  if (style?.align) {
    parts.push(`<w:jc w:val="${style.align}"/>`);
  }

  if (
    style?.spacingBefore !== undefined ||
    style?.spacingAfter !== undefined ||
    style?.lineHeight !== undefined
  ) {
    const attrs: string[] = [];
    const before = toTwips(style.spacingBefore);
    const after = toTwips(style.spacingAfter);
    const line =
      style.lineHeight !== undefined && style.lineHeight !== null && Number.isFinite(style.lineHeight)
        ? Math.round(style.lineHeight * 240)
        : null;
    if (before !== null) {
      attrs.push(`w:before="${before}"`);
    }
    if (after !== null) {
      attrs.push(`w:after="${after}"`);
    }
    if (line !== null) {
      attrs.push(`w:line="${line}"`);
    }
    if (attrs.length > 0) {
      parts.push(`<w:spacing ${attrs.join(" ")}/>`);
    }
  }

  if (
    style?.indentLeft !== undefined ||
    style?.indentRight !== undefined ||
    style?.indentFirstLine !== undefined
  ) {
    const attrs: string[] = [];
    const left = toTwips(style.indentLeft);
    const right = toTwips(style.indentRight);
    const firstLine = toTwips(style.indentFirstLine);
    if (left !== null) {
      attrs.push(`w:left="${left}"`);
    }
    if (right !== null) {
      attrs.push(`w:right="${right}"`);
    }
    if (firstLine !== null) {
      attrs.push(`w:firstLine="${firstLine}"`);
    }
    if (attrs.length > 0) {
      parts.push(`<w:ind ${attrs.join(" ")}/>`);
    }
  }

  if (style?.pageBreakBefore) {
    parts.push("<w:pageBreakBefore/>");
  }
  if (style?.keepWithNext) {
    parts.push("<w:keepNext/>");
  }

  const numbering = numberingInfo.get(paragraph.id);
  if (numbering) {
    parts.push(
      `<w:numPr><w:ilvl w:val="${numbering.level}"/><w:numId w:val="${numbering.numId}"/></w:numPr>`,
    );
  }

  return parts.length > 0 ? `<w:pPr>${parts.join("")}</w:pPr>` : "";
}

function serializeTable(table: Editor2TableNode): string {
  const rowsXml = table.rows
    .map((row) => {
      const cellsXml = row.cells
        .map((cell) => {
          const paragraphs = cell.blocks.length > 0 ? cell.blocks : [{ id: "", type: "paragraph" as const, runs: [{ id: "", text: "" }] }];
          const paragraphsXml = paragraphs
            .map((paragraph) => {
              const runs = paragraph.runs.length > 0 ? paragraph.runs : [{ id: "", text: "" }];
              return `<w:p>${serializeParagraphProperties(paragraph, new Map())}${runs
                .map((run) => serializeRun(run))
                .join("")}</w:p>`;
            })
            .join("");
          return `<w:tc>${paragraphsXml}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cellsXml}</w:tr>`;
    })
    .join("");

  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${rowsXml}</w:tbl>`;
}

function buildNumberingMaps(document: Editor2Document): {
  numberingInfo: Map<string, { numId: number; level: number }>;
  definitions: Array<{ kind: Editor2ParagraphListStyle["kind"]; level: number; abstractNumId: number; numId: number }>;
} {
  const numberingInfo = new Map<string, { numId: number; level: number }>();
  const definitionMap = new Map<string, { abstractNumId: number; numId: number }>();
  const definitions: Array<{ kind: Editor2ParagraphListStyle["kind"]; level: number; abstractNumId: number; numId: number }> = [];
  let nextAbstractNumId = 1;
  let nextNumId = 1;

  for (const paragraph of document.blocks) {
    if (paragraph.type !== "paragraph" || !paragraph.list) {
      continue;
    }

    const level = Math.max(0, paragraph.list.level ?? 0);
    const key = `${paragraph.list.kind}:${level}`;
    let definition = definitionMap.get(key);
    if (!definition) {
      definition = {
        abstractNumId: nextAbstractNumId,
        numId: nextNumId,
      };
      nextAbstractNumId += 1;
      nextNumId += 1;
      definitionMap.set(key, definition);
      definitions.push({
        kind: paragraph.list.kind,
        level,
        abstractNumId: definition.abstractNumId,
        numId: definition.numId,
      });
    }

    numberingInfo.set(paragraph.id, {
      numId: definition.numId,
      level,
    });
  }

  return { numberingInfo, definitions };
}

function buildNumberingXml(
  definitions: Array<{ kind: Editor2ParagraphListStyle["kind"]; level: number; abstractNumId: number; numId: number }>,
): string {
  const abstractNums = definitions
    .map(({ kind, level, abstractNumId }) => {
      const format = kind === "bullet" ? "bullet" : "decimal";
      const levelText = kind === "bullet" ? "•" : `%${level + 1}.`;
      const runFonts =
        kind === "bullet" ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr>' : "";

      return `<w:abstractNum w:abstractNumId="${abstractNumId}"><w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${escapeXml(levelText)}"/><w:lvlJc w:val="left"/>${runFonts}</w:lvl></w:abstractNum>`;
    })
    .join("");

  const nums = definitions
    .map(
      ({ abstractNumId, numId }) =>
        `<w:num w:numId="${numId}"><w:abstractNumId w:val="${abstractNumId}"/></w:num>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${WORD_NS}">${abstractNums}${nums}</w:numbering>`;
}

function buildDocumentXml(
  document: Editor2Document,
  numberingInfo: Map<string, { numId: number; level: number }>,
): string {
  const blocksXml = document.blocks
    .map((block) => {
      if (block.type === "table") {
        return serializeTable(block);
      }
      const runs = block.runs.length > 0 ? block.runs : [{ id: "", text: "" }];
      return `<w:p>${serializeParagraphProperties(block, numberingInfo)}${runs
        .map((run) => serializeRun(run))
        .join("")}</w:p>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${WORD_NS}"><w:body>${blocksXml}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

function buildContentTypesXml(hasNumbering: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${
    hasNumbering
      ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
      : ""
  }</Types>`;
}

function buildRootRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`;
}

function buildDocumentRelationshipsXml(hasNumbering: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}">${
    hasNumbering
      ? `<Relationship Id="rId1" Type="${OFFICE_REL_NS}/numbering" Target="numbering.xml"/>`
      : ""
  }</Relationships>`;
}

export async function exportEditor2DocumentToDocx(document: Editor2Document): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const { numberingInfo, definitions } = buildNumberingMaps(document);
  const hasNumbering = definitions.length > 0;

  zip.file("[Content_Types].xml", buildContentTypesXml(hasNumbering));
  zip.file("_rels/.rels", buildRootRelationshipsXml());
  zip.file("word/document.xml", buildDocumentXml(document, numberingInfo));

  if (hasNumbering) {
    zip.file("word/numbering.xml", buildNumberingXml(definitions));
    zip.file("word/_rels/document.xml.rels", buildDocumentRelationshipsXml(true));
  }

  return zip.generateAsync({ type: "arraybuffer" });
}

export async function exportEditor2DocumentToDocxBlob(document: Editor2Document): Promise<Blob> {
  const buffer = await exportEditor2DocumentToDocx(document);
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
