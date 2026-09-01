import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
} from "@/core/editorState.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import {
  applyDocumentTheme,
  setDocumentPageBorder,
  setDocumentPageColor,
  setDocumentWatermark,
} from "@/core/commands/design.js";

describe("document design commands", () => {
  it("applies a theme only to semantic styles", () => {
    const document = createEditorDocument(
      [createEditorParagraph("text")],
      undefined,
      undefined,
      {
        normal: {
          id: "normal",
          name: "Normal",
          type: "paragraph",
          textStyle: { color: "#000000" },
        },
        custom: {
          id: "custom",
          name: "Custom",
          type: "paragraph",
          qFormat: true,
          textStyle: { color: "#123456" },
        },
      },
    );
    const state = applyDocumentTheme(
      createEditorStateFromDocument(document),
      "ion",
    );
    expect(state.document.styles?.normal?.textStyle?.color).toBe("#262626");
    expect(state.document.styles?.custom?.textStyle?.color).toBe("#123456");
  });

  it("stores and clears page design settings", () => {
    const state = createEditorStateFromDocument(
      createEditorDocument([createEditorParagraph("")]),
    );
    const colored = setDocumentPageColor(state, "#fef3c7");
    const bordered = setDocumentPageBorder(colored, {
      style: "double",
      color: "#b45309",
      width: 2,
    });
    const marked = setDocumentWatermark(bordered, {
      kind: "text",
      text: "RASCUNHO",
    });
    expect(marked.document.design?.pageColor).toBe("#fef3c7");
    expect(marked.document.sections?.[0]?.pageBorder?.style).toBe("double");
    expect(marked.document.design?.watermark?.text).toBe("RASCUNHO");
    expect(
      setDocumentWatermark(marked, null).document.design?.watermark,
    ).toBeNull();
  });
});
