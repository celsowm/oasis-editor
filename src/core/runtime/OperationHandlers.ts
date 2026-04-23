import { EditorState } from "./EditorState.js";
import { EditorOperation, OperationType } from "../operations/OperationTypes.js";
import { transformBlocks } from "../document/BlockVisitor.js";
import { findBlockById, findParentTable } from "../document/BlockUtils.js";
import { isTextBlock, TextRun, BlockNode } from "../document/BlockTypes.js";
import { areMarksEqual } from "../document/MarkUtils.js";
import { LogicalPosition } from "../selection/SelectionTypes.js";
import { createParagraph, createTable, createImage, createTableRow, createTableCell } from "../document/DocumentFactory.js";
import { DEFAULT_LIST_INDENTATION } from "../composition/ParagraphComposer.js";

export type OperationHandler<T extends EditorOperation = any> = (
  state: EditorState,
  operation: T
) => EditorState;

const registry: Partial<Record<OperationType, OperationHandler>> = {};

export function registerHandler(type: OperationType, handler: OperationHandler) {
  registry[type] = handler;
}

export function getHandler(type: OperationType): OperationHandler | undefined {
  return registry[type];
}

// --- Internal Helpers ---

function recalculateListSequences(blocks: BlockNode[]): BlockNode[] {
    let currentSequenceIndex = 1;
    let inSequence = false;

    return blocks.map(block => {
        if (block.kind === "ordered-list-item") {
            const updated = { ...block, index: currentSequenceIndex++ };
            inSequence = true;
            return updated;
        } else {
            currentSequenceIndex = 1;
            inSequence = false;
            // Recursively handle nested blocks in tables if needed
            if (block.kind === "table") {
                const nextRows = block.rows.map(row => ({
                    ...row,
                    cells: row.cells.map(cell => ({
                        ...cell,
                        children: recalculateListSequences(cell.children)
                    }))
                }));
                return { ...block, rows: nextRows };
            }
            return block;
        }
    });
}

function updateDocumentSections(state: EditorState, blockId: string, updater: (block: BlockNode) => BlockNode | BlockNode[] | null): EditorState {
    const nextSections = state.document.sections.map(section => {
        const transformed = transformBlocks(section.children, (block) => {
            if (block.id === blockId) {
                return updater(block);
            }
            return block;
        });
        
        return {
            ...section,
            children: recalculateListSequences(transformed)
        };
    });

    return {
        ...state,
        document: {
            ...state.document,
            revision: state.document.revision + 1,
            sections: nextSections
        }
    };
}

function tryMergeSiblings(blocks: BlockNode[], targetId: string): { nextBlocks: BlockNode[], mergedPos: LogicalPosition | null } {
    const idx = blocks.findIndex(b => b.id === targetId);
    if (idx === -1) {
        let mergedPos: LogicalPosition | null = null;
        const nextBlocksDeep = blocks.map(block => {
            const result = transformContainerDeepForMerge(block, targetId);
            if (result.mergedPos) mergedPos = result.mergedPos;
            return result.block;
        });
        return { nextBlocks: nextBlocksDeep, mergedPos };
    }

    if (idx === 0) return { nextBlocks: blocks, mergedPos: null };

    const prev = blocks[idx - 1];
    const curr = blocks[idx];

    if (isTextBlock(prev) && isTextBlock(curr)) {
        const lastRun = prev.children[prev.children.length - 1];
        const mergePos: LogicalPosition = {
            sectionId: "",
            blockId: prev.id,
            inlineId: lastRun.id,
            offset: lastRun.text.length
        };

        const mergedBlock: BlockNode = {
            ...prev,
            children: [...prev.children, ...curr.children]
        };

        const mergedRuns: TextRun[] = [];
        for (const r of mergedBlock.children) {
            if (mergedRuns.length > 0 && r.text !== "" && areMarksEqual(mergedRuns[mergedRuns.length - 1].marks, r.marks)) {
                mergedRuns[mergedRuns.length - 1].text += r.text;
            } else {
                mergedRuns.push({ ...r });
            }
        }
        (mergedBlock as any).children = mergedRuns.length > 0 ? mergedRuns : [curr.children[0]];

        const nextBlocks = [...blocks];
        nextBlocks.splice(idx - 1, 2, mergedBlock);
        return { nextBlocks, mergedPos: mergePos };
    }

    return { nextBlocks: blocks, mergedPos: null };
}

function transformContainerDeepForMerge(container: any, targetId: string): { block: any, mergedPos: LogicalPosition | null } {
    if (!container || typeof container !== "object") return { block: container, mergedPos: null };
    
    let mergedPos: LogicalPosition | null = null;
    const result = { ...container };
    let hasChanges = false;

    for (const key in result) {
        const value = result[key];
        if (Array.isArray(value)) {
            if (value.length > 0 && "kind" in value[0] && "id" in value[0]) {
                const res = tryMergeSiblings(value, targetId);
                if (res.mergedPos) mergedPos = res.mergedPos;
                result[key] = res.nextBlocks;
                hasChanges = true;
            } else {
                result[key] = value.map(item => {
                    const res = transformContainerDeepForMerge(item, targetId);
                    if (res.mergedPos) mergedPos = res.mergedPos;
                    return res.block;
                });
                hasChanges = true;
            }
        }
    }
    return { block: hasChanges ? result : container, mergedPos };
}

function stripBlock(blocks: BlockNode[], blockId: string): { nextBlocks: BlockNode[], stripped: BlockNode | null } {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx !== -1) {
        const stripped = blocks[idx];
        const nextBlocks = [...blocks];
        nextBlocks.splice(idx, 1);
        return { nextBlocks, stripped };
    }

    let stripped: BlockNode | null = null;
    const nextBlocks = blocks.map(block => {
        const res = transformContainerDeepForStrip(block, blockId);
        if (res.stripped) stripped = res.stripped;
        return res.block;
    });

    return { nextBlocks, stripped };
}

function transformContainerDeepForStrip(container: any, blockId: string): { block: any, stripped: BlockNode | null } {
    if (!container || typeof container !== "object") return { block: container, stripped: null };
    
    let stripped: BlockNode | null = null;
    const result = { ...container };
    let hasChanges = false;

    for (const key in result) {
        const value = result[key];
        if (Array.isArray(value)) {
            if (value.length > 0 && "kind" in value[0] && "id" in value[0]) {
                const res = stripBlock(value, blockId);
                if (res.stripped) stripped = res.stripped;
                result[key] = res.nextBlocks;
                hasChanges = true;
            } else {
                result[key] = value.map(item => {
                    const res = transformContainerDeepForStrip(item, blockId);
                    if (res.stripped) stripped = res.stripped;
                    return res.block;
                });
                hasChanges = true;
            }
        }
    }
    return { block: hasChanges ? result : container, stripped };
}

function insertBlock(blocks: BlockNode[], targetId: string, blockToInsert: BlockNode, isBefore: boolean): { nextBlocks: BlockNode[], inserted: boolean } {
    const idx = blocks.findIndex(b => b.id === targetId);
    if (idx !== -1) {
        const nextBlocks = [...blocks];
        nextBlocks.splice(isBefore ? idx : idx + 1, 0, blockToInsert);
        return { nextBlocks, inserted: true };
    }

    let inserted = false;
    const nextBlocks = blocks.map(block => {
        const res = transformContainerDeepForInsert(block, targetId, blockToInsert, isBefore);
        if (res.inserted) inserted = true;
        return res.block;
    });

    return { nextBlocks, inserted };
}

function transformContainerDeepForInsert(container: any, targetId: string, blockToInsert: BlockNode, isBefore: boolean): { block: any, inserted: boolean } {
    if (!container || typeof container !== "object") return { block: container, inserted: false };
    
    let inserted = false;
    const result = { ...container };
    let hasChanges = false;

    for (const key in result) {
        const value = result[key];
        if (Array.isArray(value)) {
            if (value.length > 0 && "kind" in value[0] && "id" in value[0]) {
                const res = insertBlock(value, targetId, blockToInsert, isBefore);
                if (res.inserted) inserted = true;
                result[key] = res.nextBlocks;
                hasChanges = true;
            } else {
                result[key] = value.map(item => {
                    const res = transformContainerDeepForInsert(item, targetId, blockToInsert, isBefore);
                    if (res.inserted) inserted = true;
                    return res.block;
                });
                hasChanges = true;
            }
        }
    }
    return { block: hasChanges ? result : container, inserted };
}

// --- Handler Implementations ---

registerHandler(OperationType.SET_SELECTION, (state, op) => ({
    ...state,
    selection: op.payload.selection,
    selectedImageId: null,
    pendingMarks: undefined,
}));

registerHandler(OperationType.INSERT_TEXT, (state, op) => {
    const { selection, document, pendingMarks } = state;
    if (!selection) return state;
    const { blockId, inlineId, offset } = selection.anchor;
    const { text, newRunIds } = op.payload;

    const oldBlock = findBlockById(document, blockId);
    let absoluteOffset = 0;
    if (oldBlock && isTextBlock(oldBlock)) {
        for (const run of oldBlock.children) {
            if (run.id === inlineId) {
                absoluteOffset += offset;
                break;
            }
            absoluteOffset += run.text.length;
        }
    }

    const nextState = updateDocumentSections(state, blockId, (block) => {
        if (!isTextBlock(block)) return block;
        const nextChildren: TextRun[] = [];
        let runIdx = 0;
        for (const run of block.children) {
            if (run.id !== inlineId) {
                nextChildren.push(run);
                continue;
            }
            const beforeText = run.text.substring(0, offset);
            const afterText = run.text.substring(offset);

            if (pendingMarks) {
                if (beforeText) nextChildren.push({ ...run, id: newRunIds?.[runIdx++] || run.id + "_b", text: beforeText });
                nextChildren.push({ id: newRunIds?.[runIdx++] || run.id + "_t", text, marks: { ...run.marks, ...pendingMarks } });
                if (afterText) nextChildren.push({ ...run, id: newRunIds?.[runIdx++] || run.id + "_a", text: afterText });
            } else {
                nextChildren.push({ ...run, text: beforeText + text + afterText });
            }
        }

        const merged: TextRun[] = [];
        for (const r of nextChildren) {
            if (merged.length > 0 && r.text !== "" && areMarksEqual(merged[merged.length - 1].marks, r.marks)) {
                merged[merged.length - 1].text += r.text;
            } else {
                merged.push({ ...r });
            }
        }
        return { ...block, children: merged };
    });

    const targetAbsoluteOffset = absoluteOffset + text.length;
    let nextPosition: LogicalPosition = { ...selection.anchor };
    const block = findBlockById(nextState.document, blockId);
    if (block && isTextBlock(block)) {
        let acc = 0;
        for (const run of block.children) {
            if (targetAbsoluteOffset >= acc && targetAbsoluteOffset <= acc + run.text.length) {
                nextPosition = { ...selection.anchor, inlineId: run.id, offset: targetAbsoluteOffset - acc };
                break;
            }
            acc += run.text.length;
        }
    }

    return {
        ...nextState,
        selection: { anchor: nextPosition, focus: nextPosition },
        pendingMarks: undefined,
    };
});

registerHandler(OperationType.INSERT_PARAGRAPH, (state, op) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId, inlineId, offset } = selection.anchor;
    const { newBlockId, newRunId } = op.payload;

    let targetInlineId = "";
    let shouldEndList = false;

    // Check if we are on an empty list item to end the list
    const currentBlock = findBlockById(state.document, blockId);
    if (currentBlock && (currentBlock.kind === "list-item" || currentBlock.kind === "ordered-list-item")) {
        const plainText = isTextBlock(currentBlock) ? currentBlock.children.map(r => r.text).join("") : "";
        if (plainText.length === 0) {
            shouldEndList = true;
        }
    }

    if (shouldEndList) {
        return updateDocumentSections(state, blockId, (block) => {
            return { ...block, kind: "paragraph" } as any;
        });
    }

    const nextState = updateDocumentSections(state, blockId, (block) => {
        if (!isTextBlock(block)) return block;

        const beforeChildren: TextRun[] = [];
        const afterChildren: TextRun[] = [];
        let found = false;

        for (const run of block.children) {
            if (run.id === inlineId) {
                const beforeText = run.text.substring(0, offset);
                const afterText = run.text.substring(offset);
                if (beforeText || !found) beforeChildren.push({ ...run, text: beforeText });

                const newRun = { ...run, id: newRunId || (run.id + "_n"), text: afterText };
                afterChildren.push(newRun);
                targetInlineId = newRun.id;
                found = true;
            } else if (!found) {
                beforeChildren.push(run);
            } else {
                afterChildren.push(run);
            }
        }

        const p1 = { ...block, children: beforeChildren };
        const p2 = { ...block, id: newBlockId || (block.id + "_n"), children: afterChildren };
        return [p1, p2];
    });

    const newPos: LogicalPosition = {
        ...selection.anchor,
        blockId: newBlockId || blockId,
        inlineId: targetInlineId,
        offset: 0
    };

    return {
        ...nextState,
        selection: { anchor: newPos, focus: newPos }
    };
});

registerHandler(OperationType.DELETE_TEXT, (state, op) => {
    const { selection, document } = state;
    if (!selection) return state;
    const { blockId, inlineId, offset } = selection.anchor;

    if (selection.anchor.offset !== selection.focus.offset || selection.anchor.blockId !== selection.focus.blockId) {
        return state; // Range delete TODO
    }

    const oldBlock = findBlockById(document, blockId);
    let absoluteOffset = 0;
    if (oldBlock && isTextBlock(oldBlock)) {
      for (const run of oldBlock.children) {
        if (run.id === inlineId) {
          absoluteOffset += offset;
          break;
        }
        absoluteOffset += run.text.length;
      }
    }

    if (absoluteOffset === 0) {
        const currentBlock = findBlockById(document, blockId);
        if (currentBlock && isTextBlock(currentBlock)) {
            // Case 1: list-item or ordered-list-item -> paragraph (keep indentation)
            if (currentBlock.kind === "list-item" || currentBlock.kind === "ordered-list-item") {
                return updateDocumentSections(state, blockId, (block) => {
                    const indent = (block as any).indentation ?? (block.kind === "list-item" ? DEFAULT_LIST_INDENTATION : 30);
                    return { ...block, kind: "paragraph", indentation: indent } as any;
                });
            }
            // Case 2: indented paragraph -> normal paragraph
            if (currentBlock.kind === "paragraph" && (currentBlock.indentation ?? 0) > 0) {
                return updateDocumentSections(state, blockId, (block) => {
                    return { ...block, indentation: 0 } as any;
                });
            }
        }

        let mergedSelection: LogicalPosition | null = null;
        const nextSections = document.sections.map(section => {
            const res = tryMergeSiblings(section.children, blockId);
            if (res.mergedPos) mergedSelection = { ...res.mergedPos, sectionId: section.id };
            return { ...section, children: res.nextBlocks };
        });

        if (mergedSelection) {
            return {
                ...state,
                document: { ...document, revision: document.revision + 1, sections: nextSections },
                selection: { anchor: mergedSelection, focus: mergedSelection }
            };
        }
        return state;
    }

    const targetAbsoluteOffset = absoluteOffset - 1;
    const nextState = updateDocumentSections(state, blockId, (block) => {
        if (!isTextBlock(block)) return block;
        let currentAbs = 0;
        const nextChildren = block.children.map(run => {
            const runStart = currentAbs;
            const runEnd = currentAbs + run.text.length;
            currentAbs = runEnd;
            if (targetAbsoluteOffset >= runStart && targetAbsoluteOffset < runEnd) {
                const relativeDeleteIdx = targetAbsoluteOffset - runStart;
                return { ...run, text: run.text.substring(0, relativeDeleteIdx) + run.text.substring(relativeDeleteIdx + 1) };
            }
            return run;
        });
        return { ...block, children: nextChildren };
    });

    let nextPosition = { ...selection.anchor };
    const block = findBlockById(nextState.document, blockId);
    if (block && isTextBlock(block)) {
      let acc = 0;
      for (const run of block.children) {
        if (targetAbsoluteOffset >= acc && targetAbsoluteOffset <= acc + run.text.length) {
          nextPosition = { ...selection.anchor, inlineId: run.id, offset: targetAbsoluteOffset - acc };
          break;
        }
        acc += run.text.length;
      }
    }

    return {
        ...nextState,
        selection: { anchor: nextPosition, focus: nextPosition }
    };
});

registerHandler(OperationType.SET_ALIGNMENT, (state, op) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;
    const { align } = op.payload;
    return updateDocumentSections(state, blockId, (block) => {
        if (block.kind === "heading" && align === "justify") return { ...block, align: "left" };
        return { ...block, align } as any;
    });
});

registerHandler(OperationType.INSERT_IMAGE, (state, op) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;
    const { src, naturalWidth, naturalHeight, displayWidth, align, alt, newBlockId } = op.payload;
    const imageNode = createImage(src, naturalWidth, naturalHeight, displayWidth, align, alt || "");
    if (newBlockId) imageNode.id = newBlockId;
    
    const nextState = updateDocumentSections(state, blockId, (block) => [block, imageNode]);
    return {
        ...nextState,
        selectedImageId: imageNode.id,
        selection: null
    };
});

registerHandler(OperationType.INSERT_TABLE, (state, op) => {
    const { document, selection } = state;
    const { rows, cols, newTableId, newRowIds, newCellIds, newParaIds, newRunIds } = op.payload;
    
    const tableNode = createTable(rows, cols);
    if (newTableId) tableNode.id = newTableId;
    if (newRowIds) {
        tableNode.rows.forEach((row, rIdx) => {
            row.id = newRowIds[rIdx];
            row.cells.forEach((cell, cIdx) => {
                const globalIdx = rIdx * cols + cIdx;
                cell.id = newCellIds?.[globalIdx] || cell.id;
                if (cell.children[0] && isTextBlock(cell.children[0])) {
                    cell.children[0].id = newParaIds?.[globalIdx] || cell.children[0].id;
                    if (cell.children[0].children[0]) {
                        cell.children[0].children[0].id = newRunIds?.[globalIdx] || cell.children[0].children[0].id;
                    }
                }
            });
        });
    }

    let insertSectionIdx = 0;
    let insertBlockIdx = -1;
    if (selection) {
        for (let sIdx = 0; sIdx < document.sections.length; sIdx++) {
            const idx = document.sections[sIdx].children.findIndex(b => b.id === selection.anchor.blockId);
            if (idx !== -1) {
                insertSectionIdx = sIdx;
                insertBlockIdx = idx;
                break;
            }
        }
    }

    const nextSections = document.sections.map((section, sIdx) => {
      if (sIdx !== insertSectionIdx) return section;
      const children = [...section.children];
      children.splice(insertBlockIdx + 1, 0, tableNode);
      return { ...section, children };
    });

    const firstPara = tableNode.rows[0].cells[0].children[0] as any;
    const newPos: LogicalPosition = { 
        sectionId: document.sections[insertSectionIdx].id, 
        blockId: firstPara.id, 
        inlineId: firstPara.children[0].id, 
        offset: 0 
    };

    return { 
        ...state, 
        document: { ...document, revision: document.revision + 1, sections: nextSections }, 
        selection: { anchor: newPos, focus: newPos }, 
        selectedImageId: null 
    };
});

registerHandler(OperationType.RESIZE_IMAGE, (state, op) => {
    const { blockId, width, height } = op.payload;
    return {
        ...updateDocumentSections(state, blockId, (block) => block.kind === "image" ? { ...block, width, height } : block),
        selectedImageId: blockId,
        selection: null
    };
});

registerHandler(OperationType.SELECT_IMAGE, (state, op) => ({
    ...state,
    selectedImageId: op.payload.blockId,
    selection: null
}));

registerHandler(OperationType.APPEND_PARAGRAPH, (state, op) => {
    const { text, newBlockId, newRunId } = op.payload;
    const p = createParagraph(text);
    if (newBlockId) p.id = newBlockId;
    if (newRunId && p.children[0]) p.children[0].id = newRunId;

    const nextSections = [...state.document.sections];
    const last = nextSections.length - 1;
    nextSections[last] = { ...nextSections[last], children: [...nextSections[last].children, p] };
    
    return { 
        ...state, 
        document: { ...state.document, revision: state.document.revision + 1, sections: nextSections } 
    };
});

registerHandler(OperationType.TOGGLE_MARK, (state, op) => {
    const { selection, pendingMarks } = state;
    if (!selection) return state;
    const { mark } = op.payload;
    if (selection.anchor.blockId === selection.focus.blockId && selection.anchor.inlineId === selection.focus.inlineId && selection.anchor.offset === selection.focus.offset) {
        const nextMarks = { ...(pendingMarks || {}) } as any;
        if (nextMarks[mark]) delete nextMarks[mark]; else nextMarks[mark] = true;
        return { ...state, pendingMarks: nextMarks };
    }
    return state;
});

registerHandler(OperationType.APPLY_FORMAT, (state, op) => {
    const { selection } = state;
    if (!selection) return state;

    const { marks, align } = op.payload;

    // For now, if the selection is collapsed, just set pendingMarks
    if (selection.anchor.blockId === selection.focus.blockId && selection.anchor.inlineId === selection.focus.inlineId && selection.anchor.offset === selection.focus.offset) {
        let nextState = { ...state, pendingMarks: { ...marks } };

        // If align is provided, apply to the block
        if (align) {
            nextState = updateDocumentSections(nextState, selection.anchor.blockId, (block) => {
                if (isTextBlock(block)) {
                    return { ...block, align };
                }
                return block;
            });
        }

        return nextState;
    }

    let nextState = state;

    // Multi-block formatting logic
    const { document: doc } = state;

    // We need to determine the order of anchor vs focus to iterate properly.
    // In our simplified Document, blocks are stored within sections (and optionally tables).
    // Let's flatten the tree to easily determine bounds.
    const allBlocks = [];
    const blockParents: Record<string, string> = {};
    for (const section of doc.sections) {
        // A simple visitor for our document structure
        const traverse = (blocks: BlockNode[], parentId: string) => {
             for (const b of blocks) {
                  allBlocks.push(b);
                  blockParents[b.id] = parentId;
                  if (b.kind === "table") {
                      for (const row of b.rows) {
                           for (const cell of row.cells) {
                               traverse(cell.children, b.id);
                           }
                      }
                  }
             }
        };
        traverse(section.children, section.id);
    }

    let startPos = selection.anchor;
    let endPos = selection.focus;

    const startBlockIdx = allBlocks.findIndex(b => b.id === startPos.blockId);
    const endBlockIdx = allBlocks.findIndex(b => b.id === endPos.blockId);

    if (startBlockIdx === -1 || endBlockIdx === -1) return nextState;

    let isReversed = false;
    if (startBlockIdx > endBlockIdx) {
        isReversed = true;
    } else if (startBlockIdx === endBlockIdx) {
        const block = allBlocks[startBlockIdx];
        if (isTextBlock(block)) {
            let startAbs = 0, endAbs = 0, acc = 0;
            for (const r of block.children) {
                 if (r.id === startPos.inlineId) startAbs = acc + startPos.offset;
                 if (r.id === endPos.inlineId) endAbs = acc + endPos.offset;
                 acc += r.text.length;
            }
            if (startAbs > endAbs) {
                isReversed = true;
            }
        }
    }

    if (isReversed) {
        const temp = startPos;
        startPos = endPos;
        endPos = temp;
    }

    const firstBlockIdx = Math.min(startBlockIdx, endBlockIdx);
    const lastBlockIdx = Math.max(startBlockIdx, endBlockIdx);

    // Apply formatting to all blocks in range
    for (let i = firstBlockIdx; i <= lastBlockIdx; i++) {
        const targetBlock = allBlocks[i];
        if (!isTextBlock(targetBlock)) continue;

        let startAbs = 0;
        let endAbs = Infinity;

        // Calculate bounds for the current block
        let acc = 0;
        for (const r of targetBlock.children) {
            if (i === firstBlockIdx && r.id === startPos.inlineId) startAbs = acc + startPos.offset;
            if (i === lastBlockIdx && r.id === endPos.inlineId) endAbs = acc + endPos.offset;
            acc += r.text.length;
        }
        if (i < lastBlockIdx) {
            endAbs = acc; // Select to the end of this block
        }

        nextState = updateDocumentSections(nextState, targetBlock.id, (b) => {
             if (!isTextBlock(b)) return b;

             let currentAbs = 0;
             const newChildren: TextRun[] = [];
             let runIdx = 0;

             for (const run of b.children) {
                 const runStart = currentAbs;
                 const runEnd = currentAbs + run.text.length;
                 currentAbs = runEnd;

                 if (runEnd <= startAbs || runStart >= endAbs) {
                     // Outside selection
                     newChildren.push(run);
                 } else if (runStart >= startAbs && runEnd <= endAbs) {
                     // Fully inside selection
                     newChildren.push({ ...run, marks: { ...marks } });
                 } else {
                     // Partially inside selection
                     const overlapStart = Math.max(0, startAbs - runStart);
                     const overlapEnd = Math.min(run.text.length, endAbs - runStart);

                     const beforeText = run.text.substring(0, overlapStart);
                     const midText = run.text.substring(overlapStart, overlapEnd);
                     const afterText = run.text.substring(overlapEnd);

                     if (beforeText) {
                         newChildren.push({ ...run, id: run.id + "_fmt_b" + (runIdx++), text: beforeText });
                     }
                     if (midText) {
                         newChildren.push({ ...run, id: run.id + "_fmt_m" + (runIdx++), text: midText, marks: { ...marks } });
                     }
                     if (afterText) {
                         newChildren.push({ ...run, id: run.id + "_fmt_a" + (runIdx++), text: afterText });
                     }
                 }
             }

             // Merge contiguous runs with same marks
             const merged: TextRun[] = [];
             for (const r of newChildren) {
                 if (merged.length > 0 && r.text !== "" && areMarksEqual(merged[merged.length - 1].marks, r.marks)) {
                     merged[merged.length - 1].text += r.text;
                 } else if (r.text !== "") {
                     merged.push({ ...r });
                 }
             }
             if (merged.length === 0 && newChildren.length > 0) merged.push(newChildren[0]); // fallback

             return { ...b, children: merged, align: align || b.align };
        });
    }

    return nextState;
});

registerHandler(OperationType.MOVE_BLOCK, (state, op) => {
    const { blockId, targetReferenceBlockId, isBefore } = op.payload;
    if (blockId === targetReferenceBlockId) return state;

    let stripped: BlockNode | null = null;
    const sectionsAfterStrip = state.document.sections.map(section => {
        const res = stripBlock(section.children, blockId);
        if (res.stripped) stripped = res.stripped;
        return { ...section, children: res.nextBlocks };
    });

    if (!stripped) return state;

    let inserted = false;
    const sectionsAfterInsert = sectionsAfterStrip.map(section => {
        if (inserted) return section;
        const res = insertBlock(section.children, targetReferenceBlockId, stripped!, isBefore ?? false);
        if (res.inserted) inserted = true;
        return { ...section, children: res.nextBlocks };
    });

    return {
        ...state,
        document: { ...state.document, revision: state.document.revision + 1, sections: sectionsAfterInsert },
    };
});

registerHandler(OperationType.TABLE_ADD_ROW_ABOVE, (state, op) => tableAddRow(state, op, true));
registerHandler(OperationType.TABLE_ADD_ROW_BELOW, (state, op) => tableAddRow(state, op, false));

function tableAddRow(state: EditorState, op: any, isAbove: boolean): EditorState {
    const { tableId, referenceBlockId } = op.payload;
    const tableInfo = findParentTable(state.document, referenceBlockId);
    if (!tableInfo) return state;

    const insertIdx = isAbove ? tableInfo.rowIdx : tableInfo.rowIdx + 1;

    return updateDocumentSections(state, tableId, (block) => {
        if (block.kind !== "table") return block;
        const rows = [...block.rows];
        rows.splice(insertIdx, 0, createTableRow(block.columnWidths.length));
        return { ...block, rows };
    });
}

registerHandler(OperationType.TABLE_ADD_COLUMN_LEFT, (state, op) => tableAddColumn(state, op, true));
registerHandler(OperationType.TABLE_ADD_COLUMN_RIGHT, (state, op) => tableAddColumn(state, op, false));

function tableAddColumn(state: EditorState, op: any, isLeft: boolean): EditorState {
    const { tableId, referenceBlockId } = op.payload;
    const tableInfo = findParentTable(state.document, referenceBlockId);
    if (!tableInfo) return state;

    const insertIdx = isLeft ? tableInfo.cellIdx : tableInfo.cellIdx + 1;

    return updateDocumentSections(state, tableId, (block) => {
        if (block.kind !== "table") return block;
        
        const columnWidths = [...block.columnWidths];
        const refIdx = tableInfo.cellIdx;
        const currentWidth = columnWidths[refIdx];
        const halfWidth = Math.max(30, Math.floor(currentWidth / 2));
        
        columnWidths[refIdx] = currentWidth - halfWidth;
        columnWidths.splice(insertIdx, 0, halfWidth);

        const rows = block.rows.map(row => {
            const cells = [...row.cells];
            cells.splice(insertIdx, 0, createTableCell());
            return { ...row, cells };
        });
        return { ...block, rows, columnWidths };
    });
}

registerHandler(OperationType.TABLE_DELETE_ROW, (state, op) => {
    const { tableId, referenceBlockId } = op.payload;
    const tableInfo = findParentTable(state.document, referenceBlockId);
    if (!tableInfo) return state;

    return {
        ...updateDocumentSections(state, tableId, (block) => {
            if (block.kind !== "table") return block;
            if (block.rows.length <= 1) return block;
            const rows = [...block.rows];
            rows.splice(tableInfo.rowIdx, 1);
            return { ...block, rows };
        }),
        selection: null
    };
});

registerHandler(OperationType.TABLE_DELETE_COLUMN, (state, op) => {
    const { tableId, referenceBlockId } = op.payload;
    const tableInfo = findParentTable(state.document, referenceBlockId);
    if (!tableInfo) return state;

    return {
        ...updateDocumentSections(state, tableId, (block) => {
            if (block.kind !== "table") return block;
            if (block.columnWidths.length <= 1) return block;
            
            const columnWidths = [...block.columnWidths];
            const deletedWidth = columnWidths[tableInfo.cellIdx];
            columnWidths.splice(tableInfo.cellIdx, 1);
            
            const neighborIdx = tableInfo.cellIdx > 0 ? tableInfo.cellIdx - 1 : 0;
            columnWidths[neighborIdx] += deletedWidth;

            const rows = block.rows.map(row => {
                const cells = [...row.cells];
                cells.splice(tableInfo.cellIdx, 1);
                return { ...row, cells };
            });
            return { ...block, rows, columnWidths };
        }),
        selection: null
    };
});

registerHandler(OperationType.TABLE_DELETE, (state, op) => {
    const { tableId } = op.payload;
    return {
        ...updateDocumentSections(state, tableId, () => null),
        selection: null
    };
});

registerHandler(OperationType.TOGGLE_UNORDERED_LIST, (state) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;

    return updateDocumentSections(state, blockId, (block) => {
        if (block.kind === "paragraph" || block.kind === "ordered-list-item") {
            return { ...block, kind: "list-item" } as any;
        } else if (block.kind === "list-item") {
            return { ...block, kind: "paragraph" } as any;
        }
        return block;
    });
});

registerHandler(OperationType.TOGGLE_ORDERED_LIST, (state) => {
    const { selection } = state;
    if (!selection) return state;
    const { blockId } = selection.anchor;

    return updateDocumentSections(state, blockId, (block) => {
        if (block.kind === "paragraph" || block.kind === "list-item") {
            return { ...block, kind: "ordered-list-item", index: 1 } as any;
        } else if (block.kind === "ordered-list-item") {
            return { ...block, kind: "paragraph" } as any;
        }
        return block;
    });
});

registerHandler(OperationType.SET_SECTION_TEMPLATE, (state, op) => {
    const { sectionId, templateId } = op.payload;
    const nextSections = state.document.sections.map((s) => s.id === sectionId ? { ...s, pageTemplateId: templateId } : s);
    return { ...state, document: { ...state.document, revision: state.document.revision + 1, sections: nextSections } };
});
