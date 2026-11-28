import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import {
  FALLBACK_NUMBERING_LOCALE,
  resolveNumberingLocale,
} from "@/core/format/resolveNumberingLocale.js";

function documentWithDefaultLanguage(language: string) {
  const document = createEditorDocument([createEditorParagraph("text")]);
  document.styles = {
    Normal: {
      id: "Normal",
      name: "Normal",
      type: "paragraph",
      isDefault: true,
      textStyle: { language: { value: language } },
    },
  };
  return document;
}

describe("resolveNumberingLocale", () => {
  it("falls back to pt-BR when the document declares no language", () => {
    const document = createEditorDocument([createEditorParagraph("text")]);
    expect(resolveNumberingLocale(document)).toBe(FALLBACK_NUMBERING_LOCALE);
  });

  it("uses the document default language before the editor setting", () => {
    const document = documentWithDefaultLanguage("en-US");
    expect(resolveNumberingLocale(document)).toBe("en-US");
    expect(resolveNumberingLocale(document, undefined, "pt-BR")).toBe("en-US");
  });

  it("uses the effective w:lang of the content over the document default", () => {
    const document = documentWithDefaultLanguage("en-US");
    const paragraph = createEditorParagraphFromRuns([
      { text: "item", styles: { language: { value: "pt-BR" } } },
    ]);
    expect(resolveNumberingLocale(document, paragraph, "de-DE")).toBe("pt-BR");
  });

  it("inherits w:lang from the paragraph style chain", () => {
    const document = documentWithDefaultLanguage("en-US");
    document.styles!.Base = {
      id: "Base",
      name: "Base",
      type: "paragraph",
      textStyle: { language: { value: "pt-BR" } },
    };
    document.styles!.Derived = {
      id: "Derived",
      name: "Derived",
      type: "paragraph",
      basedOn: "Base",
    };
    const paragraph = createEditorParagraph("item");
    paragraph.style = { styleId: "Derived" };
    expect(resolveNumberingLocale(document, paragraph)).toBe("pt-BR");
  });

  it("uses the explicit editor setting only when no w:lang exists", () => {
    const document = createEditorDocument([createEditorParagraph("text")]);
    expect(resolveNumberingLocale(document, undefined, "en-US")).toBe("en-US");
  });
});
