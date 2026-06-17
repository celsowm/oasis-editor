import { describe, expect, it } from "vitest";
import {
  importFileAccept,
  resolveImporterForFile,
} from "@/import/documentImporterRegistry.js";

describe("document importer registry", () => {
  it("resolves importers by file extension", () => {
    expect(resolveImporterForFile({ name: "report.docx" } as File)?.id).toBe(
      "docx",
    );
    expect(resolveImporterForFile({ name: "page.html" } as File)?.id).toBe(
      "html",
    );
    expect(resolveImporterForFile({ name: "page.HTM" } as File)?.id).toBe(
      "html",
    );
  });

  it("returns undefined for unsupported formats", () => {
    expect(
      resolveImporterForFile({ name: "notes.txt" } as File),
    ).toBeUndefined();
    expect(resolveImporterForFile({ name: "noext" } as File)).toBeUndefined();
  });

  it("exposes every registered extension for the file input accept", () => {
    const accept = importFileAccept();
    expect(accept).toContain(".docx");
    expect(accept).toContain(".html");
    expect(accept).toContain(".htm");
  });
});
