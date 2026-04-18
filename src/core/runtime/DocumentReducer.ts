import { EditorState } from "./EditorState.js";
import {
  EditorOperation,
  OperationType,
} from "../operations/OperationTypes.js";
import { createParagraph } from "../document/DocumentFactory.js";
import { LogicalPosition } from "../selection/SelectionTypes.js";
import { TextRun } from "../document/BlockTypes.js";
import { LayoutState } from "../layout/LayoutTypes.js";

export interface ReducerState extends EditorState {
  _layout?: LayoutState;
}

const genId = (prefix: string): string =>
  `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).substring(2, 8)}`;

export const reduceDocumentState = (
  state: EditorState,
  operation: EditorOperation,
  layout?: LayoutState,
): EditorState => {
  const reducerState: ReducerState = { ...state, _layout: layout };
  const { document, selection } = state;

  switch (operation.type) {
    case OperationType.SET_ALIGNMENT: {
      if (!selection) return state;
      const { blockId } = selection.anchor;
      const { align } = operation.payload;

      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: document.sections.map((section) => ({
            ...section,
            children: section.children.map((block) =>
              block.id === blockId ? { ...block, align } : block,
            ),
          })),
        },
      };
    }

    case OperationType.SET_SELECTION:
      console.log("REDUCER: SET_SELECTION recebido");
      console.log("REDUCER: Nova selecao:", operation.payload.selection);
      return {
        ...state,
        selection: operation.payload.selection,
        pendingMarks: undefined,
      };

    case OperationType.TOGGLE_MARK:
    case OperationType.SET_MARK: {
      if (!selection) return state;

      const isSet = operation.type === OperationType.SET_MARK;
      const mark = operation.payload.mark;
      const setValue = isSet ? (operation.payload as any).value : undefined;

      // Helper: compute absolute offset within a block for a LogicalPosition
      const getAbsoluteOffsetInBlock = (pos: LogicalPosition): number => {
        const block = document.sections
          .flatMap((s) => s.children)
          .find((b) => b.id === pos.blockId);
        if (!block) return 0;
        let acc = 0;
        for (const run of block.children) {
          if (run.id === pos.inlineId) {
            return acc + pos.offset;
          }
          acc += run.text.length;
        }
        return 0;
      };

      const anchorAbs = getAbsoluteOffsetInBlock(selection.anchor);
      const focusAbs = getAbsoluteOffsetInBlock(selection.focus);

      // If collapsed selection, update pending marks instead of return state
      if (
        selection.anchor.blockId === selection.focus.blockId &&
        anchorAbs === focusAbs
      ) {
        const block = document.sections
          .flatMap((s) => s.children)
          .find((b) => b.id === selection.anchor.blockId);
        const currentRun = block?.children.find((r) => r.id === selection.anchor.inlineId);
        const baseMarks = state.pendingMarks || currentRun?.marks || {};
        
        const newValue = isSet ? setValue : !baseMarks[mark];
        
        return {
          ...state,
          pendingMarks: {
            ...baseMarks,
            [mark]: newValue,
          },
        };
      }

      // Determine ordering across blocks and offsets
      const blocksFlat = document.sections.flatMap((s) => s.children);
      const anchorBlockIdx = blocksFlat.findIndex(
        (b) => b.id === selection.anchor.blockId,
      );
      const focusBlockIdx = blocksFlat.findIndex(
        (b) => b.id === selection.focus.blockId,
      );

      if (anchorBlockIdx === -1 || focusBlockIdx === -1) return state;

      const startIsAnchor =
        anchorBlockIdx < focusBlockIdx ||
        (anchorBlockIdx === focusBlockIdx && anchorAbs <= focusAbs);

      const startBlockId = startIsAnchor
        ? selection.anchor.blockId
        : selection.focus.blockId;
      const endBlockId = startIsAnchor
        ? selection.focus.blockId
        : selection.anchor.blockId;
      const startAbs = startIsAnchor ? anchorAbs : focusAbs;
      const endAbs = startIsAnchor ? focusAbs : anchorAbs;

      // Preserve original positions for later remapping
      const originalAnchor = selection.anchor;
      const originalFocus = selection.focus;
      const originalAnchorAbs = anchorAbs;
      const originalFocusAbs = focusAbs;

      let inSelection = false;
      let selectionToggleTarget: any | undefined = isSet ? setValue : undefined;

      const nextSections = document.sections.map((section) => ({
        ...section,
        children: section.children.map((block) => {
          const isStartBlock = block.id === startBlockId;
          const isEndBlock = block.id === endBlockId;

          if (!inSelection && !isStartBlock) return block;
          if (isStartBlock) inSelection = true;

          let currentOffset = 0;
          const nextRuns: TextRun[] = [];

          for (const run of block.children) {
            const runLength = run.text.length;
            const runStart = currentOffset;
            const runEnd = currentOffset + runLength;
            currentOffset += runLength;

            const selStart = isStartBlock ? startAbs : 0;
            const selEnd = isEndBlock ? endAbs : Infinity;

            const overlapStart = Math.max(runStart, selStart);
            const overlapEnd = Math.min(runEnd, selEnd);

            if (overlapStart < overlapEnd) {
              const beforeText = run.text.substring(0, overlapStart - runStart);
              const overlapText = run.text.substring(
                overlapStart - runStart,
                overlapEnd - runStart,
              );
              const afterText = run.text.substring(overlapEnd - runStart);

              if (!isSet && selectionToggleTarget === undefined) {
                selectionToggleTarget = !run.marks[mark];
              }

              if (beforeText) {
                nextRuns.push({ ...run, id: genId("run"), text: beforeText });
              }
              if (overlapText) {
                nextRuns.push({
                  ...run,
                  id: genId("run"),
                  text: overlapText,
                  marks: { ...run.marks, [mark]: selectionToggleTarget },
                });
              }
              if (afterText) {
                nextRuns.push({ ...run, id: genId("run"), text: afterText });
              }
            } else {
              nextRuns.push(run);
            }
          }

          if (isEndBlock) inSelection = false;

          // Merge adjacent runs with identical marks
          const mergedRuns: TextRun[] = [];
          for (const run of nextRuns) {
            if (mergedRuns.length > 0) {
              const last = mergedRuns[mergedRuns.length - 1];
              if (JSON.stringify(last.marks) === JSON.stringify(run.marks)) {
                last.text += run.text;
                continue;
              }
            }
            mergedRuns.push({ ...run });
          }

          return { ...block, children: mergedRuns };
        }),
      }));

      // Remap selection anchor and focus to new run IDs
      const mapToNewPos = (
        oldPos: LogicalPosition,
        oldAbsOffset: number,
      ): LogicalPosition => {
        for (const section of nextSections) {
          const blk = section.children.find((b) => b.id === oldPos.blockId);
          if (blk) {
            let acc = 0;
            for (const run of blk.children) {
              const runLen = run.text.length;
              if (oldAbsOffset >= acc && oldAbsOffset < acc + runLen) {
                return {
                  sectionId: oldPos.sectionId,
                  blockId: oldPos.blockId,
                  inlineId: run.id,
                  offset: oldAbsOffset - acc,
                };
              }
              acc += runLen;
            }
            // If offset is at the very end of the block, attach to last run
            const lastRun = blk.children[blk.children.length - 1];
            return {
              sectionId: oldPos.sectionId,
              blockId: oldPos.blockId,
              inlineId: lastRun.id,
              offset: Math.min(
                oldAbsOffset - acc + lastRun.text.length,
                lastRun.text.length,
              ),
            };
          }
        }
        return oldPos;
      };

      const newSelection = {
        anchor: mapToNewPos(originalAnchor, originalAnchorAbs),
        focus: mapToNewPos(originalFocus, originalFocusAbs),
      };

      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: nextSections,
        },
        selection: newSelection,
      };
    }

    case OperationType.SET_SECTION_TEMPLATE:
      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: document.sections.map((section) =>
            section.id === operation.payload.sectionId
              ? { ...section, pageTemplateId: operation.payload.templateId }
              : section,
          ),
        },
      };

    case OperationType.INSERT_TEXT: {
      if (!selection) return state;

      const { blockId, inlineId, offset } = selection.anchor;
      const text = operation.payload.text;
      const pendingMarks = state.pendingMarks;

      const nextSections = document.sections.map((section) => ({
        ...section,
        children: section.children.map((block) => {
          if (block.id !== blockId) return block;

          const nextChildren: TextRun[] = [];
          for (const run of block.children) {
            if (run.id !== inlineId) {
              nextChildren.push(run);
              continue;
            }

            const beforeText = run.text.substring(0, offset);
            const afterText = run.text.substring(offset);

            if (pendingMarks) {
              if (beforeText) {
                nextChildren.push({ ...run, id: genId("run"), text: beforeText });
              }
              nextChildren.push({
                id: genId("run"),
                text: text,
                marks: { ...run.marks, ...pendingMarks },
              });
              if (afterText) {
                nextChildren.push({ ...run, id: genId("run"), text: afterText });
              }
            } else {
              nextChildren.push({ ...run, text: beforeText + text + afterText });
            }
          }

          // Merge adjacent runs
          const merged: TextRun[] = [];
          for (const r of nextChildren) {
            if (merged.length > 0) {
              const last = merged[merged.length - 1];
              if (JSON.stringify(last.marks) === JSON.stringify(r.marks)) {
                last.text += r.text;
                continue;
              }
            }
            merged.push({ ...r });
          }

          return { ...block, children: merged };
        }),
      }));

      // Find new position for selection
      let nextPosition: LogicalPosition | null = null;
      const block = nextSections.flatMap(s => s.children).find(b => b.id === blockId);
      if (block) {
        let acc = 0;
        const targetOffset = offset + text.length;
        for (const run of block.children) {
          const runLen = run.text.length;
          if (targetOffset >= acc && targetOffset <= acc + runLen) {
            nextPosition = {
              ...selection.anchor,
              inlineId: run.id,
              offset: targetOffset - acc
            };
            break;
          }
          acc += runLen;
        }
      }

      if (!nextPosition) {
        nextPosition = { ...selection.anchor, offset: offset + text.length };
      }

      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: nextSections,
        },
        selection: { anchor: nextPosition, focus: nextPosition },
        pendingMarks: undefined,
      };
    }

    case OperationType.DELETE_TEXT: {
      if (!selection) return state;

      const { blockId, inlineId, offset } = selection.anchor;

      if (offset > 0) {
        const nextSections = document.sections.map((section) => ({
          ...section,
          children: section.children.map((block) => {
            if (block.id !== blockId) return block;

            const nextChildren = block.children.map((run) => {
              if (run.id !== inlineId) return run;
              const before = run.text.substring(0, offset - 1);
              const after = run.text.substring(offset);
              return { ...run, text: before + after };
            });

            return { ...block, children: nextChildren };
          }),
        }));

        const nextOffset = offset - 1;
        const nextPosition: LogicalPosition = {
          ...selection.anchor,
          offset: nextOffset,
        };

        return {
          ...state,
          document: {
            ...document,
            revision: document.revision + 1,
            sections: nextSections,
          },
          selection: { anchor: nextPosition, focus: nextPosition },
        };
      }

      if (offset === 0) {
        let sectionIdx = -1;
        let blockIdx = -1;

        for (let i = 0; i < document.sections.length; i++) {
          const idx = document.sections[i].children.findIndex(
            (b) => b.id === blockId,
          );
          if (idx !== -1) {
            sectionIdx = i;
            blockIdx = idx;
            break;
          }
        }

        if (sectionIdx === -1) return state;

        const section = document.sections[sectionIdx];
        const block = section.children[blockIdx];
        const runIdx = block.children.findIndex((r) => r.id === inlineId);

        if (runIdx > 0) {
          const prevRun = block.children[runIdx - 1];
          const newPosition: LogicalPosition = {
            ...selection.anchor,
            inlineId: prevRun.id,
            offset: prevRun.text.length,
          };

          if (prevRun.text.length > 0) {
            const nextSections = document.sections.map((s, sIdx) => {
              if (sIdx !== sectionIdx) return s;
              return {
                ...s,
                children: s.children.map((b) => {
                  if (b.id !== blockId) return b;
                  return {
                    ...b,
                    children: b.children.map((r) => {
                      if (r.id !== prevRun.id) return r;
                      return { ...r, text: r.text.slice(0, -1) };
                    }),
                  };
                }),
              };
            });
            const finalPosition: LogicalPosition = {
              ...newPosition,
              offset: prevRun.text.length - 1,
            };
            return {
              ...state,
              document: {
                ...document,
                revision: document.revision + 1,
                sections: nextSections,
              },
              selection: { anchor: finalPosition, focus: finalPosition },
            };
          } else {
            return {
              ...state,
              selection: { anchor: newPosition, focus: newPosition },
            };
          }
        }

        if (runIdx === 0 && blockIdx > 0) {
          const prevBlock = section.children[blockIdx - 1];
          const lastRunOfPrevBlock =
            prevBlock.children[prevBlock.children.length - 1];

          const newPosition: LogicalPosition = {
            sectionId: section.id,
            blockId: prevBlock.id,
            inlineId: lastRunOfPrevBlock.id,
            offset: lastRunOfPrevBlock.text.length,
          };

          const nextSections = document.sections.map((s, sIdx) => {
            if (sIdx !== sectionIdx) return s;

            const newChildren = [...s.children];
            newChildren[blockIdx - 1] = {
              ...prevBlock,
              children: [...prevBlock.children, ...block.children],
            };
            newChildren.splice(blockIdx, 1);

            return { ...s, children: newChildren };
          });

          return {
            ...state,
            document: {
              ...document,
              revision: document.revision + 1,
              sections: nextSections,
            },
            selection: { anchor: newPosition, focus: newPosition },
          };
        }
      }

      return state;
    }

    case OperationType.INSERT_PARAGRAPH: {
      if (!selection) return state;

      const { blockId, inlineId, offset } = selection.anchor;

      let nextBlockId: string | null = null;
      let nextInlineId: string | null = null;
      let nextSectionId: string | null = null;

      const nextSections = document.sections.map((section) => {
        const blockIndex = section.children.findIndex((b) => b.id === blockId);
        if (blockIndex === -1) return section;

        const currentBlock = section.children[blockIndex];
        const runIndex = currentBlock.children.findIndex(
          (r) => r.id === inlineId,
        );

        if (runIndex === -1) return section;

        const run = currentBlock.children[runIndex];

        const beforeText = run.text.substring(0, offset);
        const afterText = run.text.substring(offset);

        let currentBlockRuns: TextRun[] = [
          ...currentBlock.children.slice(0, runIndex),
          { ...run, id: genId("run"), text: beforeText },
        ];
        currentBlockRuns = currentBlockRuns.filter(
          (r) => r.text.length > 0 || currentBlockRuns.length === 1,
        );

        if (currentBlockRuns.length === 0) {
          currentBlockRuns.push({
            id: genId("run"),
            text: "",
            marks: { ...run.marks },
          });
        }

        const newBlockRuns: TextRun[] = [
          { ...run, id: genId("run"), text: afterText },
          ...currentBlock.children
            .slice(runIndex + 1)
            .map((r) => ({ ...r, id: genId("run") })),
        ];

        if (newBlockRuns[0].text === "" && newBlockRuns.length > 1) {
          newBlockRuns.shift();
        }

        nextBlockId = genId("block");
        nextInlineId = newBlockRuns[0].id;
        nextSectionId = section.id;

        const newBlock = {
          ...currentBlock,
          id: nextBlockId,
          children: newBlockRuns,
        };

        const currentBlockUpdated = {
          ...currentBlock,
          children: currentBlockRuns,
        };

        const newChildren = [
          ...section.children.slice(0, blockIndex),
          currentBlockUpdated,
          newBlock,
          ...section.children.slice(blockIndex + 1),
        ];

        return { ...section, children: newChildren };
      });

      if (!nextBlockId) return state;

      const nextPosition: LogicalPosition = {
        sectionId: nextSectionId!,
        blockId: nextBlockId,
        inlineId: nextInlineId!,
        offset: 0,
      };

      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          sections: nextSections,
        },
        selection: { anchor: nextPosition, focus: nextPosition },
      };
    }

    case OperationType.MOVE_SELECTION: {
      if (!selection) return state;
      const { key } = operation.payload;
      const { blockId, inlineId, offset } = selection.anchor;

      const baseState = { ...state, pendingMarks: undefined };
      
      const blocksFlat = document.sections.flatMap((s) => s.children);
      const currentBlockIdx = blocksFlat.findIndex((b) => b.id === blockId);
      if (currentBlockIdx === -1) return state;

      const currentBlock = blocksFlat[currentBlockIdx];
      const runIdx = currentBlock.children.findIndex((r) => r.id === inlineId);
      console.log(
        "  blocksFlat length:",
        blocksFlat.length,
        "currentBlockIdx:",
        currentBlockIdx,
      );
      console.log("  runIdx:", runIdx, "inlineId:", inlineId);
      const currentRun = currentBlock.children[runIdx];
      console.log("  currentRun:", currentRun);
      if (key === "ArrowLeft") {
        console.log(
          "MOVE_SELECTION: ArrowLeft called, current offset:",
          offset,
        );
        if (offset > 0) {
          return {
            ...baseState,
            selection: {
              anchor: { ...selection.anchor, offset: offset - 1 },
              focus: { ...selection.focus, offset: offset - 1 },
            },
          };
        } else if (runIdx > 0) {
          const prevRun = currentBlock.children[runIdx - 1];
          return {
            ...baseState,
            selection: {
              anchor: {
                ...selection.anchor,
                inlineId: prevRun.id,
                offset: prevRun.text.length,
              },
              focus: {
                ...selection.focus,
                inlineId: prevRun.id,
                offset: prevRun.text.length,
              },
            },
          };
        } else if (currentBlockIdx > 0) {
          const prevBlock = blocksFlat[currentBlockIdx - 1];
          const lastRun = prevBlock.children[prevBlock.children.length - 1];
          return {
            ...baseState,
            selection: {
              anchor: {
                ...selection.anchor,
                blockId: prevBlock.id,
                inlineId: lastRun.id,
                offset: lastRun.text.length,
              },
              focus: {
                ...selection.focus,
                blockId: prevBlock.id,
                inlineId: lastRun.id,
                offset: lastRun.text.length,
              },
            },
          };
        }
        return baseState;
      }

      if (key === "ArrowRight") {
        console.log("MOVE_SELECTION: ArrowRight called, offset:", offset);
        const textLength = currentRun?.text.length ?? 0;
        console.log("  currentRun:", currentRun?.id, "textLength:", textLength);
        if (offset < textLength) {
          return {
            ...baseState,
            selection: {
              anchor: { ...selection.anchor, offset: offset + 1 },
              focus: { ...selection.focus, offset: offset + 1 },
            },
          };
        } else if (runIdx < currentBlock.children.length - 1) {
          const nextRun = currentBlock.children[runIdx + 1];
          return {
            ...baseState,
            selection: {
              anchor: { ...selection.anchor, inlineId: nextRun.id, offset: 0 },
              focus: { ...selection.focus, inlineId: nextRun.id, offset: 0 },
            },
          };
        } else if (currentBlockIdx < blocksFlat.length - 1) {
          const nextBlock = blocksFlat[currentBlockIdx + 1];
          const firstRun = nextBlock.children[0];
          return {
            ...baseState,
            selection: {
              anchor: {
                ...selection.anchor,
                blockId: nextBlock.id,
                inlineId: firstRun.id,
                offset: 0,
              },
              focus: {
                ...selection.focus,
                blockId: nextBlock.id,
                inlineId: firstRun.id,
                offset: 0,
              },
            },
          };
        }
        return baseState;
      }

      if (key === "ArrowUp" || key === "ArrowDown") {
        console.log("MOVE_SELECTION: ArrowUp/ArrowDown called, key:", key);
        console.log(
          "  blockId:",
          blockId,
          "inlineId:",
          inlineId,
          "offset:",
          offset,
        );

        if (!layout || !layout.pages || layout.pages.length === 0) return state;

        const blockFragments = layout.fragmentsByBlockId[blockId];
        if (!blockFragments || blockFragments.length === 0) return state;

        let absOffset = 0;
        for (const run of currentBlock.children) {
          if (run.id === inlineId) break;
          absOffset += run.text.length;
        }
        absOffset += offset;

        const currentFragment =
          blockFragments.find(
            (f) => absOffset >= f.startOffset && absOffset <= f.endOffset,
          ) ?? blockFragments[0];

        console.log(
          "  currentBlock:",
          currentBlock?.id,
          "lines:",
          currentFragment?.lines?.length,
        );

        if (!currentFragment?.lines) return state;

        const currentLineIdx = currentFragment.lines.findIndex(
          (l) => absOffset >= l.offsetStart && absOffset <= l.offsetEnd,
        );

        console.log("  currentLineIdx:", currentLineIdx);

        if (currentLineIdx === -1) return state;

        const targetLineIdx =
          key === "ArrowUp" ? currentLineIdx - 1 : currentLineIdx + 1;

        if (targetLineIdx < 0) {
          if (currentBlockIdx > 0) {
            const prevBlock = blocksFlat[currentBlockIdx - 1];
            const prevBlockFragments = layout.fragmentsByBlockId[prevBlock.id];
            if (prevBlockFragments && prevBlockFragments.length > 0) {
              const lastFrag =
                prevBlockFragments[prevBlockFragments.length - 1];
              if (lastFrag.lines && lastFrag.lines.length > 0) {
                const lastLine = lastFrag.lines[lastFrag.lines.length - 1];
                const targetOffset = Math.min(
                  lastLine.offsetEnd,
                  Math.max(lastLine.offsetStart, absOffset),
                );
                return {
                  ...state,
                  selection: {
                    anchor: {
                      ...selection.anchor,
                      blockId: prevBlock.id,
                      inlineId: prevBlock.children[0]?.id ?? "",
                      offset: targetOffset - lastFrag.startOffset,
                    },
                    focus: {
                      ...selection.focus,
                      blockId: prevBlock.id,
                      inlineId: prevBlock.children[0]?.id ?? "",
                      offset: targetOffset - lastFrag.startOffset,
                    },
                  },
                };
              }
            }
          }
          return state;
        }

        if (targetLineIdx >= currentFragment.lines.length) {
          console.log("  At last line, trying to go to next block");
          if (currentBlockIdx < blocksFlat.length - 1) {
            const nextBlock = blocksFlat[currentBlockIdx + 1];
            console.log(
              "  nextBlock:",
              nextBlock.id,
              "total blocks:",
              blocksFlat.length,
            );
            const nextBlockFragments = layout.fragmentsByBlockId[nextBlock.id];
            console.log("  nextBlockFragments:", nextBlockFragments?.length);
            if (nextBlockFragments && nextBlockFragments.length > 0) {
              const firstFrag = nextBlockFragments[0];
              if (firstFrag.lines && firstFrag.lines.length > 0) {
                const firstLine = firstFrag.lines[0];
                const targetOffset = Math.min(
                  firstLine.offsetEnd,
                  Math.max(firstLine.offsetStart, absOffset),
                );
                return {
                  ...state,
                  selection: {
                    anchor: {
                      ...selection.anchor,
                      blockId: nextBlock.id,
                      inlineId: nextBlock.children[0]?.id ?? "",
                      offset: targetOffset - firstFrag.startOffset,
                    },
                    focus: {
                      ...selection.focus,
                      blockId: nextBlock.id,
                      inlineId: nextBlock.children[0]?.id ?? "",
                      offset: targetOffset - firstFrag.startOffset,
                    },
                  },
                };
              }
            }
          }
          return state;
        }

        const targetLine = currentFragment.lines[targetLineIdx];
        console.log(
          "  targetLineIdx:",
          targetLineIdx,
          "targetLine:",
          targetLine?.id,
          "line start:",
          targetLine?.offsetStart,
          "line end:",
          targetLine?.offsetEnd,
        );

        const fragStartOffset = currentFragment.startOffset;
        console.log(
          "  absOffset:",
          absOffset,
          "fragStartOffset:",
          fragStartOffset,
        );

        // Line offsetStart/offsetEnd are block-relative (not fragment-relative)
        // We need to compute our fractional X position within current line, then map to target line
        const currentLine = currentFragment.lines[currentLineIdx];

        // Position is block-relative (same coordinate system as line offsets)
        const currentLineLength =
          currentLine.offsetEnd - currentLine.offsetStart;

        // xFraction needs position relative to line start, which means NOT subtracting fragStartOffset
        // Use absOffset directly (block-relative) minus currentLine.offsetStart (block-relative)
        const posInLine = absOffset - currentLine.offsetStart;
        const xFraction =
          currentLineLength > 0 ? posInLine / currentLineLength : 0;
        const clampedFraction = Math.max(0, Math.min(1, xFraction));

        // Target position within target line using fractional position
        const targetLineLength = targetLine.offsetEnd - targetLine.offsetStart;
        let targetPos =
          targetLine.offsetStart + clampedFraction * targetLineLength;

        // Clamp to target line's bounds (don't go past end)
        targetPos = Math.max(
          targetLine.offsetStart,
          Math.min(targetLine.offsetEnd - 1, targetPos),
        );

        console.log(
          "  posInLine:",
          posInLine,
          "xFraction:",
          clampedFraction,
          "currentLineLength:",
          currentLineLength,
          "targetPos:",
          targetPos,
        );

        // Find the run containing targetPos
        // targetPos is block-relative, but run offsets in currentBlock are block-relative
        // No need for conversion
        const targetPosRel = targetPos;
        let targetInlineId = currentRun.id;
        let runStartOffset = 0;
        for (const run of currentBlock.children) {
          if (runStartOffset + run.text.length >= targetPosRel) {
            targetInlineId = run.id;
            console.log(
              "  Found target run:",
              run.id,
              "runStartOffset:",
              runStartOffset,
            );
            const targetOffset = targetPosRel - runStartOffset;
            return {
              ...state,
              selection: {
                anchor: {
                  ...selection.anchor,
                  blockId,
                  inlineId: targetInlineId,
                  offset: targetOffset,
                },
                focus: {
                  ...selection.focus,
                  blockId,
                  inlineId: targetInlineId,
                  offset: targetOffset,
                },
              },
            };
          }
          runStartOffset += run.text.length;
        }

        const lastRun = currentBlock.children[currentBlock.children.length - 1];
        return {
          ...state,
          selection: {
            anchor: {
              ...selection.anchor,
              inlineId: lastRun.id,
              offset: lastRun.text.length,
            },
            focus: {
              ...selection.focus,
              inlineId: lastRun.id,
              offset: lastRun.text.length,
            },
          },
        };
      }

      if (key === "Home" || key === "End") {
        if (!layout || !layout.pages || layout.pages.length === 0) return state;

        const blockFragments = layout.fragmentsByBlockId[blockId];
        if (!blockFragments || blockFragments.length === 0) return state;

        let absOffset = 0;
        for (const run of currentBlock.children) {
          if (run.id === inlineId) break;
          absOffset += run.text.length;
        }
        absOffset += offset;

        const currentFragment =
          blockFragments.find(
            (f: { startOffset: number; endOffset: number }) =>
              absOffset >= f.startOffset && absOffset <= f.endOffset,
          ) ?? blockFragments[0];

        const currentLineIdx = currentFragment?.lines
          ? currentFragment.lines.findIndex(
              (l: { offsetStart: number; offsetEnd: number }) =>
                absOffset >= l.offsetStart && absOffset <= l.offsetEnd,
            )
          : -1;

        if (key === "Home") {
          const currentLineStart =
            currentFragment?.lines?.[currentLineIdx >= 0 ? currentLineIdx : 0]
              ?.offsetStart ?? 0;
          let runOffset = 0;
          for (const run of currentBlock.children) {
            if (runOffset + run.text.length > currentLineStart) {
              return {
                ...state,
                selection: {
                  anchor: {
                    ...selection.anchor,
                    inlineId: run.id,
                    offset: currentLineStart - runOffset,
                  },
                  focus: {
                    ...selection.focus,
                    inlineId: run.id,
                    offset: currentLineStart - runOffset,
                  },
                },
              };
            }
            runOffset += run.text.length;
          }
          return state;
        }

        if (key === "End") {
          const currentLineEnd =
            currentFragment?.lines?.[currentLineIdx >= 0 ? currentLineIdx : 0]
              ?.offsetEnd ?? 0;
          let runOffset = 0;
          for (const run of currentBlock.children) {
            if (runOffset + run.text.length > currentLineEnd - 1) {
              return {
                ...state,
                selection: {
                  anchor: {
                    ...selection.anchor,
                    inlineId: run.id,
                    offset: Math.min(
                      currentLineEnd - runOffset,
                      run.text.length,
                    ),
                  },
                  focus: {
                    ...selection.focus,
                    inlineId: run.id,
                    offset: Math.min(
                      currentLineEnd - runOffset,
                      run.text.length,
                    ),
                  },
                },
              };
            }
            runOffset += run.text.length;
          }
          return state;
        }
      }

      return state;
    }

    case OperationType.APPEND_PARAGRAPH: {
      const [firstSection, ...rest] = document.sections;
      const nextParagraph = createParagraph(operation.payload.text);
      return {
        ...state,
        document: {
          ...document,
          revision: document.revision + 1,
          metadata: {
            ...document.metadata,
            updatedAt: Date.now(),
          },
          sections: [
            {
              ...firstSection,
              children: [...firstSection.children, nextParagraph],
            },
            ...rest,
          ],
        },
      };
    }

    default:
      return state;
  }
};
