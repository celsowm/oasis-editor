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
    this.runtime.dispatch(Operations.insertText(text));
  }

  deleteText() {
    this.runtime.dispatch(Operations.deleteText());
  }

  insertParagraph() {
    this.runtime.dispatch(Operations.insertParagraph());
  }

  moveCaret(key) {
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
    
    const state = this.runtime.getState();
    const layout = this.layoutService.compose(state.document);
    
    console.log('Layout fragmentsByBlockId:', Object.keys(layout.fragmentsByBlockId).length, 'blocos');
    
    // Obter coordenadas do clique relativas ao container de páginas
    const pagesContainer = this.view.elements.pagesContainer;
    const containerRect = pagesContainer.getBoundingClientRect();
    const clickX = event.clientX - containerRect.left;
    const clickY = event.clientY - containerRect.top;

    console.log('Click relativo ao container:', clickX, clickY);
    console.log('Container rect:', containerRect);

    // Encontrar qual página foi clicada para ajustar coordenadas
    const pageElements = pagesContainer.querySelectorAll('.oasis-page');
    let clickedPage = null;
    let pageOffsetX = 0;
    let pageOffsetY = 0;

    for (const pageEl of pageElements) {
      const pageRect = pageEl.getBoundingClientRect();
      const pageX = pageRect.left - containerRect.left;
      const pageY = pageRect.top - containerRect.top;

      // Verificar se o clique está dentro desta página
      if (
        clickX >= pageX &&
        clickX <= pageX + pageRect.width &&
        clickY >= pageY &&
        clickY <= pageY + pageRect.height
      ) {
        clickedPage = pageEl;
        pageOffsetX = pageX;
        pageOffsetY = pageY;
        console.log('✅ Página clicada encontrada:', pageEl.dataset.pageId);
        console.log('Page offset:', { pageOffsetX, pageOffsetY });
        break;
      }
    }

    // Ajustar coordenadas do clique para serem relativas ao conteúdo da página
    const adjustedClickX = clickX - pageOffsetX;
    const adjustedClickY = clickY - pageOffsetY;

    console.log('Click ajustado (relativo à página):', adjustedClickX, adjustedClickY);

    // Iterar sobre todos os fragments para encontrar qual contém o ponto clicado
    let foundFragment = null;
    let foundBlockId = null;
    let foundSectionId = null;

    for (const [blockId, fragments] of Object.entries(layout.fragmentsByBlockId)) {
      for (const fragment of fragments) {
        const { x, y, width, height } = fragment.rect;

        console.log(`Verificando fragment ${fragment.id} [${blockId}]:`, { x, y, width, height });
        console.log(`Texto: "${fragment.text.substring(0, 30)}..."`);
        console.log(`Click está dentro? X: ${adjustedClickX} >= ${x} && <= ${x + width}, Y: ${adjustedClickY} >= ${y} && <= ${y + height}`);

        // Verificar se o clique está dentro deste fragment
        if (
          adjustedClickX >= x &&
          adjustedClickX <= x + width &&
          adjustedClickY >= y &&
          adjustedClickY <= y + height
        ) {
          console.log('✅ FRAGMENT ENCONRADO!', fragment.id);
          foundFragment = fragment;
          foundBlockId = blockId;
          foundSectionId = fragment.sectionId;
          break;
        }
      }
      if (foundFragment) break;
    }

    // Se não encontrou nenhum fragment, tentar encontrar o fragment mais próximo verticalmente
    if (!foundFragment) {
      console.log('❌ Nenhum fragment encontrado com hit exato, tentando fallback...');
      let closestFragment = null;
      let closestDistance = Infinity;
      let closestBlockId = null;
      let closestSectionId = null;

      for (const [blockId, fragments] of Object.entries(layout.fragmentsByBlockId)) {
        for (const fragment of fragments) {
          const { y, height } = fragment.rect;
          // Verificar se o clique está na mesma faixa vertical (com margem de erro)
          if (clickY >= y - 10 && clickY <= y + height + 10) {
            const distance = Math.abs(clickY - y);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestFragment = fragment;
              closestBlockId = blockId;
              closestSectionId = fragment.sectionId;
            }
          }
        }
      }

      if (closestFragment) {
        console.log('✅ FRAGMENT ENCONRADO via fallback:', closestFragment.id);
        foundFragment = closestFragment;
        foundBlockId = closestBlockId;
        foundSectionId = closestSectionId;
      } else {
        console.log('❌❌ NENHUM fragment encontrado mesmo com fallback');
      }
    }

    if (foundFragment) {
      console.log('Processando fragment:', foundFragment.id);
      console.log('Text:', foundFragment.text);
      console.log('Rect:', foundFragment.rect);
      console.log('Offsets:', foundFragment.startOffset, '-', foundFragment.endOffset);

      // Calcular o offset do caractere mais próximo dentro do fragment
      const clickXInFragment = adjustedClickX - foundFragment.rect.x;
      console.log('Click X dentro do fragment:', clickXInFragment);
      
      let closestOffset = foundFragment.startOffset;
      let minDistance = Infinity;

      // Medir texto caractere por caractere para encontrar o offset mais próximo
      for (let i = 0; i <= foundFragment.text.length; i++) {
        const textUpToI = foundFragment.text.substring(0, i);
        const measured = this.measurer.measureText({
          text: textUpToI,
          fontFamily: foundFragment.typography.fontFamily,
          fontSize: foundFragment.typography.fontSize,
          fontWeight: foundFragment.typography.fontWeight,
        });
        
        const distance = Math.abs(measured.width - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = foundFragment.startOffset + i;
        }
      }

      // Limitar o offset ao final do fragment
      closestOffset = Math.min(closestOffset, foundFragment.endOffset);

      console.log('Offset calculado:', closestOffset);

      // Construir a posição lógica
      const position = {
        sectionId: foundSectionId,
        blockId: foundBlockId,
        inlineId: foundFragment.id,
        offset: closestOffset,
      };

      console.log('Posição lógica:', position);
      console.log('Despachando SET_SELECTION...');

      // Despachar a operação de seleção
      this.runtime.dispatch(
        Operations.setSelection({ anchor: position, focus: position })
      );
      
      console.log('=== handleMouseDown finalizado ===');
    } else {
      console.log('⚠️ Nenhum fragment encontrado, seleção NÃO atualizada');
    }
  }

  refresh() {
    console.log('REFRESH: Chamado');
    const state = this.runtime.getState();
    console.log('REFRESH: State selection:', state.selection);
    const layout = this.layoutService.compose(state.document);
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
