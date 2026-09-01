from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content)


def replace_once(path: str, before: str, after: str) -> None:
    content = read(path)
    count = content.count(before)
    if count != 1:
        raise RuntimeError(f"Expected one anchor in {path}, found {count}: {before[:120]!r}")
    write(path, content.replace(before, after, 1))


replace_once(
    "src/core/model/types/nodes.ts",
    '''  propertyExceptions?: EditorTableStyle;\n  /** Raw `<w:tblPrExChange ...>` XML preserved for DOCX round-trip. */\n  tblPrExChangeXml?: string;''',
    '''  propertyExceptions?: EditorTableStyle;\n  /** Semantic previous row table-property exceptions from `w:tblPrExChange`. */\n  propertyExceptionsRevision?: EditorPropertyRevision<EditorTableStyle>;\n  /** Exact imported `<w:tblPrExChange ...>` retained as a preservation fallback. */\n  tblPrExChangeXml?: string;''',
)

replace_once(
    "src/import/docx/tableProperties.ts",
    '''  EditorRevisionMetadata,\n  EditorTableConditionalFlags,''',
    '''  EditorRevisionMetadata,\n  EditorPropertyRevision,\n  EditorTableConditionalFlags,''',
)

replace_once(
    "src/import/docx/tableProperties.ts",
    '''function parseRevisionMetadata(element: XmlElement): EditorRevisionMetadata {\n  const rawDate = getAttributeValue(element, "date");\n  const parsedDate = rawDate ? Date.parse(rawDate) : Number.NaN;\n  return {\n    id: getAttributeValue(element, "id") ?? `revision:${element.localName}`,\n    author: getAttributeValue(element, "author") ?? "Unknown",\n    date: Number.isFinite(parsedDate) ? parsedDate : 0,\n  };\n}\n''',
    '''function parseRevisionMetadata(element: XmlElement): EditorRevisionMetadata {\n  const rawDate = getAttributeValue(element, "date");\n  const parsedDate = rawDate ? Date.parse(rawDate) : Number.NaN;\n  return {\n    id: getAttributeValue(element, "id") ?? `revision:${element.localName}`,\n    author: getAttributeValue(element, "author") ?? "Unknown",\n    date: Number.isFinite(parsedDate) ? parsedDate : 0,\n  };\n}\n\nexport function parseTablePropertyExceptionRevision(\n  change: XmlElement | null,\n): EditorPropertyRevision<EditorTableStyle> | undefined {\n  if (!change) return undefined;\n  const previous = getFirstChildByTagNameNS(change, WORD_NS, "tblPrEx");\n  if (!previous) return undefined;\n  return {\n    ...parseRevisionMetadata(change),\n    type: "property",\n    previous: parseTableStyle(previous) ?? {},\n  };\n}\n''',
)

replace_once(
    "src/import/docx/tables.ts",
    '''  parseTableStyle,\n  parseTableRowStyle,''',
    '''  parseTableStyle,\n  parseTablePropertyExceptionRevision,\n  parseTableRowStyle,''',
)

replace_once(
    "src/import/docx/tables.ts",
    '''      if (changeEl) {\n        row.tblPrExChangeXml = new XMLSerializer().serializeToString(changeEl);\n      }''',
    '''      if (changeEl) {\n        const revision = parseTablePropertyExceptionRevision(changeEl);\n        if (revision) {\n          row.propertyExceptionsRevision = revision;\n        }\n        row.tblPrExChangeXml = new XMLSerializer().serializeToString(changeEl);\n      }''',
)

replace_once(
    "src/core/cloneState.ts",
    '''          conditionalStyle: row.conditionalStyle\n            ? { ...row.conditionalStyle }\n            : undefined,\n          style: row.style''',
    '''          conditionalStyle: row.conditionalStyle\n            ? { ...row.conditionalStyle }\n            : undefined,\n          propertyExceptions: row.propertyExceptions\n            ? structuredClone(row.propertyExceptions)\n            : undefined,\n          propertyExceptionsRevision: row.propertyExceptionsRevision\n            ? structuredClone(row.propertyExceptionsRevision)\n            : undefined,\n          style: row.style''',
)

replace_once(
    "src/core/document/trackedRevisions.ts",
    '''  if (next.tblPrExChangeXml) {\n    const revisionId = rawRevisionId(next.tblPrExChangeXml);\n    if (\n      revisionId &&\n      matchesRevision(context, revisionId)\n    ) {\n      markMatched(context);\n      if (context.action === "accept") {\n        markResolved(context, revisionId);\n        next = { ...next, tblPrExChangeXml: undefined };\n      } else {\n        pushIssue(context, {\n          kind: "table-property-exception-original-unavailable",\n          revisionId,\n          path: `${path}.tblPrExChangeXml`,\n          message:\n            "w:tblPrExChange is still preservation-only; its previous properties are not semantically decoded yet.",\n        });\n      }\n    }\n  }''',
    '''  const propertyExceptionsRevision = next.propertyExceptionsRevision;\n  if (\n    propertyExceptionsRevision &&\n    matchesRevision(context, propertyExceptionsRevision.id)\n  ) {\n    markResolved(context, propertyExceptionsRevision.id);\n    next = {\n      ...next,\n      propertyExceptions:\n        context.action === "accept"\n          ? next.propertyExceptions\n          : structuredClone(propertyExceptionsRevision.previous),\n      propertyExceptionsRevision: undefined,\n      tblPrExChangeXml: undefined,\n    };\n  } else if (next.tblPrExChangeXml && !propertyExceptionsRevision) {\n    const revisionId = rawRevisionId(next.tblPrExChangeXml);\n    if (revisionId && matchesRevision(context, revisionId)) {\n      markMatched(context);\n      if (context.action === "accept") {\n        markResolved(context, revisionId);\n        next = { ...next, tblPrExChangeXml: undefined };\n      } else {\n        pushIssue(context, {\n          kind: "table-property-exception-original-unavailable",\n          revisionId,\n          path: `${path}.tblPrExChangeXml`,\n          message:\n            "The imported w:tblPrExChange has no decodable previous w:tblPrEx snapshot.",\n        });\n      }\n    }\n  }''',
)

replace_once(
    "src/export/docx/tableXml.ts",
    '''function serializeTablePropertyExceptions(\n  exceptions: EditorTableStyle | undefined,\n  tblPrExChangeXml?: string,\n): string {\n  if (!exceptions && !tblPrExChangeXml) {''',
    '''function serializeTablePropertyExceptions(\n  exceptions: EditorTableStyle | undefined,\n  revision?: EditorTableNode["rows"][number]["propertyExceptionsRevision"],\n  tblPrExChangeXml?: string,\n): string {\n  if (!exceptions && !revision && !tblPrExChangeXml) {''',
)

replace_once(
    "src/export/docx/tableXml.ts",
    '''  if (tblPrExChangeXml) {\n    parts.push(tblPrExChangeXml);\n  }\n  return parts.length > 0 ? `<w:tblPrEx>${parts.join("")}</w:tblPrEx>` : "";''',
    '''  if (tblPrExChangeXml) {\n    parts.push(tblPrExChangeXml);\n  } else if (revision) {\n    const previous =\n      serializeTablePropertyExceptions(revision.previous) || "<w:tblPrEx/>";\n    parts.push(\n      `<w:tblPrExChange ${serializeRevisionAttrs(revision)}>${previous}</w:tblPrExChange>`,\n    );\n  }\n  return parts.length > 0 ? `<w:tblPrEx>${parts.join("")}</w:tblPrEx>` : "";''',
)

replace_once(
    "src/export/docx/tableXml.ts",
    '''serializeTablePropertyExceptions(row.propertyExceptions, row.tblPrExChangeXml)''',
    '''serializeTablePropertyExceptions(\n        row.propertyExceptions,\n        row.propertyExceptionsRevision,\n        row.tblPrExChangeXml,\n      )''',
)

write(
    "tests/vitest/__tests__/import/docxImport.tblPrExChange.test.ts",
    '''import { describe, expect, it } from "vitest";\nimport JSZip from "jszip";\nimport type { EditorTableNode } from "@/core/model.js";\nimport { projectTrackedRevisions } from "@/core/document/trackedRevisions.js";\nimport { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";\nimport { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";\n\nasync function importTablePropertyExceptionRevision() {\n  const zip = new JSZip();\n  zip.file(\n    "word/document.xml",\n    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n  <w:body>\n    <w:tbl>\n      <w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>\n      <w:tr>\n        <w:tblPrEx>\n          <w:tblW w:w="4000" w:type="dxa"/>\n          <w:jc w:val="right"/>\n          <w:tblPrExChange w:id="71" w:author="Table Author" w:date="2026-02-08T01:02:03Z">\n            <w:tblPrEx>\n              <w:tblW w:w="2000" w:type="dxa"/>\n              <w:jc w:val="left"/>\n            </w:tblPrEx>\n          </w:tblPrExChange>\n        </w:tblPrEx>\n        <w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc>\n      </w:tr>\n    </w:tbl>\n    <w:sectPr/>\n  </w:body>\n</w:document>`,\n  );\n  return importDocxToEditorDocument(await zip.generateAsync({ type: "arraybuffer" }));\n}\n\nfunction firstTable(document: Awaited<ReturnType<typeof importTablePropertyExceptionRevision>>): EditorTableNode {\n  return document.sections![0]!.blocks[0] as EditorTableNode;\n}\n\ndescribe("DOCX tracked table property exceptions", () => {\n  it("decodes tblPrExChange while retaining raw round-trip fallback", async () => {\n    const document = await importTablePropertyExceptionRevision();\n    const row = firstTable(document).rows[0]!;\n\n    expect(row.propertyExceptions).toMatchObject({ width: 200, align: "right" });\n    expect(row.propertyExceptionsRevision).toMatchObject({\n      id: "71",\n      author: "Table Author",\n      type: "property",\n      previous: { width: 100, align: "left" },\n    });\n    expect(row.tblPrExChangeXml).toContain("tblPrExChange");\n\n    const exported = await exportEditorDocumentToDocx(document);\n    const reimported = await importDocxToEditorDocument(exported);\n    expect(firstTable(reimported).rows[0]!.propertyExceptionsRevision).toMatchObject({\n      id: "71",\n      previous: { width: 100, align: "left" },\n    });\n  });\n\n  it("projects Original and Final exactly and removes the resolved change", async () => {\n    const document = await importTablePropertyExceptionRevision();\n\n    const original = projectTrackedRevisions(document, "original");\n    expect(original.complete).toBe(true);\n    expect(original.resolvedRevisionIds).toContain("71");\n    const originalRow = firstTable(original.document).rows[0]!;\n    expect(originalRow.propertyExceptions).toMatchObject({ width: 100, align: "left" });\n    expect(originalRow.propertyExceptionsRevision).toBeUndefined();\n    expect(originalRow.tblPrExChangeXml).toBeUndefined();\n\n    const originalZip = await JSZip.loadAsync(await exportEditorDocumentToDocx(original.document));\n    const originalXml = (await originalZip.file("word/document.xml")?.async("string")) ?? "";\n    expect(originalXml).not.toContain("tblPrExChange");\n    expect(originalXml).toContain('<w:tblW w:w="2000" w:type="dxa"/>');\n    expect(originalXml).toContain('<w:jc w:val="left"/>');\n\n    const final = projectTrackedRevisions(document, "final");\n    expect(final.complete).toBe(true);\n    const finalRow = firstTable(final.document).rows[0]!;\n    expect(finalRow.propertyExceptions).toMatchObject({ width: 200, align: "right" });\n    expect(finalRow.propertyExceptionsRevision).toBeUndefined();\n    expect(finalRow.tblPrExChangeXml).toBeUndefined();\n  });\n\n  it("serializes a typed revision when no raw change XML is available", async () => {\n    const document = await importTablePropertyExceptionRevision();\n    const row = firstTable(document).rows[0]!;\n    row.tblPrExChangeXml = undefined;\n\n    const exported = await exportEditorDocumentToDocx(document);\n    const zip = await JSZip.loadAsync(exported);\n    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";\n    expect(xml).toContain("<w:tblPrExChange ");\n    expect(xml).toContain('<w:tblW w:w="2000" w:type="dxa"/>');\n\n    const reimported = await importDocxToEditorDocument(exported);\n    expect(firstTable(reimported).rows[0]!.propertyExceptionsRevision).toMatchObject({\n      id: "71",\n      previous: { width: 100, align: "left" },\n    });\n  });\n});\n''',
)

print("Applied semantic w:tblPrExChange support.")
