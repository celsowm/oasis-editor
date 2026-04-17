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
    });

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

  handleMouseDown(event) {
    console.log('=== handleMouseDown chamado ===');
    console.log('Evento:', event.clientX, event.clientY);

    // Usar elementFromPoint para encontrar o fragmento clicado diretamente
    const target = document.elementFromPoint(event.clientX, event.clientY);
    
    if (!target || !target.classList.contains('oasis-fragment')) {
      console.log('❌ Clique não foi em um fragmento. Target:', target?.className);
      console.log('=== handleMouseDown finalizado ===');
      return;
    }

    const fragmentEl = target;
    const fragmentId = fragmentEl.dataset.fragmentId || '';
    const fragmentText = fragmentEl.textContent || '';
    const rect = fragmentEl.getBoundingClientRect();
    
    console.log('✅ Fragmento clicado:', fragmentId);
    console.log('Texto:', fragmentText);
    console.log('Rect viewport:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });

    // Calcular offsets X e Y do clique dentro do fragmento
    const clickXInFragment = event.clientX - rect.left;
    const clickYInFragment = event.clientY - rect.top;
    console.log('Click dentro do fragmento:', clickXInFragment.toFixed(1), clickYInFragment.toFixed(1));

    // Extrair IDs do fragment ID (formato: fragment:block:3:0)
    const parts = fragmentId.split(':');
    const blockId = parts[1] + ':' + parts[2]; // block:3
    const sectionId = 'section:0'; // assumindo seção única

    // Buscar fragmento no layout para descobrir as quebras de linha
    const layoutFragments = this.latestLayout?.fragmentsByBlockId[blockId] || [];
    const layoutFragment = layoutFragments.find(f => f.id === fragmentId) || layoutFragments[0];

    // Encontrar a linha clicada baseada na posição Y
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

    // Medir texto caractere por caractere
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
      // Fallback
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

    console.log('Offset calculado:', closestOffset);
    console.log('IDs extraídos:', { sectionId, blockId, fragmentId });

    // Encontrar o run ID real no documento
    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap(s => s.children)
      .find(b => b.id === blockId);
    
    let actualRunId = fragmentId; // fallback
    if (block && block.children && block.children.length > 0) {
      if (block.children.length === 1) {
        actualRunId = block.children[0].id;
        console.log('🔍 Usando run ID real:', actualRunId);
      } else {
        let currentOffset = 0;
        for (const run of block.children) {
          const runLength = run.text.length;
          if (closestOffset >= currentOffset && closestOffset <= currentOffset + runLength) {
            actualRunId = run.id;
            console.log('🔍 Usando run ID real (multi-run):', actualRunId);
            break;
          }
          currentOffset += runLength;
        }
      }
    }

    const position = {
      sectionId,
      blockId,
      inlineId: actualRunId,
      offset: closestOffset,
    };

    console.log('Posição lógica:', position);
    console.log('Despachando SET_SELECTION...');
    this.runtime.dispatch(
      Operations.setSelection({ anchor: position, focus: position })
    );

    console.log('=== handleMouseDown finalizado ===');
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
