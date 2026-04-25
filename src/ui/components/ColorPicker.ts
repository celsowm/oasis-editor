import { THEME_COLORS, STANDARD_COLORS } from "./ColorPalette.js";
import { createIcons, icons } from "lucide";
import { h } from "../utils/dom.js";

export interface ColorPickerListener {
  onColorSelected: (color: string) => void;
}

export class ColorPicker {
  private container: HTMLElement;
  private listener: ColorPickerListener;
  private currentColor: string = "#000000";
  private dropdown: HTMLElement | null = null;
  private indicator: HTMLElement | null = null;
  private isOpen: boolean = false;

  constructor(containerId: string, listener: ColorPickerListener) {
    const parent = document.getElementById(containerId);
    if (!parent) throw new Error(`Container #${containerId} not found`);

    this.container = h('div', { className: 'oasis-color-picker' });
    parent.appendChild(this.container);

    this.listener = listener;
    this.render();
    this.setupGlobalEvents();
  }

  setCurrentColor(color: string): void {
    this.currentColor = color;
    if (this.indicator) {
      this.indicator.style.backgroundColor = color;
    }
  }

  private render(): void {
    this.container.innerHTML = "";

    this.indicator = h('div', { 
        className: 'oasis-color-picker-indicator',
        style: { backgroundColor: this.currentColor }
    });

    const combinedButton = h('button', {
        className: 'oasis-color-picker-button',
        title: 'Text Color',
        type: 'button',
        onClick: (e: MouseEvent) => {
            e.stopPropagation();
            this.toggleDropdown();
        }
    }, [
        h('div', { className: 'oasis-color-picker-left' }, [
            h('span', { className: 'oasis-color-picker-icon' }, [
                h('i', { dataset: { lucide: 'baseline' } })
            ]),
            this.indicator
        ]),
        h('span', { className: 'oasis-color-picker-arrow' }, '▼')
    ]);

    this.dropdown = h('div', { className: 'oasis-color-picker-dropdown' });
    this.renderDropdownContent();

    this.container.appendChild(combinedButton);
    this.container.appendChild(this.dropdown);

    createIcons({ icons, nameAttr: "data-lucide", root: this.container });
  }

  private renderDropdownContent(): void {
    if (!this.dropdown) return;
    this.dropdown.innerHTML = "";

    this.dropdown.appendChild(h('div', {
        className: 'oasis-color-picker-automatic',
        onClick: () => this.selectColor('#000000')
    }, [
        h('div', { className: 'oasis-color-picker-automatic-square' }),
        h('span', {}, 'Automatic')
    ]));

    // Theme Colors
    this.dropdown.appendChild(h('div', { className: 'oasis-color-picker-section' }, [
        h('div', { className: 'oasis-color-picker-section-title' }, 'Theme Colors'),
        h('div', { className: 'oasis-color-picker-grid' }, 
            THEME_COLORS.flatMap(row => 
                row.map(swatch => this.createSwatch(swatch.color, swatch.name))
            )
        )
    ]));

    // Standard Colors
    this.dropdown.appendChild(h('div', { className: 'oasis-color-picker-section' }, [
        h('div', { className: 'oasis-color-picker-section-title' }, 'Standard Colors'),
        h('div', { className: 'oasis-color-picker-grid' }, 
            STANDARD_COLORS.map(swatch => this.createSwatch(swatch.color, swatch.name))
        )
    ]));
  }

  private createSwatch(color: string, name: string): HTMLElement {
    return h('div', {
        className: 'oasis-color-picker-swatch',
        title: name,
        style: { backgroundColor: color },
        onClick: () => this.selectColor(color)
    });
  }

  private toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.dropdown?.classList.add("show");
    } else {
      this.dropdown?.classList.remove("show");
    }
  }

  private selectColor(color: string): void {
    this.setCurrentColor(color);
    this.listener.onColorSelected(color);
    this.toggleDropdown();
  }

  private setupGlobalEvents(): void {
    window.addEventListener("click", () => {
      if (this.isOpen) {
        this.toggleDropdown();
      }
    });
  }
}
