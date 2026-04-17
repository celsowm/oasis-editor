// @ts-nocheck








import { Operations } from "../core/operations/OperationFactory.js";

export class OasisEditorController {









  constructor({ runtime, layoutService, presenter, view, measurer }) {
    this.runtime = runtime;
    this.layoutService = layoutService;
    this.presenter = presenter;
    this.view = view;
    this.measurer = measurer;
  }

  measureWidthUpToOffset(fragment, lineStartOffset, endOffset) {
     if (lineStartOffset === endOffset) return 0;
     let totalWidth = 0;
     let currentGlobalOffset = 0;
     const runs = fragment.runs || [{ text: fragment.text, marks: fragment.marks || {} }];
     for (const run of runs) {
        const runStart = currentGlobalOffset;
        const runEnd = currentGlobalOffset + run.text.length;
        const measureStart = Math.max(lineStartOffset, runStart);
        const measureEnd = Math.min(endOffset, runEnd);

        if (measureStart < measureEnd) {
           const textToMeasure = run.text.substring(measureStart - runStart, measureEnd - runStart);
           let fontWeight = fragment.typography.fontWeight;
           if (run.marks?.bold || fragment.kind === "heading") fontWeight = 700;
           let fontStyle = run.marks?.italic ? "italic" : "normal";
           const metrics = this.measurer.measureText({
              text: textToMeasure,
              fontFamily: run.marks?.fontFamily || fragment.typography.fontFamily,
              fontSize: run.marks?.fontSize || fragment.typography.fontSize,
              fontWeight,
              fontStyle
           });
           totalWidth += metrics.width;
        }
        currentGlobalOffset += run.text.length;
        if (currentGlobalOffset >= endOffset) break;
     }
     return totalWidth;
  }

  start() {
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
      onEnter: (isShift) => isShift ? this.insertText('\n') : this.insertParagraph(),
      onArrowKey: (key) => this.moveCaret(key),
      onMouseDown: (e) => this.handleMouseDown(e),
      onMouseMove: (e) => this.handleMouseMove(e),
      onMouseUp: (e) => this.handleMouseUp(e),
      onDblClick: (e) => this.handleDblClick(e),
      onTripleClick: (e) => this.handleTripleClick(e),
    });

    this.isDragging = false;
    this.dragAnchor = null;

    this.runtime.subscribe(() => {
      this.refresh();
    });
  }

  toggleBold() {
    this.runtime.dispatch(Operations.toggleMark("bold"));
  }

  toggleItalic() {
    this.runtime.dispatch(Operations.toggleMark("italic"));
  }

  toggleUnderline() {
    this.runtime.dispatch(Operations.toggleMark("underline"));
  }

  undo() {
    this.runtime.undo();
  }

  redo() {
    this.runtime.redo();
  }

  insertText(text) {
    if (!text) return;
    console.log('=== insertText chamado ===', text);
    console.log('Estado atual selection:', this.runtime.getState().selection);
    
    // Log the state before
    const stateBefore = this.runtime.getState();
    const selectionBefore = stateBefore.selection?.anchor;
    console.log('🔍 DEBUG: blockId:', selectionBefore?.blockId, 'inlineId:', selectionBefore?.inlineId);
    
    // Find the block and run
    const blockBefore = stateBefore.document.sections
      .flatMap(s => s.children)
      .find(b => b.id === selectionBefore?.blockId);
    console.log('🔍 DEBUG: Block encontrado?', blockBefore?.id, 'Runs:', blockBefore?.children?.map(r => ({id: r.id, text: r.text.substring(0, 20)})));
    
    const runBefore = blockBefore?.children.find(r => r.id === selectionBefore?.inlineId);
    console.log('🔍 DEBUG: Run encontrado?', runBefore?.id, 'Text:', runBefore?.text);
    
    this.runtime.dispatch(Operations.insertText(text));
  }

  deleteText() {
    console.log('=== deleteText chamado ===');
    this.runtime.dispatch(Operations.deleteText());
  }

  insertParagraph() {
    console.log('=== insertParagraph chamado ===');
    this.runtime.dispatch(Operations.insertParagraph());
  }

  moveCaret(key) {
    console.log('=== moveCaret chamado ===', key);
    this.runtime.dispatch(Operations.moveSelection(key));
  }

  setTemplate(templateId) {
    const firstSection = this.runtime.getState().document.sections[0];
    this.runtime.dispatch(
      Operations.setSectionTemplate(firstSection.id, templateId),
    );
  }

  calculatePositionFromEvent(event) {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = element ? element.closest('.oasis-fragment') : null;
    
    if (!target) {
      return null;
    }

    const fragmentEl = target;
    const fragmentId = fragmentEl.dataset.fragmentId || '';
    const fragmentText = fragmentEl.textContent || '';
    const rect = fragmentEl.getBoundingClientRect();
    
    const clickXInFragment = event.clientX - rect.left;
    const clickYInFragment = event.clientY - rect.top;

    const parts = fragmentId.split(':');
    const blockId = parts[1] + ':' + parts[2];
    const sectionId = 'section:0';

    const layoutFragments = this.latestLayout?.fragmentsByBlockId[blockId] || [];
    const layoutFragment = layoutFragments.find(f => f.id === fragmentId) || layoutFragments[0];

    let targetLine = layoutFragment?.lines ? layoutFragment.lines[0] : null;
    if (layoutFragment && layoutFragment.lines) {
      let foundLine = null;
      for (const line of layoutFragment.lines) {
        const relativeLineY = line.y - layoutFragment.rect.y;
        if (clickYInFragment >= relativeLineY && clickYInFragment < relativeLineY + line.height) {
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
        const measuredWidth = this.measureWidthUpToOffset(layoutFragment, lineStart, i);
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    } else {
      for (let i = 0; i <= fragmentText.length; i++) {
        const measuredWidth = this.measureWidthUpToOffset(layoutFragment, 0, i);
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    }

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap(s => s.children)
      .find(b => b.id === blockId);

    let actualRunId = fragmentId;
    let relativeOffset = closestOffset;

    if (block && block.children && block.children.length > 0) {
      let currentOffset = 0;
      for (const run of block.children) {
        const runLength = run.text.length;
        if (closestOffset >= currentOffset && closestOffset <= currentOffset + runLength) {
          actualRunId = run.id;
          relativeOffset = closestOffset - currentOffset;
          break;
        }
        currentOffset += runLength;
      }
      // If none found (clicking past end), use last run
      if (!actualRunId && block.children.length > 0) {
        const lastRun = block.children[block.children.length - 1];
        actualRunId = lastRun.id;
        relativeOffset = lastRun.text.length;
      }
    }

    return {
      sectionId,
      blockId,
      inlineId: actualRunId,
      offset: relativeOffset,
    };
  }

  handleMouseDown(event) {
    const position = this.calculatePositionFromEvent(event);
    if (!position) return;
    
    this.isDragging = true;
    this.dragAnchor = position;
    this.runtime.dispatch(
      Operations.setSelection({ anchor: position, focus: position })
    );
  }

  handleMouseMove(event) {
    // Left mouse button must be held down (buttons === 1)
    if (!this.isDragging || event.buttons !== 1) {
       this.isDragging = false;
       return;
    }
    
    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    this.runtime.dispatch(
      Operations.setSelection({ anchor: this.dragAnchor, focus: position })
    );
  }

  handleMouseUp(event) {
    this.isDragging = false;
  }

  /**
   * Selects the whole word under the click position, mirroring Word's double-click behaviour.
   *
   * Word boundary rules (same as most editors):
   *   - A "word" is a maximal run of \w characters (letters, digits, underscores).
   *   - A "punctuation group" is a maximal run of non-\w, non-whitespace characters.
   *   - Trailing whitespace after the word is included (Word behaviour), but leading
   *     whitespace is not.
   */
  /**
   * Selects the whole word under the click position, mirroring Word's double-click behaviour.
   */
  handleDblClick(event) {
    event.preventDefault();

    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap(s => s.children)
      .find(b => b.id === position.blockId);

    if (!block || !block.children || block.children.length === 0) return;

    const fullText = block.children.map(r => r.text).join('');

    // position.offset is relative to the run – convert to absolute offset within the block
    let absoluteClickOffset = position.offset;
    for (const run of block.children) {
      if (run.id === position.inlineId) break;
      absoluteClickOffset += run.text.length;
    }

    const isWord = (ch) => /[a-zA-Z0-9À-ÿ_]/.test(ch);
    const isWhitespace = (ch) => /\s/.test(ch);

    let wordStart = absoluteClickOffset;
    let wordEnd = absoluteClickOffset;

    if (absoluteClickOffset < fullText.length) {
      const ch = fullText[absoluteClickOffset];

      if (isWord(ch)) {
        while (wordStart > 0 && isWord(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && isWord(fullText[wordEnd])) wordEnd++;
        // Incluir UM espaço depois (Comportamento Word)
        if (wordEnd < fullText.length && isWhitespace(fullText[wordEnd])) {
          wordEnd++;
        }
      } else if (isWhitespace(ch)) {
        while (wordStart > 0 && isWhitespace(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && isWhitespace(fullText[wordEnd])) wordEnd++;
      } else {
        const isPunct = (c) => !isWord(c) && !isWhitespace(c);
        while (wordStart > 0 && isPunct(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && isPunct(fullText[wordEnd])) wordEnd++;
      }
    } else if (fullText.length > 0) {
      wordEnd = fullText.length;
      wordStart = wordEnd;
      while (wordStart > 0 && isWhitespace(fullText[wordStart-1])) wordStart--;
      if (wordStart > 0) {
         const type = isWord(fullText[wordStart-1]);
         while (wordStart > 0 && isWord(fullText[wordStart-1]) === type && !isWhitespace(fullText[wordStart-1])) wordStart--;
      }
    }

    const resolvePos = (absoluteOffset) => {
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
        anchor: { ...position, inlineId: anchorInfo.inlineId, offset: anchorInfo.offset },
        focus: { ...position, inlineId: focusInfo.inlineId, offset: focusInfo.offset }
      })
    );
  }

  /**
   * Selects the whole block (paragraph) on triple click.
   */
  handleTripleClick(event) {
    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap(s => s.children)
      .find(b => b.id === position.blockId);

    if (!block || !block.children || block.children.length === 0) return;

    const lastRun = block.children[block.children.length - 1];

    const anchorPos = {
      ...position,
      inlineId: block.children[0].id,
      offset: 0
    };

    const focusPos = {
      ...position,
      inlineId: lastRun.id,
      offset: lastRun.text.length
    };

    this.isDragging = false;
    this.runtime.dispatch(
      Operations.setSelection({ anchor: anchorPos, focus: focusPos })
    );
  }

  refresh() {
    const state = this.runtime.getState();
    const layout = this.layoutService.compose(state.document);
    this.latestLayout = layout;
    const viewModel = this.presenter.present({ state, layout });
    this.view.render(viewModel);
  }

  exportDocument() {
    this.view.downloadJson(
      "oasis-editor-document.json",
      this.runtime.exportJson(),
    );
  }
}
