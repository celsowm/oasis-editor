import { afterEach, describe, expect, it } from "vitest";
import { createEditorDocument } from "@/core/editorState/documentFactories.js";
import { createEditorParagraphFromRuns } from "@/core/editorState/nodeFactories.js";
import { layoutMetricsEpoch } from "@/layoutProjection/index.js";
import {
  clearDocumentFontPreparationCache,
  prepareDocumentFonts,
} from "@/ui/app/documentFontPreparation.js";

afterEach(() => {
  clearDocumentFontPreparationCache();
});

describe("document font preparation", () => {
  it("classifies unavailable fonts as fallback and deduplicates the same preparation", async () => {
    const document = createEditorDocument([
      createEditorParagraphFromRuns([
        { text: "Goudy", styles: { fontFamily: "Goudy Old Style" } },
      ]),
    ]);
    const firstLoad = prepareDocumentFonts(document, {
      remoteWebFonts: false,
    });
    const duplicateLoad = prepareDocumentFonts(document, {
      remoteWebFonts: false,
    });

    expect(duplicateLoad).toBe(firstLoad);
    const result = await firstLoad;
    const epochAfterFirstLoad = layoutMetricsEpoch();
    await duplicateLoad;

    expect(
      result.families.find((family) => family.requested === "Goudy Old Style")
        ?.source,
    ).toBe("fallback");
    expect(layoutMetricsEpoch()).toBe(epochAfterFirstLoad);
  });
});
