import { describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { EditorSurface } from "../../ui/components/EditorSurface.js";
import { createEditor2Document, createEditor2ParagraphFromRuns } from "../../core/editorState.js";
import type { Editor2State } from "../../core/model.js";

describe("EditorSurface", () => {
  it("renders separate DOM runs for a multi-run paragraph", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
        />
      ),
      container,
    );

    const runNodes = container.querySelectorAll('[data-testid="editor-2-run"]');
    const charNodes = container.querySelectorAll('[data-testid="editor-2-char"]');

    expect(runNodes.length).toBe(2);
    expect(runNodes[0]?.getAttribute("data-run-id")).toBe(paragraph.runs[0]?.id);
    expect(runNodes[1]?.getAttribute("data-run-id")).toBe(paragraph.runs[1]?.id);
    expect(charNodes[0]?.getAttribute("data-char-index")).toBe("0");
    expect(charNodes[1]?.getAttribute("data-char-index")).toBe("1");
    expect(charNodes[2]?.getAttribute("data-char-index")).toBe("2");
    expect(charNodes[3]?.getAttribute("data-char-index")).toBe("3");

    dispose();
  });

  it("applies inline run styles from the semantic AST", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([
      {
        text: "ab",
        styles: {
          bold: true,
          italic: true,
          underline: true,
          strike: true,
          color: "#112233",
          highlight: "#ffee00",
          fontFamily: "Georgia",
          fontSize: 18,
        },
      },
    ]);
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
        />
      ),
      container,
    );

    const runNode = container.querySelector('[data-testid="editor-2-run"]') as HTMLSpanElement;

    expect(runNode.style.fontWeight).toBe("700");
    expect(runNode.style.fontStyle).toBe("italic");
    expect(runNode.style.textDecoration).toContain("underline");
    expect(runNode.style.textDecoration).toContain("line-through");
    expect(runNode.style.color).toBe("rgb(17, 34, 51)");
    expect(runNode.style.backgroundColor).toBe("rgb(255, 238, 0)");
    expect(runNode.style.fontFamily).toContain("Georgia");
    expect(runNode.style.fontSize).toBe("18px");

    dispose();
  });

  it("applies paragraph layout styles from the semantic AST", () => {
    const container = document.createElement("div");
    const paragraph = createEditor2ParagraphFromRuns([{ text: "ab" }]);
    paragraph.style = {
      align: "center",
      lineHeight: 1.8,
      spacingBefore: 12,
      spacingAfter: 8,
      indentLeft: 16,
      indentRight: 10,
      indentFirstLine: 24,
    };
    const state: Editor2State = {
      document: createEditor2Document([paragraph]),
      selection: {
        anchor: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
        focus: {
          paragraphId: paragraph.id,
          runId: paragraph.runs[0]!.id,
          offset: 0,
        },
      },
    };

    const dispose = render(
      () => (
        <EditorSurface
          state={() => state}
          onSurfaceMouseDown={() => undefined}
          onParagraphMouseDown={() => undefined}
        />
      ),
      container,
    );

    const blockNode = container.querySelector('[data-testid="editor-2-block"]') as HTMLParagraphElement;

    expect(blockNode.style.textAlign).toBe("center");
    expect(blockNode.style.lineHeight).toBe("1.8");
    expect(blockNode.style.paddingTop).toBe("12px");
    expect(blockNode.style.paddingBottom).toBe("8px");
    expect(blockNode.style.paddingLeft).toBe("16px");
    expect(blockNode.style.paddingRight).toBe("10px");
    expect(blockNode.style.textIndent).toBe("24px");

    dispose();
  });
});
