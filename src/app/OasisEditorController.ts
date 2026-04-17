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
      onEnter: () => this.insertParagraph(),
      onArrowKey: (key) => this.moveCaret(key),
      onMouseDown: (e) => this.handleMouseDown(e),
      onMouseMove: (e) => this.handleMouseMove(e),
      onMouseUp: (e) => this.handleMouseUp(e),
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

    const computedStyle = getComputedStyle(fragmentEl);
    const fontFamily = computedStyle.fontFamily;
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontWeight = computedStyle.fontWeight;

    let closestOffset = 0;
    let minDistance = Infinity;

    if (targetLine) {
      const lineStart = targetLine.offsetStart;
      const lineEnd = targetLine.offsetEnd;
      for (let i = lineStart; i <= lineEnd; i++) {
        const textInLineUpToI = fragmentText.substring(lineStart, i);
        const measured = this.measurer.measureText({
          text: textInLineUpToI,
          fontFamily,
          fontSize,
          fontWeight,
        });

        const distance = Math.abs(measured.width - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    } else {
      for (let i = 0; i <= fragmentText.length; i++) {
        const textUpToI = fragmentText.substring(0, i);
        const measured = this.measurer.measureText({
          text: textUpToI,
          fontFamily,
          fontSize,
          fontWeight,
        });

        const distance = Math.abs(measured.width - clickXInFragment);
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
    if (block && block.children && block.children.length > 0) {
      if (block.children.length === 1) {
        actualRunId = block.children[0].id;
      } else {
        let currentOffset = 0;
        for (const run of block.children) {
          const runLength = run.text.length;
          if (closestOffset >= currentOffset && closestOffset <= currentOffset + runLength) {
            actualRunId = run.id;
            break;
          }
          currentOffset += runLength;
        }
      }
    }

    return {
      sectionId,
      blockId,
      inlineId: actualRunId,
      offset: closestOffset,
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

  refresh() {
    console.log('REFRESH: Chamado');
    const state = this.runtime.getState();
    console.log('REFRESH: State selection:', state.selection);
    const layout = this.layoutService.compose(state.document);
    this.latestLayout = layout;
    const viewModel = this.presenter.present({ state, layout });
    console.log('REFRESH: ViewModel selection:', viewModel.selection);
    this.view.render(viewModel);
  }

  exportDocument() {
    this.view.downloadJson(
      "oasis-editor-document.json",
      this.runtime.exportJson(),
    );
  }
}
