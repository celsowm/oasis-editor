import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorTableCell,
  createEditorTableRow,
  createEditorTable,
} from "@/core/editorState.js";
import { buildListLabels } from "@/core/model.js";
import { setEditorListOoxmlNumberingMetadata } from "@/ooxml/word/numberingMetadata.js";

function numbered(
  text: string,
  level: number,
  options: {
    instanceId?: string;
    format?: "decimal" | "upperRoman" | "lowerLetter" | "lowerRoman";
    levelFormats?: Array<"decimal" | "upperRoman" | "lowerLetter" | "lowerRoman">;
    levelText?: string;
    legal?: boolean;
    startAt?: number;
    restartAfterLevel?: number;
  } = {},
) {
  const paragraph = createEditorParagraph(text);
  paragraph.list = {
    kind: "ordered",
    level,
    ...(options.instanceId ? { instanceId: options.instanceId } : {}),
    ...(options.format ? { format: options.format } : {}),
    ...(options.levelFormats ? { levelFormats: options.levelFormats } : {}),
    ...(options.levelText ? { levelText: options.levelText } : {}),
    ...(options.legal ? { legal: true } : {}),
    ...(options.startAt !== undefined ? { startAt: options.startAt } : {}),
  };
  if (options.restartAfterLevel !== undefined) {
    setEditorListOoxmlNumberingMetadata(paragraph.list, {
      restartAfterLevel: options.restartAfterLevel,
    });
  }
  return paragraph;
}

const FORMATS = ["upperRoman", "lowerLetter", "decimal"] as const;

describe("multilevel legal numbering", () => {
  it("renders three levels with the format of each referenced level", () => {
    const first = numbered("I", 0, {
      instanceId: "legal",
      format: "upperRoman",
      levelFormats: [...FORMATS],
      levelText: "%1.",
    });
    const child = numbered("A", 1, {
      instanceId: "legal",
      format: "lowerLetter",
      levelFormats: [...FORMATS],
      levelText: "%1.%2.",
    });
    const grandchild = numbered("1", 2, {
      instanceId: "legal",
      format: "decimal",
      levelFormats: [...FORMATS],
      levelText: "%1.%2.%3.",
    });
    const labels = buildListLabels(
      createEditorDocument([first, child, grandchild]),
      "en-US",
    );
    expect(labels.get(first.id)).toBe("I.");
    expect(labels.get(child.id)).toBe("I.a.");
    expect(labels.get(grandchild.id)).toBe("I.a.1.");
  });

  it("keeps an imported referenced format when a deeper level is edited", () => {
    const first = numbered("I", 0, {
      instanceId: "legal",
      format: "upperRoman",
      levelFormats: [...FORMATS],
      levelText: "%1.",
    });
    const child = numbered("a", 1, {
      instanceId: "legal",
      format: "lowerRoman",
      levelFormats: [...FORMATS],
      levelText: "%1.%2.",
    });
    const labels = buildListLabels(
      createEditorDocument([first, child]),
      "en-US",
    );
    expect(labels.get(child.id)).toBe("I.i.");
  });

  it("restarts deeper counters when w:lvlRestart triggers", () => {
    const first = numbered("I", 0, {
      instanceId: "restart",
      format: "upperRoman",
      levelFormats: [...FORMATS],
      levelText: "%1.",
    });
    const child = numbered("a", 1, {
      instanceId: "restart",
      format: "lowerLetter",
      levelFormats: [...FORMATS],
      levelText: "%1.%2.",
      restartAfterLevel: 1,
    });
    const second = numbered("II", 0, {
      instanceId: "restart",
      format: "upperRoman",
      levelFormats: [...FORMATS],
      levelText: "%1.",
    });
    const restartedChild = numbered("a", 1, {
      instanceId: "restart",
      format: "lowerLetter",
      levelFormats: [...FORMATS],
      levelText: "%1.%2.",
      restartAfterLevel: 1,
    });
    const labels = buildListLabels(
      createEditorDocument([first, child, second, restartedChild]),
      "en-US",
    );
    expect(labels.get(child.id)).toBe("I.a.");
    expect(labels.get(second.id)).toBe("II.");
    expect(labels.get(restartedChild.id)).toBe("II.a.");
  });

  it("uses decimals for every referenced level under isLgl", () => {
    const paragraph = numbered("legal", 1, {
      instanceId: "lgl",
      format: "lowerLetter",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "Art. %1.%2º",
      legal: true,
    });
    const labels = buildListLabels(createEditorDocument([paragraph]), "en-US");
    expect(labels.get(paragraph.id)).toBe("Art. 1.1º");
  });

  it("keeps counters continuous through table cells", () => {
    const first = numbered("A", 0, { instanceId: "table" });
    const insideTable = numbered("B", 0, { instanceId: "table" });
    const table = createEditorTable([
      createEditorTableRow([createEditorTableCell([insideTable])]),
    ]);
    const labels = buildListLabels(
      createEditorDocument([first, table]),
      "en-US",
    );
    expect(labels.get(first.id)).toBe("1.");
    expect(labels.get(insideTable.id)).toBe("2.");
  });
});
