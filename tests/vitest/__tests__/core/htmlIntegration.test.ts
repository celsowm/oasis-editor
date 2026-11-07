// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createInitialEditorState, createEditorStateFromDocument } from "@/core/editorState.js";
import { createOasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { importHtmlToEditorDocument } from "@/import/html/importHtmlToEditorDocument.js";
import { exportEditorDocumentToHtml } from "@/export/html/exportEditorDocumentToHtml.js";
import { insertHtmlAtSelection } from "@/core/commands/html.js";
import { getDocumentParagraphsCanonical, getParagraphText } from "@/core/model.js";
import { Editor } from "@/core/Editor.js";

describe("Oasis HTML embedding API", () => {
  const legal = '<h3>Dos fatos</h3><p style="text-align:justify"><strong>#autor</strong> requer a intimação de #reu no processo #cnj.</p>' +
    '<table><tr><th>Documento</th><th>Valor</th></tr><tr><td>RG</td><td>R$ 100</td></tr></table>';

  it("round-trips headings, text, hashtags and table cells", () => {
    const document = importHtmlToEditorDocument(legal);
    const html = exportEditorDocumentToHtml(document);
    expect(html).toContain("<h3>Dos fatos</h3>");
    expect(html).toContain("<strong>#autor</strong>");
    expect(html).toContain("#reu");
    expect(html).toContain("#cnj");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Documento</th>");
    const again = importHtmlToEditorDocument(html);
    expect(getDocumentParagraphsCanonical(again).map(getParagraphText).join(" "))
      .toContain("processo #cnj.");
  });

  it("exports standalone HTML with escaped title", () => {
    const document = importHtmlToEditorDocument("<p>Teste</p>");
    document.metadata = { title: "Peça <jurídica>" };
    const html = exportEditorDocumentToHtml(document, { fullDocument: true });
    expect(html).toContain("<title>Peça &lt;jurídica&gt;</title>");
    expect(html).toContain("<body><p>Teste</p></body>");
  });

  it("inserts formatted paragraphs at the cursor, preserving suffix", () => {
    const document = importHtmlToEditorDocument("<p>Antes depois</p>");
    const state = createEditorStateFromDocument(document, { offset: 6 });
    const updated = insertHtmlAtSelection(state, "<p><strong>#autor</strong></p>");
    const text = getDocumentParagraphsCanonical(updated.document).map(getParagraphText).join(" ");
    expect(text).toContain("Antes #autor depois");
    expect(exportEditorDocumentToHtml(updated.document)).toContain("<strong>#autor</strong>");
  });

  it("inserts a table without dropping surrounding paragraphs", () => {
    const document = importHtmlToEditorDocument("<p>Antes depois</p>");
    const state = createEditorStateFromDocument(document, { offset: 6 });
    const updated = insertHtmlAtSelection(state, "<table><tr><td>#cnj</td></tr></table>");
    const html = exportEditorDocumentToHtml(updated.document);
    expect(html).toContain("<table>");
    expect(html).toContain("#cnj");
    expect(html).toContain("Antes");
    expect(html).toContain("depois");
  });

  it("loads and exports HTML through client.io without changing DOCX/PDF", async () => {
    const editor = await Editor.create({ plugins: [] });
    const client = createOasisEditorClient();
    let state = createInitialEditorState();
    client.connectHost({
      getRuntimeEditor: () => editor,
      getState: () => state,
      getDocument: () => state.document,
      setDocument: (document) => { state = createEditorStateFromDocument(document); },
      resetDocument: () => { state = createInitialEditorState(); },
      saveDocument: async () => {},
      getSelection: () => state.selection,
      setSelection: (selection) => { state.selection = selection; },
      focus: vi.fn(),
      blur: vi.fn(),
      clearHistory: vi.fn(),
      importDocx: async () => {},
      exportDocx: async () => new Blob(),
      exportPdf: async () => new Blob(),
      exportDocxBlob: async () => new Blob(),
      exportPdfBlob: async () => new Blob(),
    });
    client.resolveReady(editor);
    const imported = await client.io.import({ format: "html", data: legal });
    expect(imported.ok).toBe(true);
    expect(client.document.isDirty()).toBe(false);
    const output = await client.io.export({ format: "html" });
    expect(output.ok).toBe(true);
    if (output.ok) {
      expect(output.value.blob.type).toContain("text/html");
      expect(await output.value.blob.text()).toContain("#autor");
    }
    await expect(client.export.html()).resolves.toContain("#cnj");
    await client.import.html("<p>#reu</p>");
    expect(client.document.isDirty()).toBe(false);
    expect(await client.export.html()).toContain("#reu");
    await editor.destroy();
  });
});
