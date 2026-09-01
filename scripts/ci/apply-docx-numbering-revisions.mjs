import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(content, before, after, path) {
  const index = content.indexOf(before);
  if (index < 0) throw new Error(`Anchor not found in ${path}: ${before.slice(0, 100)}`);
  if (content.indexOf(before, index + before.length) >= 0) throw new Error(`Anchor not unique in ${path}`);
  return content.slice(0, index) + after + content.slice(index + before.length);
}
function patch(path, patches) {
  let content = read(path);
  for (const [before, after] of patches) content = replaceOnce(content, before, after, path);
  write(path, content);
}

patch("src/core/model/types/primitives.ts", [
  [
    `export interface EditorRevisionMetadata {\n  id: string;\n  author: string;\n  date: number;\n}\n\nexport interface EditorStructuralRevision`,
    `export interface EditorRevisionMetadata {\n  id: string;\n  author: string;\n  date: number;\n}\n\n/** Previous paragraph numbering cache from \`w:numberingChange\`. */\nexport interface EditorNumberingRevision extends EditorRevisionMetadata {\n  original?: string;\n}\n\nexport interface EditorStructuralRevision`,
  ],
]);

patch("src/core/model/types/nodes.ts", [
  [
    `  EditorParagraphListStyle,\n  EditorRevision,`,
    `  EditorParagraphListStyle,\n  EditorNumberingRevision,\n  EditorRevision,`,
  ],
  [
    `  list?: EditorParagraphListStyle;\n  /** Drop cap that body text in this paragraph wraps around, when present. */`,
    `  list?: EditorParagraphListStyle;\n  /** Tracked previous numbering metadata from \`w:numPr/w:numberingChange\`. */\n  numberingRevision?: EditorNumberingRevision;\n  /** Drop cap that body text in this paragraph wraps around, when present. */`,
  ],
]);

patch("src/core/model/index.ts", [
  [
    `  EditorRevisionMetadata,\n  EditorStructuralRevision,`,
    `  EditorRevisionMetadata,\n  EditorNumberingRevision,\n  EditorStructuralRevision,`,
  ],
]);

patch("src/import/docx/numbering.ts", [
  [
    `import type { EditorParagraphListStyle } from "@/core/model.js";`,
    `import type {\n  EditorNumberingRevision,\n  EditorParagraphListStyle,\n} from "@/core/model.js";`,
  ],
  [
    `import { setEditorListOoxmlNumberingMetadata } from "@/ooxml/word/numberingMetadata.js";`,
    `import { setEditorListOoxmlNumberingMetadata } from "@/ooxml/word/numberingMetadata.js";\nimport { parseRevisionMetadata } from "./revisionMetadata.js";`,
  ],
  [
    `export function parseParagraphList(\n  paragraphProperties: XmlElement | null,`,
    `export function parseParagraphNumberingRevision(\n  paragraphProperties: XmlElement | null,\n): EditorNumberingRevision | undefined {\n  if (!paragraphProperties) return undefined;\n  const numPr = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "numPr");\n  const change = getFirstChildByTagNameNS(numPr, WORD_NS, "numberingChange");\n  const metadata = parseRevisionMetadata(change);\n  if (!metadata) return undefined;\n  const original = getAttributeValue(change, "original") ?? undefined;\n  return {\n    ...metadata,\n    ...(original !== undefined ? { original } : {}),\n  };\n}\n\nexport function parseParagraphList(\n  paragraphProperties: XmlElement | null,`,
  ],
]);

patch("src/import/docx/paragraphs.ts", [
  [
    `import { type NumberingMaps, parseParagraphList } from "./numbering.js";`,
    `import {\n  type NumberingMaps,\n  parseParagraphList,\n  parseParagraphNumberingRevision,\n} from "./numbering.js";`,
  ],
  [
    `  list: EditorParagraphListStyle | undefined,\n  markRunStyle?: EditorTextStyle,`,
    `  list: EditorParagraphListStyle | undefined,\n  numberingRevision: EditorParagraphNode["numberingRevision"],\n  markRunStyle?: EditorTextStyle,`,
  ],
  [
    `  paragraph.list = list ? { ...list } : undefined;\n\n  if (source?.runXml?.length`,
    `  paragraph.list = list ? { ...list } : undefined;\n  paragraph.numberingRevision = numberingRevision\n    ? { ...numberingRevision }\n    : undefined;\n\n  if (source?.runXml?.length`,
  ],
  [
    `  const listResult = parseParagraphList(paragraphProperties, numberingMaps);\n  const list = listResult?.list;`,
    `  const listResult = parseParagraphList(paragraphProperties, numberingMaps);\n  const list = listResult?.list;\n  const numberingRevision =\n    parseParagraphNumberingRevision(paragraphProperties);`,
  ],
  [
    `          list,\n          markRunStyle,\n          source,`,
    `          list,\n          numberingRevision,\n          markRunStyle,\n          source,`,
  ],
  [
    `      createImportedParagraph(segment, style, list, markRunStyle),`,
    `      createImportedParagraph(\n        segment,\n        style,\n        list,\n        numberingRevision,\n        markRunStyle,\n      ),`,
  ],
]);

patch("src/core/document/clone.ts", [
  [
    `    list: paragraph.list ? { ...paragraph.list } : undefined,\n  };`,
    `    list: paragraph.list ? { ...paragraph.list } : undefined,\n    numberingRevision: paragraph.numberingRevision\n      ? { ...paragraph.numberingRevision }\n      : undefined,\n  };`,
  ],
]);

patch("src/export/docx/text/paragraphPropertiesXml.ts", [
  [
    `  const numbering = numberingInfo.get(paragraph.id);\n  if (numbering) {\n    parts.push(\n      \`<w:numPr><w:ilvl w:val="\${numbering.level}"/><w:numId w:val="\${numbering.numId}"/></w:numPr>\`,\n    );\n  }`,
    `  const numbering = numberingInfo.get(paragraph.id);\n  const numberingChange = paragraph.numberingRevision\n    ? \`<w:numberingChange \${serializeRevisionMetadataAttributes(\n        paragraph.numberingRevision,\n      )}\${\n        paragraph.numberingRevision.original !== undefined\n          ? \` w:original="\${escapeXml(paragraph.numberingRevision.original)}"\`\n          : ""\n      }/>\`\n    : "";\n  if (numbering || numberingChange) {\n    const currentNumbering = numbering\n      ? \`<w:ilvl w:val="\${numbering.level}"/><w:numId w:val="\${numbering.numId}"/>\`\n      : "";\n    parts.push(\`<w:numPr>\${currentNumbering}\${numberingChange}</w:numPr>\`);\n  }`,
  ],
]);

write(
  "tests/vitest/__tests__/import/docxImport.numberingRevisions.test.ts",
  `import { describe, expect, it } from "vitest";\nimport JSZip from "jszip";\nimport type { EditorParagraphNode } from "@/core/model.js";\nimport { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";\nimport { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";\n\nconst WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";\n\nasync function importNumberingRevisionDocument() {\n  const zip = new JSZip();\n  zip.file(\n    "word/numbering.xml",\n    \`<w:numbering xmlns:w="\${WORD_NS}">\n      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>\n      <w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num>\n    </w:numbering>\`,\n  );\n  zip.file(\n    "word/document.xml",\n    \`<w:document xmlns:w="\${WORD_NS}"><w:body>\n      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/><w:numberingChange w:id="40" w:author="List Author" w:date="2026-02-05T06:07:08Z" w:original="1."/></w:numPr></w:pPr><w:r><w:t>Listed</w:t></w:r></w:p>\n      <w:p><w:pPr><w:numPr><w:numberingChange w:id="41" w:author="Removal Author" w:date="2026-02-06T06:07:08Z" w:original="2."/></w:numPr></w:pPr><w:r><w:t>Unlisted now</w:t></w:r></w:p>\n      <w:sectPr/>\n    </w:body></w:document>\`,\n  );\n  return importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));\n}\n\ndescribe("DOCX paragraph numbering revisions", () => {\n  it("imports numberingChange independently from the current list", async () => {\n    const document = await importNumberingRevisionDocument();\n    const first = document.sections![0]!.blocks[0] as EditorParagraphNode;\n    const second = document.sections![0]!.blocks[1] as EditorParagraphNode;\n\n    expect(first.list?.instanceId).toBe("5");\n    expect(first.numberingRevision).toMatchObject({\n      id: "40", author: "List Author", original: "1."\n    });\n    expect(first.numberingRevision?.date).toBe(Date.parse("2026-02-05T06:07:08Z"));\n\n    expect(second.list).toBeUndefined();\n    expect(second.numberingRevision).toMatchObject({\n      id: "41", author: "Removal Author", original: "2."\n    });\n  });\n\n  it("round-trips numberingChange without inventing a list for removed numbering", async () => {\n    const document = await importNumberingRevisionDocument();\n    const second = document.sections![0]!.blocks[1] as EditorParagraphNode;\n    second.runs[0]!.text = "Changed text";\n    second.numberingRevision!.original = "2.&old";\n\n    const exported = await exportEditorDocumentToDocx(document);\n    const zip = await JSZip.loadAsync(exported);\n    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";\n\n    expect(xml).toMatch(/<w:numPr><w:numberingChange\\b[^>]*w:id="41"[^>]*w:author="Removal Author"[^>]*w:original="2\\.&amp;old"\\/><\\/w:numPr>/);\n    expect(xml).toContain("<w:t>Changed text</w:t>");\n\n    const reimported = await importDocxToEditorDocument(exported);\n    const reimportedSecond = reimported.sections![0]!.blocks[1] as EditorParagraphNode;\n    expect(reimportedSecond.list).toBeUndefined();\n    expect(reimportedSecond.numberingRevision).toMatchObject({\n      id: "41", original: "2.&old"\n    });\n  });\n});\n`,
);

console.log("Applied DOCX numberingChange semantic support patch.");
