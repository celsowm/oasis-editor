import { Operations } from "../core/operations/OperationFactory.js";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { DocumentLayoutService } from "./services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "./OasisEditorView.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { LayoutFragment } from "../core/layout/LayoutFragment.js";
import { LogicalPosition } from "../core/selection/SelectionTypes.js";
import { LineInfo } from "../core/layout/LayoutFragment.js";

export interface ControllerDeps {
  runtime: DocumentRuntime;
  layoutService: DocumentLayoutService;
  presenter: OasisEditorPresenter;
  view: OasisEditorView;
  measurer: TextMeasurer;
}

export class OasisEditorController {
  private runtime: DocumentRuntime;
  private layoutService: DocumentLayoutService;
  private presenter: OasisEditorPresenter;
  private view: OasisEditorView;
  private measurer: TextMeasurer;
  private latestLayout: LayoutState | null;
  private isDragging: boolean;
  private dragAnchor: LogicalPosition | null;

  constructor({
    runtime,
    layoutService,
    presenter,
    view,
    measurer,
  }: ControllerDeps) {
    this.runtime = runtime;
    this.layoutService = layoutService;
    this.presenter = presenter;
    this.view = view;
    this.measurer = measurer;
    this.latestLayout = null;
    this.isDragging = false;
    this.dragAnchor = null;
  }

  private measureWidthUpToOffset(
    fragment: LayoutFragment,
    line: LineInfo,
    endOffset: number,
  ): number {
    const lineStartOffset = line.offsetStart;
    if (lineStartOffset === endOffset) return line.x;
    
    let totalWidth = line.x;
    
    // Justification logic
    let extraSpacePerGap = 0;
    if (fragment.align === "justify" && line && fragment.lines) {
      const isLastLine = line === fragment.lines[fragment.lines.length - 1];
      if (!isLastLine) {
        const lineText = line.text.trimEnd();
        const spaces = lineText.match(/ /g) || [];
        if (spaces.length > 0) {
          extraSpacePerGap = (fragment.rect.width - line.width) / spaces.length;
        }
      }
    }
    let currentGlobalOffset = 0;
    const runs = fragment.runs?.length
      ? fragment.runs
      : [{ id: "", text: fragment.text, marks: fragment.marks ?? {} }];

    for (const run of runs) {
      const runStart = currentGlobalOffset;
      const runEnd = currentGlobalOffset + run.text.length;
      const measureStart = Math.max(lineStartOffset, runStart);
      const measureEnd = Math.min(endOffset, runEnd);

      if (measureStart < measureEnd) {
        const textToMeasure = run.text.substring(
          measureStart - runStart,
          measureEnd - runStart,
        );
        let fontWeight = fragment.typography.fontWeight;
        if (run.marks?.["bold"] || fragment.kind === "heading")
          fontWeight = 700;
        const fontStyle = run.marks?.["italic"] ? "italic" : "normal";
        const metrics = this.measurer.measureText({
          text: textToMeasure,
          fontFamily:
            (run.marks?.["fontFamily"] as string) ||
            fragment.typography.fontFamily,
          fontSize:
            (run.marks?.["fontSize"] as number) || fragment.typography.fontSize,
          fontWeight,
          fontStyle,
        });
        totalWidth += metrics.width;

        if (extraSpacePerGap > 0) {
          const spacesInSegment = (textToMeasure.match(/ /g) || []).length;
          totalWidth += spacesInSegment * extraSpacePerGap;
        }
      }
      currentGlobalOffset += run.text.length;
      if (currentGlobalOffset >= endOffset) break;
    }
    return totalWidth;
  }

  start(): void {
    this.view.renderTemplateOptions(this.presenter.getTemplateOptions());
    this.view.bind({
      onBold: () => this.toggleBold(),
      onItalic: () => this.toggleItalic(),
      onUnderline: () => this.toggleUnderline(),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onExport: () => this.exportDocument(),
      onTemplateChange: (templateId) => this.setTemplate(templateId),
      onTextInput: (text) => this.insertText(text),
      onDelete: () => this.deleteText(),
      onEnter: (isShift) =>
        isShift ? this.insertText("\n") : this.insertParagraph(),
      onArrowKey: (key) => this.moveCaret(key),
      onMouseDown: (e) => this.handleMouseDown(e),
      onMouseMove: (e) => this.handleMouseMove(e),
      onMouseUp: () => this.handleMouseUp(),
      onDblClick: (e) => this.handleDblClick(e),
      onTripleClick: (e) => this.handleTripleClick(e),
      onAlign: (align) => this.setAlign(align),
    });

    this.isDragging = false;
    this.dragAnchor = null;

    this.runtime.subscribe(() => {
      this.refresh();
    });
  }

  toggleBold(): void {
    this.runtime.dispatch(Operations.toggleMark("bold"));
  }

  toggleItalic(): void {
    this.runtime.dispatch(Operations.toggleMark("italic"));
  }

  toggleUnderline(): void {
    this.runtime.dispatch(Operations.toggleMark("underline"));
  }

  undo(): void {
    this.runtime.undo();
  }

  redo(): void {
    this.runtime.redo();
  }

  insertText(text: string): void {
    if (!text) return;
    console.log("=== insertText chamado ===", text);
    console.log("Estado atual selection:", this.runtime.getState().selection);

    const stateBefore = this.runtime.getState();
    const selectionBefore = stateBefore.selection?.anchor;
    console.log(
      "🔍 DEBUG: blockId:",
      selectionBefore?.blockId,
      "inlineId:",
      selectionBefore?.inlineId,
    );

    const blockBefore = stateBefore.document.sections
      .flatMap((s) => s.children)
      .find((b) => b.id === selectionBefore?.blockId);
    console.log(
      "🔍 DEBUG: Block encontrado?",
      blockBefore?.id,
      "Runs:",
      blockBefore?.children?.map((r) => ({
        id: r.id,
        text: r.text.substring(0, 20),
      })),
    );

    const runBefore = blockBefore?.children.find(
      (r) => r.id === selectionBefore?.inlineId,
    );
    console.log(
      "🔍 DEBUG: Run encontrado?",
      runBefore?.id,
      "Text:",
      runBefore?.text,
    );

    this.runtime.dispatch(Operations.insertText(text));
  }

  deleteText(): void {
    console.log("=== deleteText chamado ===");
    this.runtime.dispatch(Operations.deleteText());
  }

  insertParagraph(): void {
    console.log("=== insertParagraph chamado ===");
    this.runtime.dispatch(Operations.insertParagraph());
  }

  moveCaret(key: string): void {
    console.log("=== moveCaret chamado ===", key);
    this.runtime.dispatch(Operations.moveSelection(key));
  }

  setTemplate(templateId: string): void {
    const firstSection = this.runtime.getState().document.sections[0];
    this.runtime.dispatch(
      Operations.setSectionTemplate(firstSection.id, templateId),
    );
  }

  setAlign(align: "left" | "center" | "right" | "justify"): void {
    this.runtime.dispatch(Operations.setAlignment(align));
  }

  calculatePositionFromEvent(event: MouseEvent): LogicalPosition | null {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = element
      ? (element.closest(".oasis-fragment") as HTMLElement | null)
      : null;

    if (!target) return null;

    const fragmentId = target.dataset["fragmentId"] ?? "";
    const fragmentText = target.textContent ?? "";
    const rect = target.getBoundingClientRect();

    const clickXInFragment = event.clientX - rect.left;
    const clickYInFragment = event.clientY - rect.top;

    const parts = fragmentId.split(":");
    const blockId = parts[1] + ":" + parts[2];
    const sectionId = "section:0";

    const layoutFragments =
      this.latestLayout?.fragmentsByBlockId[blockId] ?? [];
    const layoutFragment =
      layoutFragments.find((f) => f.id === fragmentId) ?? layoutFragments[0];

    let targetLine: LineInfo | null = layoutFragment?.lines
      ? layoutFragment.lines[0]
      : null;
    if (layoutFragment?.lines) {
      let foundLine: LineInfo | null = null;
      for (const line of layoutFragment.lines) {
        const relativeLineY = line.y - layoutFragment.rect.y;
        if (
          clickYInFragment >= relativeLineY &&
          clickYInFragment < relativeLineY + line.height
        ) {
          foundLine = line;
          break;
        }
      }
      if (foundLine) {
        targetLine = foundLine;
      } else {
        const lastLine = layoutFragment.lines[layoutFragment.lines.length - 1];
        const unrelativeLastLineY = lastLine.y - layoutFragment.rect.y;
        if (clickYInFragment >= unrelativeLastLineY) {
          targetLine = lastLine;
        } else {
          targetLine = layoutFragment.lines[0];
        }
      }
    }

    let closestOffset = 0;
    let minDistance = Infinity;

    if (targetLine) {
      const lineStart = targetLine.offsetStart;
      const lineEnd = targetLine.offsetEnd;
      for (let i = lineStart; i <= lineEnd; i++) {
        const measuredWidth = this.measureWidthUpToOffset(
          layoutFragment,
          targetLine,
          i,
        );
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    } else {
      for (let i = 0; i <= fragmentText.length; i++) {
        // Fallback for missing targetLine (should not happen with updated engine)
        const measuredWidth = this.measureWidthUpToOffset(
          layoutFragment,
          { offsetStart: 0, offsetEnd: fragmentText.length, x: 0, width: layoutFragment.rect.width } as any,
          i,
        );
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    }

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap((s) => s.children)
      .find((b) => b.id === blockId);

    let actualRunId = fragmentId;
    let relativeOffset = closestOffset;

    if (block?.children?.length) {
      let currentOffset = 0;
      for (const run of block.children) {
        const runLength = run.text.length;
        if (
          closestOffset >= currentOffset &&
          closestOffset <= currentOffset + runLength
        ) {
          actualRunId = run.id;
          relativeOffset = closestOffset - currentOffset;
          break;
        }
        currentOffset += runLength;
      }
    }

    return {
      sectionId,
      blockId,
      inlineId: actualRunId,
      offset: relativeOffset,
    };
  }

  handleMouseDown(event: MouseEvent): void {
    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    this.isDragging = true;
    this.dragAnchor = position;
    this.runtime.dispatch(
      Operations.setSelection({ anchor: position, focus: position }),
    );
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || event.buttons !== 1) {
      this.isDragging = false;
      return;
    }

    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    this.runtime.dispatch(
      Operations.setSelection({ anchor: this.dragAnchor!, focus: position }),
    );
  }

  handleMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Selects the whole word under the click position, mirroring Word's double-click behaviour.
   */
  handleDblClick(event: MouseEvent): void {
    event.preventDefault();

    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap((s) => s.children)
      .find((b) => b.id === position.blockId);

    if (!block?.children?.length) return;

    const fullText = block.children.map((r) => r.text).join("");

    let absoluteClickOffset = position.offset;
    for (const run of block.children) {
      if (run.id === position.inlineId) break;
      absoluteClickOffset += run.text.length;
    }

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
        if (wordEnd < fullText.length && isWhitespace(fullText[wordEnd]))
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

    this.isDragging = false;
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
  }

  /**
   * Selects the whole block (paragraph) on triple click.
   */
  handleTripleClick(event: MouseEvent): void {
    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap((s) => s.children)
      .find((b) => b.id === position.blockId);

    if (!block?.children?.length) return;

    const lastRun = block.children[block.children.length - 1];

    const anchorPos: LogicalPosition = {
      ...position,
      inlineId: block.children[0].id,
      offset: 0,
    };

    const focusPos: LogicalPosition = {
      ...position,
      inlineId: lastRun.id,
      offset: lastRun.text.length,
    };

    this.isDragging = false;
    this.runtime.dispatch(
      Operations.setSelection({ anchor: anchorPos, focus: focusPos }),
    );
  }

  refresh(): void {
    const state = this.runtime.getState();
    const layout = this.layoutService.compose(state.document);
    this.latestLayout = layout;
    this.runtime.setLayout(layout);
    const viewModel = this.presenter.present({ state, layout });
    this.view.render(viewModel);
  }

  exportDocument(): void {
    this.view.downloadJson(
      "oasis-editor-document.json",
      this.runtime.exportJson(),
    );
  }
}
