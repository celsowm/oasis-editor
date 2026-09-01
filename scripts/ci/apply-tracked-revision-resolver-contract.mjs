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
    throw new Error(`Anchor not found in ${path}: ${before.slice(0, 100)}`);
  }
  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Anchor not unique in ${path}`);
  }
  return content.slice(0, index) + after + content.slice(index + before.length);
}

function patch(path, replacements) {
  let content = read(path);
  for (const [before, after] of replacements) {
    content = replaceOnce(content, before, after, path);
  }
  write(path, content);
}

patch("src/core/model/types/primitives.ts", [
  [
    `export interface EditorRevision {\n  id: string;\n  type: "insert" | "delete";\n  author: string;\n  date: number;\n}\n\nexport interface EditorRevisionMetadata {`,
    `export interface EditorRevision {\n  id: string;\n  type: "insert" | "delete";\n  author: string;\n  date: number;\n  /** Word move containers reuse insertion/deletion semantics plus source/target identity. */\n  move?: "from" | "to";\n}\n\n/** Zero-length w:moveFrom/ToRangeStart/End marker retained in inline order. */\nexport interface EditorMoveRangeMarker {\n  move: "from" | "to";\n  edge: "start" | "end";\n  id: string;\n  name?: string;\n  author?: string;\n  date?: number;\n  columnFirst?: number;\n  columnLast?: number;\n  displacedByCustomXml?: string;\n}\n\nexport interface EditorRevisionMetadata {`,
  ],
]);

patch("src/core/model/types/nodes.ts", [
  [
    `  EditorImageRunData,\n  EditorParagraphListStyle,`,
    `  EditorImageRunData,\n  EditorMoveRangeMarker,\n  EditorParagraphListStyle,`,
  ],
  [
    `  styles?: EditorTextStyle;\n  revision?: EditorRevision;\n}`,
    `  styles?: EditorTextStyle;\n  revision?: EditorRevision;\n  /** Zero-length move range boundary retained for lossless tracked-move round-trip. */\n  revisionRangeMarker?: EditorMoveRangeMarker;\n  /** Enclosing inline w:sdt wrappers, outermost first. */\n  sdtWrappers?: EditorSdtBlockWrapper[];\n}`,
  ],
]);

patch("src/core/model/index.ts", [
  [
    `  EditorRevision,\n  EditorRevisionMetadata,\n  EditorNumberingRevision,`,
    `  EditorRevision,\n  EditorRevisionMetadata,\n  EditorMoveRangeMarker,\n  EditorNumberingRevision,`,
  ],
]);

patch("src/index.ts", [
  [
    `export type { DocumentPersistence } from "./app/controllers/useEditorPersistence.js";`,
    `export {\n  projectTrackedRevisions,\n  resolveAllTrackedRevisions,\n  resolveTrackedRevision,\n} from "./core/document/trackedRevisions.js";\nexport type {\n  EditorTrackedRevisionAction,\n  EditorTrackedRevisionIssue,\n  EditorTrackedRevisionIssueKind,\n  EditorTrackedRevisionResolutionResult,\n  EditorTrackedRevisionView,\n} from "./core/document/trackedRevisions.js";\n\nexport type { DocumentPersistence } from "./app/controllers/useEditorPersistence.js";`,
  ],
]);

patch("tests/vitest/__tests__/core/trackedRevisions.test.ts", [
  [
    `  EditorDocument,\n  EditorPageSettings,`,
    `  EditorBlockNode,\n  EditorDocument,\n  EditorPageSettings,`,
  ],
  [
    `function documentWithBlocks(blocks: EditorDocument["sections"][number]["blocks"]): EditorDocument {`,
    `function documentWithBlocks(blocks: EditorBlockNode[]): EditorDocument {`,
  ],
]);

console.log("Applied tracked revision resolver contract patch.");
