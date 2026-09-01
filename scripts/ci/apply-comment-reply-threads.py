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
        raise RuntimeError(f"Expected one anchor in {path}, found {count}: {before[:140]!r}")
    write(path, content.replace(before, after, 1))


replace_once(
    "src/core/model/types/documentComments.ts",
    '''  /** Resolved/"done" state (`w15:commentEx/@w15:done`). */\n  resolved?: boolean;\n  /** Flattened comment body text (bodies in scope are single paragraphs). */''',
    '''  /** Resolved/"done" state (`w15:commentEx/@w15:done`). */\n  resolved?: boolean;\n  /** Editor-local parent comment id for a threaded reply (`w15:paraIdParent`). */\n  parentId?: string;\n  /** Flattened comment body text (bodies in scope are single paragraphs). */''',
)

replace_once(
    "src/import/docx/commentsXml.ts",
    '''  resolved?: boolean;\n  /** `w14:paraId` of the comment's (first) paragraph — links to commentsEx. */\n  paraId?: string;''',
    '''  resolved?: boolean;\n  /** `w14:paraId` of the comment's (first) paragraph — links to commentsEx. */\n  paraId?: string;\n  /** Parent comment paragraph id from `w15:commentEx/@w15:paraIdParent`. */\n  parentParaId?: string;''',
)

replace_once(
    "src/import/docx/commentsXml.ts",
    '''function parseCommentsExtended(xml: string | null): Map<string, boolean> {\n  const done = new Map<string, boolean>();\n  if (!xml) {\n    return done;\n  }''',
    '''interface ParsedCommentExtended {\n  resolved: boolean;\n  parentParaId?: string;\n}\n\nfunction parseCommentsExtended(\n  xml: string | null,\n): Map<string, ParsedCommentExtended> {\n  const extended = new Map<string, ParsedCommentExtended>();\n  if (!xml) {\n    return extended;\n  }''',
)

replace_once(
    "src/import/docx/commentsXml.ts",
    '''  if (!root) {\n    return done;\n  }\n  for (const ex of getChildrenByTagNameNS(root, WORD15_NS, "commentEx")) {\n    const paraId = ex.getAttributeNS(WORD15_NS, "paraId");\n    if (!paraId) {\n      continue;\n    }\n    const isDone = ex.getAttributeNS(WORD15_NS, "done");\n    done.set(paraId, isDone === "1" || isDone === "true");\n  }\n  return done;''',
    '''  if (!root) {\n    return extended;\n  }\n  for (const ex of getChildrenByTagNameNS(root, WORD15_NS, "commentEx")) {\n    const paraId = ex.getAttributeNS(WORD15_NS, "paraId");\n    if (!paraId) {\n      continue;\n    }\n    const isDone = ex.getAttributeNS(WORD15_NS, "done");\n    const parentParaId =\n      ex.getAttributeNS(WORD15_NS, "paraIdParent") || undefined;\n    extended.set(paraId, {\n      resolved: isDone === "1" || isDone === "true",\n      ...(parentParaId ? { parentParaId } : {}),\n    });\n  }\n  return extended;''',
)

replace_once(
    "src/import/docx/commentsXml.ts",
    '''  const doneByParaId = parseCommentsExtended(commentsExtendedXml);''',
    '''  const extendedByParaId = parseCommentsExtended(commentsExtendedXml);''',
)

replace_once(
    "src/import/docx/commentsXml.ts",
    '''    const resolved =\n      paraId !== undefined ? doneByParaId.get(paraId) : undefined;\n\n    byDocxId.set(docxId, {''',
    '''    const extended =\n      paraId !== undefined ? extendedByParaId.get(paraId) : undefined;\n\n    byDocxId.set(docxId, {''',
)

replace_once(
    "src/import/docx/commentsXml.ts",
    '''      text,\n      ...(resolved ? { resolved } : {}),\n      ...(paraId ? { paraId } : {}),\n    });''',
    '''      text,\n      ...(extended?.resolved ? { resolved: true } : {}),\n      ...(paraId ? { paraId } : {}),\n      ...(extended?.parentParaId\n        ? { parentParaId: extended.parentParaId }\n        : {}),\n    });''',
)

replace_once(
    "src/import/docx/importDocxToEditorDocument.ts",
    '''  const items: EditorComments["items"] = {};\n  const order: string[] = [];\n  for (const docxId of sorted) {''',
    '''  const localIdByDocxId = new Map<string, string>();\n  for (const docxId of sorted) {\n    localIdByDocxId.set(docxId, createEditorCommentId());\n  }\n  const localIdByParaId = new Map<string, string>();\n  for (const [docxId, body] of bodies) {\n    const localId = localIdByDocxId.get(docxId);\n    if (localId && body.paraId) {\n      localIdByParaId.set(body.paraId, localId);\n    }\n  }\n\n  const items: EditorComments["items"] = {};\n  const order: string[] = [];\n  for (const docxId of sorted) {''',
)

replace_once(
    "src/import/docx/importDocxToEditorDocument.ts",
    '''    const id = createEditorCommentId();\n    const docxIdNum = Number.parseInt(docxId, 10);\n    items[id] = {''',
    '''    const id = localIdByDocxId.get(docxId)!;\n    const parentId = body?.parentParaId\n      ? localIdByParaId.get(body.parentParaId)\n      : undefined;\n    const docxIdNum = Number.parseInt(docxId, 10);\n    items[id] = {''',
)

replace_once(
    "src/import/docx/importDocxToEditorDocument.ts",
    '''      ...(body?.resolved ? { resolved: body.resolved } : {}),\n      text: body?.text ?? "",''',
    '''      ...(body?.resolved ? { resolved: body.resolved } : {}),\n      ...(parentId ? { parentId } : {}),\n      text: body?.text ?? "",''',
)

replace_once(
    "src/export/docx/commentsXml.ts",
    '''export function buildCommentsExtendedPartXml(plan: CommentExportPlan): string {\n  const body = plan.comments\n    .map(\n      ({ comment, paraId }): string =>\n        `<w15:commentEx w15:paraId="${paraId}" w15:done="${comment.resolved ? "1" : "0"}"/>`,\n    )\n    .join("");''',
    '''export function buildCommentsExtendedPartXml(plan: CommentExportPlan): string {\n  const paraIdByCommentId = new Map(\n    plan.comments.map(({ comment, paraId }) => [comment.id, paraId] as const),\n  );\n  const body = plan.comments\n    .map(({ comment, paraId }): string => {\n      const parentParaId = comment.parentId\n        ? paraIdByCommentId.get(comment.parentId)\n        : undefined;\n      const parentAttr = parentParaId\n        ? ` w15:paraIdParent="${parentParaId}"`\n        : "";\n      return `<w15:commentEx w15:paraId="${paraId}"${parentAttr} w15:done="${comment.resolved ? "1" : "0"}"/>`;\n    })\n    .join("");''',
)

write(
    "tests/vitest/__tests__/import/docxImport.commentReplies.test.ts",
    '''import { describe, expect, it } from "vitest";\nimport JSZip from "jszip";\nimport { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";\nimport { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";\n\nasync function buildThreadedCommentDocx(): Promise<ArrayBuffer> {\n  const zip = new JSZip();\n  zip.file(\n    "word/document.xml",\n    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>\n      <w:p><w:commentRangeStart w:id="0"/><w:r><w:t>Target</w:t></w:r><w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r></w:p>\n      <w:sectPr/>\n    </w:body></w:document>`,\n  );\n  zip.file(\n    "word/comments.xml",\n    `<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">\n      <w:comment w:id="0" w:author="Root"><w:p w14:paraId="AAAABBBB"><w:r><w:t>Root comment</w:t></w:r></w:p></w:comment>\n      <w:comment w:id="1" w:author="Reply"><w:p w14:paraId="CCCCDDDD"><w:r><w:t>Reply comment</w:t></w:r></w:p></w:comment>\n    </w:comments>`,\n  );\n  zip.file(\n    "word/commentsExtended.xml",\n    `<w15:commentsEx xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">\n      <w15:commentEx w15:paraId="AAAABBBB" w15:done="0"/>\n      <w15:commentEx w15:paraId="CCCCDDDD" w15:paraIdParent="AAAABBBB" w15:done="1"/>\n    </w15:commentsEx>`,\n  );\n  return zip.generateAsync({ type: "arraybuffer" });\n}\n\nfunction rootAndReply(document: Awaited<ReturnType<typeof importDocxToEditorDocument>>) {\n  const comments = document.comments!;\n  const root = comments.items[comments.order[0]!]!;\n  const reply = comments.items[comments.order[1]!]!;\n  return { root, reply };\n}\n\ndescribe("DOCX modern comment reply threads", () => {\n  it("imports paraIdParent as an editor-local parent comment id", async () => {\n    const document = await importDocxToEditorDocument(await buildThreadedCommentDocx());\n    const { root, reply } = rootAndReply(document);\n\n    expect(root.text).toBe("Root comment");\n    expect(root.parentId).toBeUndefined();\n    expect(reply.text).toBe("Reply comment");\n    expect(reply.parentId).toBe(root.id);\n    expect(reply.resolved).toBe(true);\n    expect(reply.start).toBeUndefined();\n    expect(reply.end).toBeUndefined();\n  });\n\n  it("rebuilds paraIdParent from local ids and reimports the same topology", async () => {\n    const document = await importDocxToEditorDocument(await buildThreadedCommentDocx());\n    const exported = await exportEditorDocumentToDocx(document);\n    const zip = await JSZip.loadAsync(exported);\n    const extended =\n      (await zip.file("word/commentsExtended.xml")?.async("string")) ?? "";\n\n    expect(extended).toContain('w15:paraId="40000000"');\n    expect(extended).toContain(\n      'w15:paraId="40000001" w15:paraIdParent="40000000" w15:done="1"',\n    );\n\n    const reimported = await importDocxToEditorDocument(exported);\n    const { root, reply } = rootAndReply(reimported);\n    expect(reply.parentId).toBe(root.id);\n    expect(reply.resolved).toBe(true);\n  });\n\n  it("keeps a reply when its parent paragraph id is dangling", async () => {\n    const zip = await JSZip.loadAsync(await buildThreadedCommentDocx());\n    const extended =\n      (await zip.file("word/commentsExtended.xml")?.async("string")) ?? "";\n    zip.file(\n      "word/commentsExtended.xml",\n      extended.replace('w15:paraIdParent="AAAABBBB"', 'w15:paraIdParent="DEADBEEF"'),\n    );\n    const document = await importDocxToEditorDocument(\n      await zip.generateAsync({ type: "arraybuffer" }),\n    );\n    const { reply } = rootAndReply(document);\n    expect(reply.text).toBe("Reply comment");\n    expect(reply.parentId).toBeUndefined();\n  });\n});\n''',
)

print("Applied semantic modern comment reply-thread support.")
