import { describe, expect, it } from "vitest";
import { serializeTextRunToHtml } from "../../../../src/core/html/htmlTextSerializer.js";

describe("HTML text style serialization", () => {
  it("serializes run language metadata as HTML lang and Oasis data attributes", () => {
    const html = serializeTextRunToHtml({
      id: "run-1",
      text: "Texto",
      styles: {
        language: { value: "pt-BR", eastAsia: "ja-JP", bidi: "ar-SA" },
      },
    });

    expect(html).toBe(
      '<span style="hyphens:auto" lang="pt-BR" data-oasis-lang-value="pt-BR" data-oasis-lang-east-asia="ja-JP" data-oasis-lang-bidi="ar-SA">Texto</span>',
    );
  });
});
