import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorSdtBlockWrapper,
  EditorTableCellNode,
  EditorTableRowNode,
} from "@/core/model.js";
import {
  getDocumentSectionsCanonical,
  getParagraphText,
} from "@/core/model.js";
import { writeCustomXmlBinding } from "@/ooxml/word/customXmlBinding.js";

interface BoundControlAccumulator {
  wrapper: EditorSdtBlockWrapper;
  value: string;
}

function appendBoundControlText(
  controls: Map<string, BoundControlAccumulator>,
  wrapper: EditorSdtBlockWrapper,
  text: string,
  separator: string,
): void {
  if (!wrapper.sdtPr.dataBinding) return;
  const current = controls.get(wrapper.groupId);
  if (current) {
    current.value += `${separator}${text}`;
  } else {
    controls.set(wrapper.groupId, { wrapper, value: text });
  }
}

function collectCellText(cell: EditorTableCellNode): string {
  return cell.blocks.map(collectBlockText).filter(Boolean).join("\n");
}

function collectRowText(row: EditorTableRowNode): string {
  return row.cells.map(collectCellText).filter(Boolean).join("\t");
}

function collectBlockText(block: EditorBlockNode): string {
  if (block.type === "paragraph") return getParagraphText(block);
  return block.rows.map(collectRowText).filter(Boolean).join("\n");
}

function collectInlineBoundControls(
  paragraph: EditorParagraphNode,
  controls: Map<string, BoundControlAccumulator>,
): void {
  for (const run of paragraph.runs) {
    for (const wrapper of run.sdtWrappers ?? []) {
      appendBoundControlText(controls, wrapper, run.text, "");
    }
    if (run.kind === "textBox") {
      collectBoundControlsFromBlocks(run.textBox.blocks, controls);
    }
  }
}

function collectTableBoundControls(
  block: Extract<EditorBlockNode, { type: "table" }>,
  controls: Map<string, BoundControlAccumulator>,
): void {
  for (const row of block.rows) {
    const rowText = collectRowText(row);
    for (const wrapper of row.sdtWrappers ?? []) {
      appendBoundControlText(controls, wrapper, rowText, "\n");
    }
    for (const cell of row.cells) {
      const cellText = collectCellText(cell);
      for (const wrapper of cell.sdtWrappers ?? []) {
        appendBoundControlText(controls, wrapper, cellText, "\n");
      }
      collectBoundControlsFromBlocks(cell.blocks, controls);
    }
  }
}

function collectBoundControlsFromBlocks(
  blocks: EditorBlockNode[] | undefined,
  controls: Map<string, BoundControlAccumulator>,
): void {
  if (!blocks) return;
  for (const block of blocks) {
    const text = collectBlockText(block);
    for (const wrapper of block.sdtWrappers ?? []) {
      appendBoundControlText(controls, wrapper, text, "\n");
    }

    if (block.type === "paragraph") {
      collectInlineBoundControls(block, controls);
    } else {
      collectTableBoundControls(block, controls);
    }
  }
}

export function synchronizeBoundContentControls(
  document: EditorDocument,
): number {
  if (!document.sourcePackage) return 0;
  const controls = new Map<string, BoundControlAccumulator>();

  for (const section of getDocumentSectionsCanonical(document)) {
    collectBoundControlsFromBlocks(section.blocks, controls);
    collectBoundControlsFromBlocks(section.header, controls);
    collectBoundControlsFromBlocks(section.firstPageHeader, controls);
    collectBoundControlsFromBlocks(section.evenPageHeader, controls);
    collectBoundControlsFromBlocks(section.footer, controls);
    collectBoundControlsFromBlocks(section.firstPageFooter, controls);
    collectBoundControlsFromBlocks(section.evenPageFooter, controls);
  }

  let synchronized = 0;
  for (const { wrapper, value } of controls.values()) {
    const binding = wrapper.sdtPr.dataBinding;
    if (!binding) continue;
    if (writeCustomXmlBinding(document.sourcePackage, binding, value)) {
      synchronized += 1;
    }
  }
  return synchronized;
}
