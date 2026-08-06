import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  getDocumentSectionsCanonical,
  paragraphOffsetToPosition,
  type EditorBlockNode,
  type EditorTableNode,
} from "@/core/model.js";
import { createEditorTableOperations } from "@/app/controllers/useEditorTableOperations.js";

function createOperations() {
  return createEditorTableOperations({
    applyTransactionalState: (): void => undefined,
    applySelectionToStatePreservingStructure: (current, selection) => ({
      ...current,
      selection,
    }),
    focusInput: (): void => undefined,
  });
}

function nestedTableStory(label: string): {
  blocks: EditorBlockNode[];
  activeParagraph: ReturnType<typeof createEditorParagraph>;
} {
  const activeParagraph = createEditorParagraph(`${label}:active`);
  const inner = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([activeParagraph]),
      createEditorTableCell([createEditorParagraph(`${label}:sibling`)]),
    ]),
    createEditorTableRow([
      createEditorTableCell([createEditorParagraph(`${label}:lower-left`)]),
      createEditorTableCell([createEditorParagraph(`${label}:lower-right`)]),
    ]),
  ]);
  const outer = createEditorTable([
    createEditorTableRow([
      createEditorTableCell([
        createEditorParagraph(`${label}:before`),
        inner,
        createEditorParagraph(`${label}:after`),
      ]),
    ]),
  ]);
  return { blocks: [outer], activeParagraph };
}

function getNestedTable(blocks: EditorBlockNode[]): EditorTableNode {
  const outer = blocks[0];
  if (!outer || outer.type !== "table") {
    throw new Error("Expected outer table.");
  }
  const inner = outer.rows[0]?.cells[0]?.blocks.find(
    (block) => block.type === "table",
  );
  if (!inner || inner.type !== "table") {
    throw new Error("Expected nested table.");
  }
  return inner;
}

describe("nested table operations in document stories", () => {
  it("updates first-page header content without replacing the default header", () => {
    const main = createEditorParagraph("main");
    const normalHeader = createEditorParagraph("normal header");
    const story = nestedTableStory("first-header");
    const document = createEditorDocument([main]);
    const section = document.sections![0]!;
    section.header = [normalHeader];
    section.firstPageHeader = story.blocks;

    const base = createEditorStateFromDocument(document);
    const position = paragraphOffsetToPosition(story.activeParagraph, 0);
    const state = {
      ...base,
      activeSectionIndex: 0,
      activeZone: "header" as const,
      selection: { anchor: position, focus: position },
    };

    const result = createOperations().insertSelectedTableRow(state, 1);
    const resultSection = getDocumentSectionsCanonical(result.document)[0]!;

    expect(getNestedTable(resultSection.firstPageHeader ?? []).rows).toHaveLength(
      3,
    );
    expect(resultSection.header?.[0]).toBe(normalHeader);
    expect(resultSection.blocks[0]).toBe(main);
  });

  it("updates a nested table inside a footnote without touching main content", () => {
    const main = createEditorParagraph("main");
    const story = nestedTableStory("footnote");
    const document = createEditorDocument([main]);
    document.footnotes = {
      items: {
        "footnote:test": {
          id: "footnote:test",
          blocks: story.blocks,
        },
      },
    };

    const base = createEditorStateFromDocument(document);
    const position = paragraphOffsetToPosition(story.activeParagraph, 0);
    const state = {
      ...base,
      activeSectionIndex: 0,
      activeZone: "footnote" as const,
      activeFootnoteId: "footnote:test",
      selection: { anchor: position, focus: position },
    };

    const result = createOperations().insertSelectedTableColumn(state, 1);
    const footnoteBlocks =
      result.document.footnotes?.items["footnote:test"]?.blocks ?? [];

    expect(getNestedTable(footnoteBlocks).rows[0]?.cells).toHaveLength(3);
    expect(getDocumentSectionsCanonical(result.document)[0]?.blocks[0]).toBe(
      main,
    );
  });
});
