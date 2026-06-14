import { describe, expect, it } from "vitest";

import {
  createEditorDocument,
  createEditorParagraph,
} from "../../../../src/core/editorState.js";
import { resolveListPrefix } from "../../../../src/ui/canvas/listNumbering.js";

function orderedParagraph(text: string, level = 0) {
  const paragraph = createEditorParagraph(text);
  paragraph.list = { kind: "ordered", level };
  return paragraph;
}

describe("list numbering", () => {
  it("counts ordered paragraphs continuously across non-list gaps", () => {
    const first = orderedParagraph("Objetivo");
    const gap = createEditorParagraph("corpo de texto");
    const second = orderedParagraph("Regras de Negócio");
    const gap2 = createEditorParagraph("mais corpo");
    const third = orderedParagraph("Regras de interface");
    const document = createEditorDocument([first, gap, second, gap2, third]);

    expect(resolveListPrefix(first, document)).toBe("1.");
    expect(resolveListPrefix(second, document)).toBe("2.");
    expect(resolveListPrefix(third, document)).toBe("3.");
  });

  it("tracks each level with its own continuous counter", () => {
    const l0a = orderedParagraph("A", 0);
    const l1a = orderedParagraph("a", 1);
    const l1b = orderedParagraph("b", 1);
    const l0b = orderedParagraph("B", 0);
    const document = createEditorDocument([l0a, l1a, l1b, l0b]);

    expect(resolveListPrefix(l0a, document)).toBe("1.");
    expect(resolveListPrefix(l1a, document)).toBe("a.");
    expect(resolveListPrefix(l1b, document)).toBe("b.");
    expect(resolveListPrefix(l0b, document)).toBe("2.");
  });
});
