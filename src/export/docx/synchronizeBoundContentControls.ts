import type {
  EditorBlockNode,
  EditorDocument,
  EditorSdtBlockWrapper,
} from "@/core/model.js";
import { getDocumentSectionsCanonical, getParagraphText } from "@/core/model.js";
import { writeCustomXmlBinding } from "@/ooxml/word/customXmlBinding.js";

interface BoundControlAccumulator {
  wrapper: EditorSdtBlockWrapper;
  texts: string[];
}

function collectBlockText(block: EditorBlockNode): string {
  if (block.type === "paragraph") return getParagraphText(block);
  const values: string[] = [];
  for (const row of block.rows) {
    for (const cell of row.cells) {
      for (const nested of cell.blocks) {
        const value = collectBlockText(nested);
        if (value) values.push(value);
      }
    }
  }
  return values.join("\n");
}

function collectBoundControlsFromBlocks(
  blocks: EditorBlockNode[] | undefined,
  controls: Map<string, BoundControlAccumulator>,
): void {
  if (!blocks) return;
  for (const block of blocks) {
    const text = collectBlockText(block);
    for (const wrapper of block.sdtWrappers ?? []) {
      if (!wrapper.sdtPr.dataBinding) continue;
      const current = controls.get(wrapper.groupId);
      if (current) {
        current.texts.push(text);
      } else {
        controls.set(wrapper.groupId, { wrapper, texts: [text] });
      }
    }

    if (block.type === "table") {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          collectBoundControlsFromBlocks(cell.blocks, controls);
        }
      }
    }
  }
}

export function synchronizeBoundContentControls(document: EditorDocument): number {
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
  for (const { wrapper, texts } of controls.values()) {
    const binding = wrapper.sdtPr.dataBinding;
    if (!binding) continue;
    const value = texts.join("\n");
    if (writeCustomXmlBinding(document.sourcePackage, binding, value)) {
      synchronized += 1;
    }
  }
  return synchronized;
}
