// @ts-nocheck








export class CaretOverlay {








  constructor(container, mapper) {
    this.container = container;
    this.mapper = mapper;
  }

  render(position) {
    console.log('CARET_OVERLAY: render chamado', position);
    console.log('CARET_OVERLAY: Container antes:', this.container);
    console.log('CARET_OVERLAY: Filhos no container:', this.container.children.length);
    this.container.innerHTML = "";
    console.log('CARET_OVERLAY: Container limpo, filhos:', this.container.children.length);
    if (!position || !this.mapper?.getCaretRect) {
      console.log('CARET_OVERLAY: Posição ou mapper inválido, saindo');
      return;
    }

    const rect = this.mapper.getCaretRect(position);
    console.log('CARET_OVERLAY: rect calculado:', rect);
    if (!rect) {
      console.log('CARET_OVERLAY: rect é null, saindo');
      return;
    }

    const el = document.createElement("div");
    el.className = "oasis-caret";
    el.style.left = `${rect.x}px`;
    el.style.top = `${rect.y}px`;
    el.style.height = `${rect.height}px`;
    console.log('CARET_OVERLAY: Elemento caret criado:', {
      left: el.style.left,
      top: el.style.top,
      height: el.style.height,
      className: el.className
    });
    
    // Verificar estilos computados
    this.container.appendChild(el);
    console.log('CARET_OVERLAY: Caret adicionado ao container');
    console.log('CARET_OVERLAY: Container depois, filhos:', this.container.children.length);
    console.log('CARET_OVERLAY: Container dimensões:', {
      offsetWidth: this.container.offsetWidth,
      offsetHeight: this.container.offsetHeight,
      position: getComputedStyle(this.container).position,
      zIndex: getComputedStyle(this.container).zIndex,
      display: getComputedStyle(this.container).display
    });
    
    const caretEl = this.container.querySelector('.oasis-caret');
    if (caretEl) {
      console.log('CARET_OVERLAY: Caret element encontrado:', caretEl);
      console.log('CARET_OVERLAY: Caret estilos computados:', {
        width: getComputedStyle(caretEl).width,
        height: getComputedStyle(caretEl).height,
        left: getComputedStyle(caretEl).left,
        top: getComputedStyle(caretEl).top,
        background: getComputedStyle(caretEl).background,
        display: getComputedStyle(caretEl).display,
        opacity: getComputedStyle(caretEl).opacity,
        position: getComputedStyle(caretEl).position,
        zIndex: getComputedStyle(caretEl).zIndex,
        visibility: getComputedStyle(caretEl).visibility
      });
    } else {
      console.log('CARET_OVERLAY: ❌ Caret element NÃO encontrada no DOM!');
      console.log('CARET_OVERLAY: Container innerHTML:', this.container.innerHTML);
    }
  }
}
