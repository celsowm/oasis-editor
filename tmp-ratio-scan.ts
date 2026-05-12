import { readFileSync } from "node:fs";
import { importDocxToEditorDocument } from "./src/import/docx/importDocxToEditorDocument.js";
import { projectDocumentLayout } from "./src/ui/layoutProjection.js";

const path = "src/__tests__/word-parity/fixtures/lorem_ipsum_complex_document.docx";
const buffer = readFileSync(path);

for (const ratio of [0.95, 0.96, 0.97, 0.98, 0.99, 1]) {
  const document = await importDocxToEditorDocument(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
  for (const block of document.blocks) {
    if (block.type !== "paragraph" || block.style?.align !== "justify" || block.style.lineHeight === undefined) {
      continue;
    }
    const maxFontSize = Math.max(...block.runs.map((run) => run.styles?.fontSize ?? 0));
    block.style.lineHeight = Math.round(((24 * ratio) / (maxFontSize * 1.223)) * 10000) / 10000;
  }
  const layout = projectDocumentLayout(document);
  const lines = layout.pages[0]?.blocks
    ?.flatMap((block) =>
      block.layout?.lines
        ?.map((line) => line.fragments.map((fragment) => fragment.text).join("").trim())
        .filter(Boolean) ?? [],
    ) ?? [];
  console.log(ratio, lines.length, lines.at(-1));
}
