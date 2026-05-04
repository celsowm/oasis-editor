/**
 * DropdownManager — singleton que garante que apenas um dropdown
 * da toolbar fique aberto por vez. Qualquer componente de dropdown
 * (ColorPicker, HighlightPicker, TablePicker, etc.) se registra aqui.
 */

type CloseFn = () => void;

class DropdownManager {
  private registry: Set<CloseFn> = new Set();

  /** Registra um dropdown e retorna um id para unregister */
  register(onClose: CloseFn): CloseFn {
    this.registry.add(onClose);
    return onClose;
  }

  unregister(onClose: CloseFn): void {
    this.registry.delete(onClose);
  }

  /** Fecha todos os dropdowns registrados exceto o passado */
  closeAll(except?: CloseFn): void {
    for (const fn of this.registry) {
      if (fn !== except) {
        fn();
      }
    }
  }
}

export const dropdownManager = new DropdownManager();
