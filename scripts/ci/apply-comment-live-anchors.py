from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


def replace_once(path: str, before: str, after: str) -> None:
    content = read(path)
    count = content.count(before)
    if count != 1:
        raise RuntimeError(f"Expected one anchor in {path}, found {count}: {before[:140]!r}")
    write(path, content.replace(before, after, 1))


write(
    "src/core/document/rangeAnchors.ts",
    '''import type { EditorParagraphNode } from "@/core/model.js";\nimport { getParagraphText } from "@/core/model.js";\n\ninterface TextRangeAnchor {\n  paragraphId: string;\n  offset: number;\n  seq?: number;\n}\n\ninterface TextRangeItem {\n  start?: TextRangeAnchor;\n  end?: TextRangeAnchor;\n}\n\ninterface TextRangeRegistry {\n  items: Record<string, TextRangeItem>;\n  order: string[];\n}\n\ninterface ParaSpan {\n  id: string;\n  base: number;\n  length: number;\n}\n\ninterface Stream {\n  text: string;\n  spans: ParaSpan[];\n  baseById: Map<string, number>;\n}\n\nfunction buildStream(paragraphs: EditorParagraphNode[]): Stream {\n  const spans: ParaSpan[] = [];\n  const baseById = new Map<string, number>();\n  const parts: string[] = [];\n  let cursor = 0;\n  for (const paragraph of paragraphs) {\n    const text = getParagraphText(paragraph);\n    spans.push({ id: paragraph.id, base: cursor, length: text.length });\n    if (!baseById.has(paragraph.id)) {\n      baseById.set(paragraph.id, cursor);\n    }\n    parts.push(text);\n    cursor += text.length + 1;\n  }\n  return { text: parts.join("\\n"), spans, baseById };\n}\n\nfunction commonPrefixLength(a: string, b: string, max: number): number {\n  let index = 0;\n  while (index < max && a.charCodeAt(index) === b.charCodeAt(index)) {\n    index += 1;\n  }\n  return index;\n}\n\nfunction commonSuffixLength(a: string, b: string, max: number): number {\n  let index = 0;\n  while (\n    index < max &&\n    a.charCodeAt(a.length - 1 - index) ===\n      b.charCodeAt(b.length - 1 - index)\n  ) {\n    index += 1;\n  }\n  return index;\n}\n\nfunction clamp(value: number, min: number, max: number): number {\n  return value < min ? min : value > max ? max : value;\n}\n\nfunction mapGlobalOffset(\n  offset: number,\n  oldLength: number,\n  newLength: number,\n  prefix: number,\n  suffix: number,\n): number {\n  if (offset <= prefix) {\n    return offset;\n  }\n  if (offset >= oldLength - suffix) {\n    return offset + (newLength - oldLength);\n  }\n  return prefix;\n}\n\nfunction locate(\n  globalOffset: number,\n  spans: ParaSpan[],\n): { paragraphId: string; offset: number } {\n  for (const span of spans) {\n    if (globalOffset <= span.base + span.length) {\n      return {\n        paragraphId: span.id,\n        offset: Math.max(0, globalOffset - span.base),\n      };\n    }\n  }\n  const last = spans[spans.length - 1]!;\n  return { paragraphId: last.id, offset: last.length };\n}\n\n/**\n * Remap document-level text ranges across one paragraph edit. The edited zone\n * is linearized with paragraph-break sentinels, so typing, deletion and\n * split/merge operations share one exact mapping path. Registries/items that do\n * not change retain identity for structural sharing.\n */\nexport function transformTextRangeRegistryAcrossParagraphEdit<\n  Registry extends TextRangeRegistry,\n>(\n  registry: Registry,\n  oldParagraphs: EditorParagraphNode[],\n  newParagraphs: EditorParagraphNode[],\n): Registry {\n  const old = buildStream(oldParagraphs);\n\n  let relevant = false;\n  for (const id of registry.order) {\n    const item = registry.items[id];\n    if (!item) continue;\n    if (\n      (item.start && old.baseById.has(item.start.paragraphId)) ||\n      (item.end && old.baseById.has(item.end.paragraphId))\n    ) {\n      relevant = true;\n      break;\n    }\n  }\n  if (!relevant) {\n    return registry;\n  }\n\n  const next = buildStream(newParagraphs);\n  if (old.text === next.text) {\n    return registry;\n  }\n\n  const oldLength = old.text.length;\n  const newLength = next.text.length;\n  const limit = Math.min(oldLength, newLength);\n  const suffix = commonSuffixLength(old.text, next.text, limit);\n  const prefix = commonPrefixLength(old.text, next.text, limit - suffix);\n\n  const remap = <Anchor extends TextRangeAnchor>(anchor: Anchor): Anchor => {\n    const base = old.baseById.get(anchor.paragraphId);\n    if (base === undefined) {\n      return anchor;\n    }\n    const globalOffset = base + clamp(anchor.offset, 0, oldLength - base);\n    const mapped = clamp(\n      mapGlobalOffset(globalOffset, oldLength, newLength, prefix, suffix),\n      0,\n      newLength,\n    );\n    const located = locate(mapped, next.spans);\n    if (\n      located.paragraphId === anchor.paragraphId &&\n      located.offset === anchor.offset\n    ) {\n      return anchor;\n    }\n    return {\n      ...anchor,\n      paragraphId: located.paragraphId,\n      offset: located.offset,\n    };\n  };\n\n  let changed = false;\n  const items = { ...registry.items };\n  for (const id of registry.order) {\n    const item = registry.items[id];\n    if (!item) continue;\n    let updated = item;\n    if (item.start && old.baseById.has(item.start.paragraphId)) {\n      const start = remap(item.start);\n      if (start !== item.start) updated = { ...updated, start };\n    }\n    if (item.end && old.baseById.has(item.end.paragraphId)) {\n      const end = remap(item.end);\n      if (end !== item.end) updated = { ...updated, end };\n    }\n    if (updated !== item) {\n      items[id] = updated;\n      changed = true;\n    }\n  }\n\n  return (changed ? { ...registry, items } : registry) as Registry;\n}\n''',
)

write(
    "src/core/document/bookmarkAnchors.ts",
    '''/** Keep bookmark ranges valid as paragraph text and boundaries mutate. */\nimport type { EditorBookmarks, EditorParagraphNode } from "@/core/model.js";\nimport { transformTextRangeRegistryAcrossParagraphEdit } from "./rangeAnchors.js";\n\nexport function transformBookmarksAcrossParagraphEdit(\n  bookmarks: EditorBookmarks,\n  oldParagraphs: EditorParagraphNode[],\n  newParagraphs: EditorParagraphNode[],\n): EditorBookmarks {\n  return transformTextRangeRegistryAcrossParagraphEdit(\n    bookmarks,\n    oldParagraphs,\n    newParagraphs,\n  );\n}\n''',
)

write(
    "src/core/document/commentAnchors.ts",
    '''/** Keep comment ranges valid as paragraph text and boundaries mutate. */\nimport type { EditorComments, EditorParagraphNode } from "@/core/model.js";\nimport { transformTextRangeRegistryAcrossParagraphEdit } from "./rangeAnchors.js";\n\nexport function transformCommentsAcrossParagraphEdit(\n  comments: EditorComments,\n  oldParagraphs: EditorParagraphNode[],\n  newParagraphs: EditorParagraphNode[],\n): EditorComments {\n  return transformTextRangeRegistryAcrossParagraphEdit(\n    comments,\n    oldParagraphs,\n    newParagraphs,\n  );\n}\n''',
)

replace_once(
    "src/core/document/blockReplacement.ts",
    '''import { transformBookmarksAcrossParagraphEdit } from "./bookmarkAnchors.js";''',
    '''import { transformBookmarksAcrossParagraphEdit } from "./bookmarkAnchors.js";\nimport { transformCommentsAcrossParagraphEdit } from "./commentAnchors.js";''',
)

replace_once(
    "src/core/document/blockReplacement.ts",
    '''  const nextBookmarks =\n    bookmarks && bookmarks.order.length > 0\n      ? transformBookmarksAcrossParagraphEdit(\n          bookmarks,\n          getParagraphs(state),\n          paragraphs,\n        )\n      : bookmarks;\n\n  return {''',
    '''  const oldParagraphs = getParagraphs(state);\n  const nextBookmarks =\n    bookmarks && bookmarks.order.length > 0\n      ? transformBookmarksAcrossParagraphEdit(\n          bookmarks,\n          oldParagraphs,\n          paragraphs,\n        )\n      : bookmarks;\n\n  const comments = state.document.comments;\n  const nextComments =\n    comments && comments.order.length > 0\n      ? transformCommentsAcrossParagraphEdit(\n          comments,\n          oldParagraphs,\n          paragraphs,\n        )\n      : comments;\n\n  return {''',
)

replace_once(
    "src/core/document/blockReplacement.ts",
    '''      ...(nextBookmarks !== bookmarks ? { bookmarks: nextBookmarks } : {}),\n    },''',
    '''      ...(nextBookmarks !== bookmarks ? { bookmarks: nextBookmarks } : {}),\n      ...(nextComments !== comments ? { comments: nextComments } : {}),\n    },''',
)

replace_once(
    "src/core/model/types/documentComments.ts",
    ''' * This is the import/display/export representation: faithful round-trip plus a\n * highlighted range and a hover/click popup. Authoring (create/reply/resolve)\n * and live-edit anchor transforms are intentionally out of scope here.''',
    ''' * This is the import/display/export representation: faithful round-trip plus a\n * highlighted range and a hover/click popup. Range anchors stay live across\n * paragraph edits; comment authoring commands remain a separate concern.''',
)

write(
    "tests/vitest/__tests__/core/commentAnchors.test.ts",
    '''import { describe, expect, it } from "vitest";\nimport type { EditorComment, EditorState } from "@/core/model.js";\nimport { getParagraphs } from "@/core/model.js";\nimport { createEditorStateFromTexts } from "@/core/editorState.js";\nimport {\n  insertPlainTextAtSelection,\n  insertTextAtSelection,\n} from "@/core/commands/text.js";\n\nfunction withComments(\n  state: EditorState,\n  comments: EditorComment[],\n): EditorState {\n  return {\n    ...state,\n    document: {\n      ...state.document,\n      comments: {\n        order: comments.map((comment) => comment.id),\n        items: Object.fromEntries(\n          comments.map((comment) => [comment.id, comment]),\n        ),\n      },\n    },\n  };\n}\n\ndescribe("live comment anchors", () => {\n  it("shifts comment anchors when text is inserted before the range", () => {\n    let state = createEditorStateFromTexts(["abcd"], { offset: 0 });\n    const paragraph = getParagraphs(state)[0]!;\n    state = withComments(state, [\n      {\n        id: "comment:root",\n        author: "A",\n        text: "Review",\n        start: { paragraphId: paragraph.id, offset: 1 },\n        end: { paragraphId: paragraph.id, offset: 3 },\n      },\n    ]);\n\n    const next = insertTextAtSelection(state, "X");\n    const comment = next.document.comments!.items["comment:root"]!;\n    expect(comment.start).toMatchObject({\n      paragraphId: paragraph.id,\n      offset: 2,\n    });\n    expect(comment.end).toMatchObject({\n      paragraphId: paragraph.id,\n      offset: 4,\n    });\n  });\n\n  it("moves the trailing anchor to the new paragraph on split", () => {\n    let state = createEditorStateFromTexts(["abcd"], { offset: 2 });\n    const paragraph = getParagraphs(state)[0]!;\n    state = withComments(state, [\n      {\n        id: "comment:root",\n        author: "A",\n        text: "Review",\n        start: { paragraphId: paragraph.id, offset: 1 },\n        end: { paragraphId: paragraph.id, offset: 3 },\n      },\n    ]);\n\n    const next = insertPlainTextAtSelection(state, "\\n");\n    const paragraphs = getParagraphs(next);\n    expect(paragraphs).toHaveLength(2);\n    const comment = next.document.comments!.items["comment:root"]!;\n    expect(comment.start).toMatchObject({\n      paragraphId: paragraphs[0]!.id,\n      offset: 1,\n    });\n    expect(comment.end).toMatchObject({\n      paragraphId: paragraphs[1]!.id,\n      offset: 1,\n    });\n  });\n\n  it("preserves body-only replies while an anchored parent moves", () => {\n    let state = createEditorStateFromTexts(["abcd"], { offset: 0 });\n    const paragraph = getParagraphs(state)[0]!;\n    const root: EditorComment = {\n      id: "comment:root",\n      author: "A",\n      text: "Root",\n      start: { paragraphId: paragraph.id, offset: 1 },\n      end: { paragraphId: paragraph.id, offset: 3 },\n    };\n    const reply: EditorComment = {\n      id: "comment:reply",\n      parentId: root.id,\n      author: "B",\n      text: "Reply",\n    };\n    state = withComments(state, [root, reply]);\n\n    const next = insertTextAtSelection(state, "X");\n    const comments = next.document.comments!;\n    expect(comments.items[reply.id]).toBe(reply);\n    expect(comments.items[reply.id]!.parentId).toBe(root.id);\n    expect(comments.items[root.id]!.start?.offset).toBe(2);\n  });\n});\n''',
)

print("Applied live comment range anchor transforms with shared range owner.")
