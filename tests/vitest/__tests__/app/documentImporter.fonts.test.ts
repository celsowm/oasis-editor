import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEditorDocument } from "@/core/editorState/documentFactories.js";
import { createEditorParagraph } from "@/core/editorState/nodeFactories.js";
import type { DocumentFormatImporter } from "@/import/DocumentFormatImporter.js";
import type { EditorLogger } from "@/utils/logger.js";

const mocks = vi.hoisted(() => ({
  importDocument: vi.fn(),
}));

vi.mock("@/import/documentImporterRegistry.js", () => ({
  resolveImporterForFile: (): DocumentFormatImporter => ({
    id: "docx",
    accept: [".docx"],
    matches: (): boolean => true,
    import: mocks.importDocument,
  }),
}));

vi.mock("@/ui/clipboardImage.js", () => ({
  readFileBuffer: (): Promise<ArrayBuffer> =>
    Promise.resolve(new ArrayBuffer(8)),
}));

import { createDocumentImporter } from "@/app/controllers/documentIO/DocumentImporter.js";

const logger: EditorLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("DocumentImporter font preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.importDocument.mockResolvedValue(
      createEditorDocument([createEditorParagraph("Goudy")]),
    );
  });

  it("prepares fonts before applying state and stabilizing layout", async () => {
    const events: string[] = [];
    const importer = createDocumentImporter({
      applyState: (): void => {
        events.push("apply");
      },
      stabilizeLayoutAfterImport: async (): Promise<void> => {
        events.push("stabilize");
      },
      resetEditorChromeState: (): void => {
        events.push("reset");
      },
      focusInput: vi.fn(),
      requestLocalFontAccess: async (): Promise<boolean> => {
        events.push("request-local");
        return true;
      },
      prepareDocumentFonts: async (): Promise<void> => {
        events.push("prepare-fonts");
      },
      setImportPhase: (phase): void => {
        events.push(`phase:${phase}`);
      },
      clearImportProgressSoon: vi.fn(),
      now: (): number => 1,
      logger,
    });

    await importer.handleImportFile(
      new File([new Uint8Array([1])], "goudy.docx"),
    );

    expect(events.indexOf("request-local")).toBeLessThan(
      events.indexOf("prepare-fonts"),
    );
    expect(events.indexOf("phase:preparing-fonts")).toBeLessThan(
      events.indexOf("prepare-fonts"),
    );
    expect(events.indexOf("prepare-fonts")).toBeLessThan(
      events.indexOf("apply"),
    );
    expect(events.indexOf("apply")).toBeLessThan(events.indexOf("stabilize"));
    expect(events.at(-1)).toBe("phase:done");
  });

  it("continues with font preparation when local access is denied", async () => {
    const prepareDocumentFonts = vi.fn(async (): Promise<void> => undefined);
    const applyState = vi.fn();
    const importer = createDocumentImporter({
      applyState,
      stabilizeLayoutAfterImport: async (): Promise<void> => undefined,
      resetEditorChromeState: vi.fn(),
      focusInput: vi.fn(),
      requestLocalFontAccess: (): Promise<boolean> =>
        Promise.reject(new Error("denied")),
      prepareDocumentFonts,
      setImportPhase: vi.fn(),
      clearImportProgressSoon: vi.fn(),
      now: (): number => 1,
      logger,
    });

    await importer.handleImportFile(
      new File([new Uint8Array([1])], "goudy.docx"),
    );

    expect(prepareDocumentFonts).toHaveBeenCalledOnce();
    expect(applyState).toHaveBeenCalledOnce();
  });
});
