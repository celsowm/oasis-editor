import { describe, expect, it, vi } from "vitest";
import { createDocumentExporter } from "@/app/controllers/documentIO/DocumentExporter.js";
import type { EditorDocument } from "@/core/model.js";

vi.mock("@/export/pdf/exportEditorDocumentToPdf.js", () => ({
  exportEditorDocumentToPdfBlob: vi
    .fn()
    .mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
}));

vi.mock("@/export/docx/exportEditorDocumentToDocxPreservingSource.js", () => ({
  exportEditorDocumentToDocxBlobPreservingSource: vi
    .fn()
    .mockResolvedValue(
      new Blob(["docx"], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ),
}));

describe("createDocumentExporter - print", () => {
  it("hands the generated PDF blob to print() instead of downloading it", async () => {
    const print = vi.fn().mockResolvedValue(undefined);
    const download = vi.fn();
    const focusInput = vi.fn();
    const exporter = createDocumentExporter({
      document: (): EditorDocument => ({}) as EditorDocument,
      focusInput,
      download,
      print,
    });

    const blob = await exporter.handlePrint();

    expect(blob.type).toBe("application/pdf");
    expect(print).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledWith(blob);
    expect(download).not.toHaveBeenCalled();
    expect(focusInput).toHaveBeenCalledTimes(1);
  });

  it("ignores a second print request while one is already in flight", async () => {
    let resolvePrint: () => void = () => {};
    const print = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePrint = resolve;
        }),
    );
    const exporter = createDocumentExporter({
      document: (): EditorDocument => ({}) as EditorDocument,
      focusInput: vi.fn(),
      print,
    });

    const first = exporter.handlePrint();
    // Let the (mocked) PDF generation resolve and `print()` actually start
    // before firing the second, overlapping request.
    while (print.mock.calls.length === 0) {
      await Promise.resolve();
    }
    const second = exporter.handlePrint();
    resolvePrint();
    await Promise.all([first, second]);

    expect(print).toHaveBeenCalledTimes(1);
  });
});
