import { IDocumentRuntime } from "../../core/runtime/IDocumentRuntime.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { CursorPositionCalculator } from "../services/CursorPositionCalculator.js";
import { PositionCalculator } from "../services/PositionCalculator.js";
import { getAllBlocks } from "../../core/document/BlockUtils.js";
import { isTextBlock } from "../../core/document/BlockTypes.js";
import { FormatPainterController } from "./FormatPainterController.js";

export class WordSelectionController {
  private readonly tempDisableWordSelection = true;

  constructor(
    private runtime: IDocumentRuntime,
    private cursorCalc: CursorPositionCalculator,
    private getPositionCalculator: () => PositionCalculator | null,
    private formatPainter: FormatPainterController,
  ) {}

  handleDblClick(event: MouseEvent): void {
    if (this.tempDisableWordSelection) {
      return;
    }
    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = getAllBlocks(state.document).find(
      (b) => b.id === position.blockId,
    );

    if (!block || !isTextBlock(block)) return;

    const fullText = block.children.map((r) => r.text).join("");
    const posCalc = this.getPositionCalculator();
    if (!posCalc) return;

    const absoluteClickOffset = posCalc.getOffsetInBlock(position);

    const isWord = (ch: string): boolean => /[a-zA-Z0-9À-ÿ_]/.test(ch);
    const isWhitespace = (ch: string): boolean => /\s/.test(ch);

    let wordStart = absoluteClickOffset;
    let wordEnd = absoluteClickOffset;

    if (absoluteClickOffset < fullText.length) {
      const ch = fullText[absoluteClickOffset];

      if (isWord(ch)) {
        while (wordStart > 0 && isWord(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && isWord(fullText[wordEnd]))
          wordEnd++;
        if (
          wordEnd < fullText.length &&
          isWhitespace(fullText[wordEnd]) &&
          fullText[wordEnd] !== "\n"
        )
          wordEnd++;
      } else if (isWhitespace(ch)) {
        while (wordStart > 0 && isWhitespace(fullText[wordStart - 1]))
          wordStart--;
        while (wordEnd < fullText.length && isWhitespace(fullText[wordEnd]))
          wordEnd++;
      } else {
        const isPunct = (c: string): boolean => !isWord(c) && !isWhitespace(c);
        while (wordStart > 0 && isPunct(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && isPunct(fullText[wordEnd]))
          wordEnd++;
      }
    } else if (fullText.length > 0) {
      wordEnd = fullText.length;
      wordStart = wordEnd;
      while (wordStart > 0 && isWhitespace(fullText[wordStart - 1]))
        wordStart--;
      if (wordStart > 0) {
        const type = isWord(fullText[wordStart - 1]);
        while (
          wordStart > 0 &&
          isWord(fullText[wordStart - 1]) === type &&
          !isWhitespace(fullText[wordStart - 1])
        )
          wordStart--;
      }
    }

    const resolvePos = (
      absoluteOffset: number,
    ): { inlineId: string; offset: number } => {
      let currentOffset = 0;
      for (const run of block.children) {
        const runEnd = currentOffset + run.text.length;
        if (absoluteOffset >= currentOffset && absoluteOffset <= runEnd) {
          return { inlineId: run.id, offset: absoluteOffset - currentOffset };
        }
        currentOffset = runEnd;
      }
      const lastRun = block.children[block.children.length - 1];
      return { inlineId: lastRun.id, offset: lastRun.text.length };
    };

    const anchorInfo = resolvePos(wordStart);
    const focusInfo = resolvePos(wordEnd);

    this.runtime.dispatch(
      Operations.setSelection({
        anchor: {
          ...position,
          inlineId: anchorInfo.inlineId,
          offset: anchorInfo.offset,
        },
        focus: {
          ...position,
          inlineId: focusInfo.inlineId,
          offset: focusInfo.offset,
        },
      }),
    );

    if (this.formatPainter.shouldApplyOnMouseUp()) {
      this.formatPainter.apply();
    }
  }

  handleTripleClick(event: MouseEvent): void {
    if (this.tempDisableWordSelection) {
      return;
    }
    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = getAllBlocks(state.document).find(
      (b) => b.id === position.blockId,
    );

    if (!block || !isTextBlock(block)) return;

    const lastRun = block.children[block.children.length - 1];

    const anchorPos = {
      ...position,
      inlineId: block.children[0].id,
      offset: 0,
    };

    const focusPos = {
      ...position,
      inlineId: lastRun.id,
      offset: lastRun.text.length,
    };

    this.runtime.dispatch(
      Operations.setSelection({ anchor: anchorPos, focus: focusPos }),
    );

    if (this.formatPainter.shouldApplyOnMouseUp()) {
      this.formatPainter.apply();
    }
  }
}
