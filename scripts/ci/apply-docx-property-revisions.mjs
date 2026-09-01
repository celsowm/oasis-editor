import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, before, after, path) {
  const index = content.indexOf(before);
  if (index < 0) {
    throw new Error(`Patch anchor not found in ${path}: ${before.slice(0, 120)}`);
  }
  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Patch anchor is not unique in ${path}: ${before.slice(0, 120)}`);
  }
  return content.slice(0, index) + after + content.slice(index + before.length);
}

function patch(path, patches) {
  let content = read(path);
  for (const [before, after] of patches) {
    content = replaceOnce(content, before, after, path);
  }
  write(path, content);
}

patch("src/core/model/types/styles.ts", [
  [
    "  language?: EditorTextLanguage | null;\n  link?: string | null;\n}",
    "  language?: EditorTextLanguage | null;\n  link?: string | null;\n  /** Previous direct run properties from `w:rPrChange`. */\n  propertyRevision?: EditorPropertyRevision<EditorTextStyle>;\n}",
  ],
  [
    "  framePrXml?: string | null;\n}",
    "  framePrXml?: string | null;\n  /** Previous paragraph properties from `w:pPrChange`. */\n  propertyRevision?: EditorPropertyRevision<EditorParagraphStyle>;\n}",
  ],
]);

write(
  "src/import/docx/revisionMetadata.ts",
  `import type { Element as XmlElement } from "@xmldom/xmldom";\nimport type { EditorRevisionMetadata } from "@/core/model.js";\nimport { getAttributeValue } from "./xmlHelpers.js";\n\n/** Parses the shared w:id/w:author/w:date payload used by OOXML property changes. */\nexport function parseRevisionMetadata(\n  element: XmlElement | null | undefined,\n): EditorRevisionMetadata | undefined {\n  if (!element) return undefined;\n  const id = getAttributeValue(element, "id");\n  const author = getAttributeValue(element, "author");\n  const rawDate = getAttributeValue(element, "date");\n  if (!id || !author || !rawDate) return undefined;\n  const date = Date.parse(rawDate);\n  if (!Number.isFinite(date)) return undefined;\n  return { id, author, date };\n}\n`,
);

patch("src/import/docx/runStyle.ts", [
  [
    `import {\n  stripUndefined,\n  emptyOrUndefined,\n  parseShdFill,\n} from "./styleUtils.js";`,
    `import {\n  stripUndefined,\n  emptyOrUndefined,\n  parseShdFill,\n} from "./styleUtils.js";\nimport { parseRevisionMetadata } from "./revisionMetadata.js";`,
  ],
  [
    `    language: dd(effective.language, defaultEffective.language),\n    link: dd(effective.link, defaultEffective.link),\n  });`,
    `    language: dd(effective.language, defaultEffective.language),\n    link: dd(effective.link, defaultEffective.link),\n    propertyRevision: style.propertyRevision\n      ? {\n          ...style.propertyRevision,\n          previous:\n            normalizeImportedRunStyle(\n              style.propertyRevision.previous,\n              paragraphStyleId,\n            ) ?? {},\n        }\n      : undefined,\n  });`,
  ],
  [
    `  return emptyOrUndefined(styles);\n}`,
    `  const propertyChange = getFirstChildByTagNameNS(\n    runProperties,\n    WORD_NS,\n    "rPrChange",\n  );\n  const revisionMetadata = parseRevisionMetadata(propertyChange);\n  const previousProperties = getFirstChildByTagNameNS(\n    propertyChange,\n    WORD_NS,\n    "rPr",\n  );\n  if (revisionMetadata && previousProperties) {\n    styles.propertyRevision = {\n      ...revisionMetadata,\n      type: "property",\n      previous: parseRunStyle(previousProperties, theme) ?? {},\n    };\n  }\n\n  return emptyOrUndefined(styles);\n}`,
  ],
]);

patch("src/import/docx/paragraphStyle.ts", [
  [
    `import { type ThemeColorMap } from "./themeColors.js";`,
    `import { type ThemeColorMap } from "./themeColors.js";\nimport { parseRevisionMetadata } from "./revisionMetadata.js";`,
  ],
  [
    `    borderBar: style.borderBar ?? undefined,\n    framePrXml: style.framePrXml ?? undefined,\n  });`,
    `    borderBar: style.borderBar ?? undefined,\n    framePrXml: style.framePrXml ?? undefined,\n    propertyRevision: style.propertyRevision\n      ? {\n          ...style.propertyRevision,\n          previous:\n            normalizeImportedParagraphStyle(style.propertyRevision.previous) ?? {},\n        }\n      : undefined,\n  });`,
  ],
  [
    `  return emptyOrUndefined(style);\n}`,
    `  const propertyChange = getFirstChildByTagNameNS(\n    paragraphProperties,\n    WORD_NS,\n    "pPrChange",\n  );\n  const revisionMetadata = parseRevisionMetadata(propertyChange);\n  const previousProperties = getFirstChildByTagNameNS(\n    propertyChange,\n    WORD_NS,\n    "pPr",\n  );\n  if (revisionMetadata && previousProperties) {\n    style.propertyRevision = {\n      ...revisionMetadata,\n      type: "property",\n      previous: parseParagraphStyle(previousProperties, colors) ?? {},\n    };\n  }\n\n  return emptyOrUndefined(style);\n}`,
  ],
]);

patch("src/export/docx/text/revisionXml.ts", [
  [
    `import type { EditorRevision, EditorRunBase } from "@/core/model.js";`,
    `import type {\n  EditorRevision,\n  EditorRevisionMetadata,\n  EditorRunBase,\n} from "@/core/model.js";`,
  ],
  [
    `function revisionElementName(revision: EditorRevision): string {`,
    `export function serializeRevisionMetadataAttributes(\n  revision: EditorRevisionMetadata,\n): string {\n  const date = Number.isFinite(revision.date)\n    ? new Date(revision.date).toISOString()\n    : new Date(0).toISOString();\n  return (\n    \`w:id="\${revisionNumericId(revision.id)}" \` +\n    \`w:author="\${escapeXml(revision.author)}" \` +\n    \`w:date="\${date}"\`\n  );\n}\n\nfunction revisionElementName(revision: EditorRevision): string {`,
  ],
  [
    `  const date = Number.isFinite(revision.date)\n    ? new Date(revision.date).toISOString()\n    : new Date(0).toISOString();\n  const attributes =\n    \`w:id="\${revisionNumericId(revision.id)}" \` +\n    \`w:author="\${escapeXml(revision.author)}" \` +\n    \`w:date="\${date}"\`;`,
    `  const attributes = serializeRevisionMetadataAttributes(revision);`,
  ],
]);

patch("src/export/docx/text/runPropertiesXml.ts", [
  [
    `import { parseHexColorToRgb255 } from "@/core/color.js";`,
    `import { parseHexColorToRgb255 } from "@/core/color.js";\nimport { serializeRevisionMetadataAttributes } from "./revisionXml.js";`,
  ],
  [
    `export function serializeRunProperties(styles?: EditorTextStyle): string {`,
    `function serializeRunPropertyRevision(\n  revision: NonNullable<EditorTextStyle["propertyRevision"]>,\n): string {\n  const { propertyRevision: _nestedRevision, styleId, ...previous } =\n    revision.previous;\n  const serialized = serializeRunProperties(previous);\n  const inner = serialized\n    ? serialized.slice("<w:rPr>".length, -"</w:rPr>".length)\n    : "";\n  const styleXml = styleId\n    ? \`<w:rStyle w:val="\${escapeXml(styleId)}"/>\`\n    : "";\n  return (\n    \`<w:rPrChange \${serializeRevisionMetadataAttributes(revision)}>\` +\n    \`<w:rPr>\${styleXml}\${inner}</w:rPr></w:rPrChange>\`\n  );\n}\n\nexport function serializeRunProperties(styles?: EditorTextStyle): string {`,
  ],
  [
    `  if (styles.language) {\n    const attrs: string[] = [];`,
    `  if (styles.language) {\n    const attrs: string[] = [];`,
  ],
  [
    `  return parts.length > 0 ? \`<w:rPr>\${parts.join("")}</w:rPr>\` : "";`,
    `  if (styles.propertyRevision) {\n    parts.push(serializeRunPropertyRevision(styles.propertyRevision));\n  }\n\n  return parts.length > 0 ? \`<w:rPr>\${parts.join("")}</w:rPr>\` : "";`,
  ],
]);

patch("src/export/docx/text/paragraphPropertiesXml.ts", [
  [
    `import { TABLE_CONDITIONAL_FLAG_ATTRIBUTES } from "@/core/docxTableMaps.js";`,
    `import { TABLE_CONDITIONAL_FLAG_ATTRIBUTES } from "@/core/docxTableMaps.js";\nimport { serializeRevisionMetadataAttributes } from "./revisionXml.js";`,
  ],
  [
    `/**\n * Serializes a raw \`EditorParagraphStyle\` into the contents of a \`w:pPr\``,
    `function serializeParagraphPropertyRevision(\n  revision: NonNullable<EditorParagraphStyle["propertyRevision"]>,\n): string {\n  const { propertyRevision: _nestedRevision, styleId, ...previous } =\n    revision.previous;\n  const serialized = serializeParagraphStyleXml(previous);\n  const inner = serialized\n    ? serialized.slice("<w:pPr>".length, -"</w:pPr>".length)\n    : "";\n  const styleXml = styleId\n    ? \`<w:pStyle w:val="\${escapeXml(styleId)}"/>\`\n    : "";\n  return (\n    \`<w:pPrChange \${serializeRevisionMetadataAttributes(revision)}>\` +\n    \`<w:pPr>\${styleXml}\${inner}</w:pPr></w:pPrChange>\`\n  );\n}\n\n/**\n * Serializes a raw \`EditorParagraphStyle\` into the contents of a \`w:pPr\``,
  ],
  [
    `  parts.push(...serializeParagraphDecorations(style));\n\n  return parts.length > 0 ? \`<w:pPr>\${parts.join("")}</w:pPr>\` : "";`,
    `  parts.push(...serializeParagraphDecorations(style));\n\n  if (style.propertyRevision) {\n    parts.push(serializeParagraphPropertyRevision(style.propertyRevision));\n  }\n\n  return parts.length > 0 ? \`<w:pPr>\${parts.join("")}</w:pPr>\` : "";`,
  ],
  [
    `  if (numbering) {\n    parts.push(\n      \`<w:numPr><w:ilvl w:val="\${numbering.level}"/><w:numId w:val="\${numbering.numId}"/></w:numPr>\`,\n    );\n  }\n\n  return parts.length > 0 ? \`<w:pPr>\${parts.join("")}</w:pPr>\` : "";`,
    `  if (numbering) {\n    parts.push(\n      \`<w:numPr><w:ilvl w:val="\${numbering.level}"/><w:numId w:val="\${numbering.numId}"/></w:numPr>\`,\n    );\n  }\n\n  if (paragraph.style?.propertyRevision) {\n    parts.push(\n      serializeParagraphPropertyRevision(paragraph.style.propertyRevision),\n    );\n  }\n\n  return parts.length > 0 ? \`<w:pPr>\${parts.join("")}</w:pPr>\` : "";`,
  ],
]);

patch("src/export/docx/text/styleMaterialization.ts", [
  [
    `    framePrXml: effective.framePrXml,\n  };`,
    `    framePrXml: effective.framePrXml,\n    propertyRevision: paragraph.style?.propertyRevision,\n  };`,
  ],
  [
    `    language: effective.language,\n  };`,
    `    language: effective.language,\n    propertyRevision: run.styles?.propertyRevision,\n  };`,
  ],
]);

patch("src/core/textStyle/textStyleMutations.ts", [
  [
    `export function cloneStyle(\n  style?: EditorTextStyle,\n): EditorTextStyle | undefined {\n  return style ? { ...style } : undefined;\n}`,
    `export function cloneStyle(\n  style?: EditorTextStyle,\n): EditorTextStyle | undefined {\n  if (!style) return undefined;\n  return {\n    ...style,\n    propertyRevision: style.propertyRevision\n      ? {\n          ...style.propertyRevision,\n          previous: cloneStyle(style.propertyRevision.previous) ?? {},\n        }\n      : undefined,\n  };\n}\n\nexport function cloneParagraphStyle(\n  style?: EditorParagraphStyle,\n): EditorParagraphStyle | undefined {\n  if (!style) return undefined;\n  return {\n    ...style,\n    tabs: style.tabs ? style.tabs.map((tab) => ({ ...tab })) : style.tabs,\n    propertyRevision: style.propertyRevision\n      ? {\n          ...style.propertyRevision,\n          previous: cloneParagraphStyle(style.propertyRevision.previous) ?? {},\n        }\n      : undefined,\n  };\n}`,
  ],
]);

patch("src/core/document/clone.ts", [
  [
    `import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";`,
    `import {\n  cloneParagraphStyle,\n  cloneStyle,\n} from "@/core/textStyle/textStyleMutations.js";`,
  ],
  [
    `    style: paragraph.style ? { ...paragraph.style } : undefined,`,
    `    style: cloneParagraphStyle(paragraph.style),`,
  ],
]);

write(
  "tests/vitest/__tests__/import/docxImport.propertyRevisions.test.ts",
  `import { describe, expect, it } from "vitest";\nimport JSZip from "jszip";\nimport type { EditorParagraphNode } from "@/core/model.js";\nimport { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";\nimport { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";\n\nconst WORD_NS =\n  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";\n\nasync function importPropertyRevisionDocument() {\n  const zip = new JSZip();\n  zip.file(\n    "word/document.xml",\n    \`<w:document xmlns:w="\${WORD_NS}"><w:body>\n      <w:p>\n        <w:pPr>\n          <w:jc w:val="center"/>\n          <w:pPrChange w:id="21" w:author="Paragraph Author" w:date="2026-02-03T04:05:06Z">\n            <w:pPr><w:jc w:val="right"/><w:keepNext/></w:pPr>\n          </w:pPrChange>\n        </w:pPr>\n        <w:r>\n          <w:rPr>\n            <w:i/>\n            <w:rPrChange w:id="20" w:author="Run Author" w:date="2026-02-02T03:04:05Z">\n              <w:rPr><w:b/><w:color w:val="FF0000"/></w:rPr>\n            </w:rPrChange>\n          </w:rPr>\n          <w:t>Original</w:t>\n        </w:r>\n      </w:p>\n      <w:sectPr/>\n    </w:body></w:document>\`,\n  );\n  return importDocxToEditorDocument(\n    await zip.generateAsync({ type: "arraybuffer" }),\n  );\n}\n\ndescribe("DOCX run and paragraph property revisions", () => {\n  it("imports current properties and their previous tracked snapshots", async () => {\n    const document = await importPropertyRevisionDocument();\n    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;\n    const run = paragraph.runs[0]!;\n\n    expect(run.styles?.italic).toBe(true);\n    expect(run.styles?.propertyRevision).toMatchObject({\n      id: "20",\n      type: "property",\n      author: "Run Author",\n      previous: { bold: true },\n    });\n    expect(run.styles?.propertyRevision?.date).toBe(\n      Date.parse("2026-02-02T03:04:05Z"),\n    );\n\n    expect(paragraph.style?.align).toBe("center");\n    expect(paragraph.style?.propertyRevision).toMatchObject({\n      id: "21",\n      type: "property",\n      author: "Paragraph Author",\n      previous: { align: "right", keepWithNext: true },\n    });\n  });\n\n  it("rebuilds edited content with canonical rPrChange and pPrChange", async () => {\n    const document = await importPropertyRevisionDocument();\n    const paragraph = document.sections![0]!.blocks[0] as EditorParagraphNode;\n    const run = paragraph.runs[0]!;\n\n    run.text = "Changed";\n    run.styles = { ...run.styles, italic: undefined, underline: true };\n    paragraph.style = { ...paragraph.style, align: "left" };\n\n    const exported = await exportEditorDocumentToDocx(document);\n    const zip = await JSZip.loadAsync(exported);\n    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";\n\n    expect(xml).toContain("<w:t>Changed</w:t>");\n    expect(xml).toMatch(\n      /<w:rPrChange\\b[^>]*w:id="20"[^>]*w:author="Run Author"[^>]*>[\\s\\S]*?<w:rPr>[\\s\\S]*?<w:b\\/>[\\s\\S]*?<w:color w:val="FF0000"\\/>[\\s\\S]*?<\\/w:rPr>[\\s\\S]*?<\\/w:rPrChange>/,\n    );\n    expect(xml).toMatch(\n      /<w:pPrChange\\b[^>]*w:id="21"[^>]*w:author="Paragraph Author"[^>]*>[\\s\\S]*?<w:pPr>[\\s\\S]*?<w:jc w:val="right"\\/>[\\s\\S]*?<w:keepNext\\/>[\\s\\S]*?<\\/w:pPr>[\\s\\S]*?<\\/w:pPrChange>/,\n    );\n    expect(xml.match(/<w:rPrChange\\b/g)).toHaveLength(1);\n    expect(xml.match(/<w:pPrChange\\b/g)).toHaveLength(1);\n\n    const reimported = await importDocxToEditorDocument(exported);\n    const reimportedParagraph = reimported.sections![0]!.blocks[0] as EditorParagraphNode;\n    expect(reimportedParagraph.runs[0]!.styles?.propertyRevision).toMatchObject({\n      id: "20",\n      previous: { bold: true },\n    });\n    expect(reimportedParagraph.style?.propertyRevision).toMatchObject({\n      id: "21",\n      previous: { align: "right", keepWithNext: true },\n    });\n  });\n});\n`,
);

console.log("Applied DOCX rPrChange/pPrChange semantic support patch.");
