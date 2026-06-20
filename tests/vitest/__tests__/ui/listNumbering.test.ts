import { describe, expect, it } from "vitest";

import {
  createEditorDocument,
  createEditorParagraph,
} from "@/core/editorState.js";
import { resolveListPrefix } from "@/ui/canvas/listNumbering.js";
import { getAlignedListLabelInset } from "@/ui/textMeasurement/indentation.js";

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

  it("resolves composite labels per OOXML list instance", () => {
    const first = orderedParagraph("First", 0);
    first.list = {
      kind: "ordered",
      level: 0,
      instanceId: "7",
      format: "upperRoman",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "%1.",
    };
    const child = orderedParagraph("Child", 1);
    child.list = {
      kind: "ordered",
      level: 1,
      instanceId: "7",
      format: "lowerLetter",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "%1.%2)",
    };
    const restarted = orderedParagraph("Restarted", 0);
    restarted.list = { ...first.list, instanceId: "8", startAt: 4 };
    const document = createEditorDocument([first, child, restarted]);

    expect(resolveListPrefix(first, document)).toBe("I.");
    expect(resolveListPrefix(child, document)).toBe("I.a)");
    expect(resolveListPrefix(restarted, document)).toBe("IV.");
  });

  it("uses decimal digits for legal numbering and aligns the marker box", () => {
    const paragraph = orderedParagraph("Legal", 1);
    paragraph.style = { indentLeft: 40, indentHanging: 40 };
    paragraph.list = {
      kind: "ordered",
      level: 1,
      instanceId: "9",
      format: "lowerLetter",
      levelFormats: ["upperRoman", "lowerLetter"],
      levelText: "%1.%2.",
      legal: true,
      alignment: "right",
    };
    const parent = orderedParagraph("Parent", 0);
    parent.list = { ...paragraph.list, level: 0, format: "upperRoman" };
    const document = createEditorDocument([parent, paragraph]);

    expect(resolveListPrefix(paragraph, document)).toBe("1.1.");
    expect(getAlignedListLabelInset(paragraph, undefined, 40, 12)).toBe(28);
    paragraph.list.alignment = "center";
    expect(getAlignedListLabelInset(paragraph, undefined, 40, 12)).toBe(14);
  });
});
