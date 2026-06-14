import { describe, it } from "vitest";
import fs from 'fs';
import { importDocxToEditorDocument } from "../../../src/import/docx/importDocxToEditorDocument.js";
import { projectDocumentLayout } from "../../../src/layoutProjection/documentLayout.js";
import { getParagraphText } from "../../../src/core/model.js";

describe.skip("inspect doc pagination", () => {
  it("paginates and logs content", async () => {
    const docxPath = 'C:\\Users\\celso\\Downloads\\HU - Criar relatório diário de comunicações processuais do DJE não recebidas no PGE Digital.docx';
    
    console.log("Loading docx...");
    const data = fs.readFileSync(docxPath);
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

    console.log("Importing docx to EditorDocument...");
    const doc = await importDocxToEditorDocument(arrayBuffer);

    console.log("Projecting document layout...");
    const layout = projectDocumentLayout(doc);

    console.log(`\nTotal Pages projected: ${layout.pages.length}\n`);

    layout.pages.forEach((page, pageIdx) => {
      console.log(`=========================================`);
      console.log(`PAGE ${pageIdx + 1} (Height: ${page.height}px / Max Height: ${page.maxHeight}px)`);
      console.log(`=========================================`);
      
      page.blocks.forEach((block, blockIdx) => {
        console.log(`Block ${blockIdx + 1}: Type = ${block.blockType}, Height = ${block.estimatedHeight}px`);
        
        if (
          block.blockType === 'paragraph' &&
          block.sourceBlock.type === 'paragraph'
        ) {
          const text = getParagraphText(block.sourceBlock);
          console.log(`  Paragraph Text: "${text}"`);
        } else if (
          block.blockType === 'table' &&
          block.sourceBlock.type === 'table'
        ) {
          const tableNode = block.sourceBlock;
          if (block.tableSegment) {
            const { startRowIndex, endRowIndex, startRowCellBlockStarts, endRowCellBlockEnds } = block.tableSegment;
            console.log(`  Table Segment: Rows ${startRowIndex} to ${endRowIndex} (starts: ${JSON.stringify(startRowCellBlockStarts)}, ends: ${JSON.stringify(endRowCellBlockEnds)})`);
            
            for (let r = startRowIndex; r < endRowIndex; r++) {
              const row = tableNode.rows[r];
              console.log(`    Row ${r}:`);
              row.cells.forEach((cell, cellIdx) => {
                const cellText = cell.blocks
                  .map((b) =>
                    b.type === 'paragraph'
                      ? getParagraphText(b)
                      : '[Nested table]',
                  )
                  .join(' | ');
                console.log(`      Cell ${cellIdx + 1}: "${cellText}"`);
              });
            }
          }
        }
      });
      console.log('\n');
    });
  });
});
