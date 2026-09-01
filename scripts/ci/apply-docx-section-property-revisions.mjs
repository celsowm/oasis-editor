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

patch("src/core/model/types/document.ts", [
  [
    `  EditorFootnoteRestart,\n} from "./primitives.js";`,
    `  EditorFootnoteRestart,\n  EditorPropertyRevision,\n} from "./primitives.js";`,
  ],
  [
    `export type EditorSectionVerticalAlign = "top" | "center" | "both" | "bottom";\n\nexport interface EditorSection {`,
    `export type EditorSectionVerticalAlign = "top" | "center" | "both" | "bottom";\n\nexport type EditorSectionBreakType =\n  | "nextPage"\n  | "continuous"\n  | "evenPage"\n  | "oddPage"\n  | "nextColumn";\n\n/** Previous semantic section properties stored by \`w:sectPrChange\`. */\nexport interface EditorSectionPropertiesSnapshot {\n  pageSettings: EditorPageSettings;\n  pageBorder?: EditorPageBorder | null;\n  pageNumbering?: EditorPageNumbering;\n  verticalAlignment?: EditorSectionVerticalAlign;\n  bidi?: boolean;\n  /** Previous \`w:type\`; semantically this controls how the following section begins. */\n  nextBreakType?: EditorSectionBreakType;\n}\n\nexport interface EditorSection {`,
  ],
  [
    `  breakType?: "nextPage" | "continuous" | "evenPage" | "oddPage" | "nextColumn";`,
    `  breakType?: EditorSectionBreakType;`,
  ],
  [
    `  /** \`w:bidi\` — right-to-left section layout. Round-trip only. */\n  bidi?: boolean;\n}`,
    `  /** \`w:bidi\` — right-to-left section layout. Round-trip only. */\n  bidi?: boolean;\n  /** Previous section-property snapshot from \`w:sectPrChange\`. */\n  propertyRevision?: EditorPropertyRevision<EditorSectionPropertiesSnapshot>;\n}`,
  ],
]);

patch("src/import/docx/sectionProperties.ts", [
  [
    `  EditorSectionVerticalAlign,\n} from "@/core/model.js";`,
    `  EditorSectionVerticalAlign,\n  EditorSectionPropertiesSnapshot,\n  EditorPropertyRevision,\n} from "@/core/model.js";`,
  ],
  [
    `import type { DocxSettings } from "./settings.js";`,
    `import type { DocxSettings } from "./settings.js";\nimport { parseRevisionMetadata } from "./revisionMetadata.js";`,
  ],
  [
    `  /** \`w:bidi\` — right-to-left section layout. Round-trip only. */\n  bidi?: boolean;\n}`,
    `  /** \`w:bidi\` — right-to-left section layout. Round-trip only. */\n  bidi?: boolean;\n  propertyRevision?: EditorPropertyRevision<EditorSectionPropertiesSnapshot>;\n}`,
  ],
  [
    `function isXmlTrue(value: string | null | undefined): boolean {`,
    `const DEFAULT_SECTION_PAGE_SETTINGS: EditorPageSettings = {\n  width: 816,\n  height: 1056,\n  orientation: "portrait",\n  margins: {\n    top: 96,\n    right: 96,\n    bottom: 96,\n    left: 96,\n    header: 48,\n    footer: 48,\n    gutter: 0,\n  },\n};\n\nfunction sectionPropertiesSnapshot(\n  properties: SectionProperties,\n  fallbackPageSettings?: EditorPageSettings,\n): EditorSectionPropertiesSnapshot {\n  return {\n    pageSettings:\n      properties.pageSettings ?? fallbackPageSettings ?? DEFAULT_SECTION_PAGE_SETTINGS,\n    ...(properties.pageBorder ? { pageBorder: properties.pageBorder } : {}),\n    ...(properties.pageNumbering\n      ? { pageNumbering: properties.pageNumbering }\n      : {}),\n    ...(properties.verticalAlignment\n      ? { verticalAlignment: properties.verticalAlignment }\n      : {}),\n    ...(properties.bidi !== undefined ? { bidi: properties.bidi } : {}),\n    ...(properties.breakType ? { nextBreakType: properties.breakType } : {}),\n  };\n}\n\nfunction isXmlTrue(value: string | null | undefined): boolean {`,
  ],
  [
    `  // w:bidi — right-to-left section layout (on/off element).\n  const bidi = parseOnOffProperty(sectPr, "bidi");\n\n  return {`,
    `  // w:bidi — right-to-left section layout (on/off element).\n  const bidi = parseOnOffProperty(sectPr, "bidi");\n\n  const propertyChange = getFirstChildByTagNameNS(\n    sectPr,\n    WORD_NS,\n    "sectPrChange",\n  );\n  const revisionMetadata = parseRevisionMetadata(propertyChange);\n  const previousSectPr = getFirstChildByTagNameNS(\n    propertyChange,\n    WORD_NS,\n    "sectPr",\n  );\n  const propertyRevision =\n    revisionMetadata && previousSectPr\n      ? {\n          ...revisionMetadata,\n          type: "property" as const,\n          previous: sectionPropertiesSnapshot(\n            parseSectionProperties(previousSectPr),\n            pageSettings,\n          ),\n        }\n      : undefined;\n\n  return {`,
  ],
  [
    `    verticalAlignment,\n    bidi,\n  };`,
    `    verticalAlignment,\n    bidi,\n    propertyRevision,\n  };`,
  ],
]);

patch("src/import/docx/importDocxToEditorDocument.ts", [
  [
    `    const bidi = props.bidi;\n\n    sections.push({`,
    `    const bidi = props.bidi;\n    const propertyRevision = props.propertyRevision\n      ? {\n          ...props.propertyRevision,\n          previous: {\n            ...props.propertyRevision.previous,\n            pageSettings: normalizePageSettings(\n              props.propertyRevision.previous.pageSettings,\n            ),\n          },\n        }\n      : undefined;\n\n    sections.push({`,
  ],
  [
    `      ...(bidi ? { bidi } : {}),\n    });`,
    `      ...(bidi ? { bidi } : {}),\n      ...(propertyRevision ? { propertyRevision } : {}),\n    });`,
  ],
]);

patch("src/export/docx/docxDocumentXml.ts", [
  [
    `  EditorSection,\n} from "@/core/model.js";`,
    `  EditorSection,\n  EditorSectionPropertiesSnapshot,\n} from "@/core/model.js";`,
  ],
  [
    `import { serializeBlocksXml } from "./textXml.js";`,
    `import { serializeBlocksXml } from "./textXml.js";\nimport { serializeRevisionMetadataAttributes } from "./text/revisionXml.js";`,
  ],
  [
    `function serializeSectionPropertiesWithReferences(\n  pageSettings: EditorPageSettings,`,
    `function sectionFromSnapshot(\n  snapshot: EditorSectionPropertiesSnapshot,\n): EditorSection {\n  return {\n    id: "section:revision",\n    blocks: [],\n    pageSettings: snapshot.pageSettings,\n    ...(snapshot.pageBorder !== undefined\n      ? { pageBorder: snapshot.pageBorder }\n      : {}),\n    ...(snapshot.pageNumbering\n      ? { pageNumbering: snapshot.pageNumbering }\n      : {}),\n    ...(snapshot.verticalAlignment\n      ? { verticalAlignment: snapshot.verticalAlignment }\n      : {}),\n    ...(snapshot.bidi !== undefined ? { bidi: snapshot.bidi } : {}),\n  };\n}\n\nfunction serializeSectionPropertiesWithReferences(\n  pageSettings: EditorPageSettings,`,
  ],
  [
    `  const borderXml = border\n    ? \`<w:pgBorders w:offsetFrom="page"><w:top w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/><w:left w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/><w:bottom w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/><w:right w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/></w:pgBorders>\`\n    : "";\n\n  return \`<w:sectPr>\${referencesXml}\${titlePageXml}\${typeXml}<w:pgSz w:w="\${width}" w:h="\${height}"\${orientationAttr}/><w:pgMar w:top="\${pxToTwips(margins.top, 1440)}" w:right="\${pxToTwips(margins.right, 1440)}" w:bottom="\${pxToTwips(margins.bottom, 1440)}" w:left="\${pxToTwips(margins.left, 1440)}" w:header="\${pxToTwips(margins.header, 720)}" w:footer="\${pxToTwips(margins.footer, 720)}" w:gutter="\${pxToTwips(margins.gutter, 0)}"/>\${pgNumTypeXml}\${columnsXml}\${vAlignXml}\${bidiXml}\${borderXml}</w:sectPr>\`;`,
    `  const borderXml = border\n    ? \`<w:pgBorders w:offsetFrom="page"><w:top w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/><w:left w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/><w:bottom w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/><w:right w:val="\${border.style}" w:sz="\${Math.max(1, Math.round(border.width * 8))}" w:space="\${Math.max(0, Math.round(border.distance ?? 0))}" w:color="\${borderColor}"/></w:pgBorders>\`\n    : "";\n\n  const propertyRevisionXml = section.propertyRevision\n    ? \`<w:sectPrChange \${serializeRevisionMetadataAttributes(section.propertyRevision)}>\${serializeSectionPropertiesWithReferences(\n        section.propertyRevision.previous.pageSettings,\n        undefined,\n        sectionFromSnapshot(section.propertyRevision.previous),\n        section.propertyRevision.previous.nextBreakType,\n      )}</w:sectPrChange>\`\n    : "";\n\n  return \`<w:sectPr>\${referencesXml}\${titlePageXml}\${typeXml}<w:pgSz w:w="\${width}" w:h="\${height}"\${orientationAttr}/><w:pgMar w:top="\${pxToTwips(margins.top, 1440)}" w:right="\${pxToTwips(margins.right, 1440)}" w:bottom="\${pxToTwips(margins.bottom, 1440)}" w:left="\${pxToTwips(margins.left, 1440)}" w:header="\${pxToTwips(margins.header, 720)}" w:footer="\${pxToTwips(margins.footer, 720)}" w:gutter="\${pxToTwips(margins.gutter, 0)}"/>\${pgNumTypeXml}\${columnsXml}\${vAlignXml}\${bidiXml}\${borderXml}\${propertyRevisionXml}</w:sectPr>\`;`,
  ],
]);

write(
  "tests/vitest/__tests__/import/docxImport.sectionPropertyRevisions.test.ts",
  `import { describe, expect, it } from "vitest";\nimport JSZip from "jszip";\nimport { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";\nimport { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";\n\nconst WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";\n\nasync function importSectionRevisionDocument() {\n  const zip = new JSZip();\n  zip.file(\n    "word/document.xml",\n    \`<w:document xmlns:w="\${WORD_NS}"><w:body>\n      <w:p><w:r><w:t>Section one</w:t></w:r></w:p>\n      <w:sectPr>\n        <w:type w:val="nextPage"/>\n        <w:pgSz w:w="12240" w:h="15840"/>\n        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>\n        <w:sectPrChange w:id="30" w:author="Section Author" w:date="2026-02-04T05:06:07Z">\n          <w:sectPr>\n            <w:type w:val="continuous"/>\n            <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>\n            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>\n            <w:pgNumType w:start="7" w:fmt="upperRoman"/>\n            <w:vAlign w:val="center"/>\n            <w:bidi/>\n          </w:sectPr>\n        </w:sectPrChange>\n      </w:sectPr>\n      <w:p><w:r><w:t>Section two</w:t></w:r></w:p>\n      <w:sectPr>\n        <w:pgSz w:w="12240" w:h="15840"/>\n        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>\n      </w:sectPr>\n    </w:body></w:document>\`,\n  );\n  return importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));\n}\n\ndescribe("DOCX section property revisions", () => {\n  it("imports the previous sectPr snapshot with explicit next-break semantics", async () => {\n    const document = await importSectionRevisionDocument();\n    const first = document.sections![0]!;\n    expect(first.propertyRevision).toMatchObject({\n      id: "30",\n      type: "property",\n      author: "Section Author",\n      previous: {\n        nextBreakType: "continuous",\n        pageNumbering: { start: 7, format: "upperRoman" },\n        verticalAlignment: "center",\n        bidi: true,\n      },\n    });\n    expect(first.propertyRevision?.previous.pageSettings.orientation).toBe("landscape");\n    expect(document.sections![1]!.breakType).toBe("nextPage");\n  });\n\n  it("rebuilds edited section properties while retaining the previous sectPr", async () => {\n    const document = await importSectionRevisionDocument();\n    const first = document.sections![0]!;\n    first.pageSettings = {\n      ...first.pageSettings,\n      margins: { ...first.pageSettings.margins, top: 120 },\n    };\n    first.pageNumbering = { start: 3, format: "decimal" };\n\n    const exported = await exportEditorDocumentToDocx(document);\n    const zip = await JSZip.loadAsync(exported);\n    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";\n    expect(xml.match(/<w:sectPrChange\\b/g)).toHaveLength(1);\n    expect(xml).toMatch(/<w:sectPrChange\\b[^>]*w:id="30"[^>]*w:author="Section Author"[^>]*>[\\s\\S]*?<w:sectPr>[\\s\\S]*?<w:type w:val="continuous"\\/>[\\s\\S]*?<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"\\/>[\\s\\S]*?<w:pgNumType w:start="7" w:fmt="upperRoman"\\/>[\\s\\S]*?<w:vAlign w:val="center"\\/>[\\s\\S]*?<w:bidi\\/>[\\s\\S]*?<\\/w:sectPr>[\\s\\S]*?<\\/w:sectPrChange>/);\n\n    const reimported = await importDocxToEditorDocument(exported);\n    expect(reimported.sections![0]!.propertyRevision).toMatchObject({\n      id: "30",\n      previous: { nextBreakType: "continuous", pageNumbering: { start: 7 } },\n    });\n  });\n});\n`,
);

console.log("Applied DOCX sectPrChange semantic support patch.");
