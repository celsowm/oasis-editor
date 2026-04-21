import { THEME_COLORS, STANDARD_COLORS } from "./ColorPalette.js";

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

    this.container = document.createElement("div");
    this.container.className = "oasis-color-picker";
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

    const mainButton = document.createElement("button");
    mainButton.className = "oasis-color-picker-button";
    mainButton.title = "Text Color";
    mainButton.type = "button";

    const leftPart = document.createElement("div");
    leftPart.className = "oasis-color-picker-left";

    const icon = document.createElement("span");
    icon.className = "oasis-color-picker-icon";
    icon.textContent = "A";
    leftPart.appendChild(icon);

    this.indicator = document.createElement("div");
    this.indicator.className = "oasis-color-picker-indicator";
    this.indicator.style.backgroundColor = this.currentColor;
    leftPart.appendChild(this.indicator);

    mainButton.appendChild(leftPart);

    const arrow = document.createElement("span");
    arrow.className = "oasis-color-picker-arrow";
    arrow.innerHTML = "&#9660;"; // Down arrow
    mainButton.appendChild(arrow);

    mainButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    this.container.appendChild(mainButton);

    // Dropdown
    this.dropdown = document.createElement("div");
    this.dropdown.className = "oasis-color-picker-dropdown";
    this.renderDropdownContent();
    this.container.appendChild(this.dropdown);
  }

  private renderDropdownContent(): void {
    if (!this.dropdown) return;
    this.dropdown.innerHTML = "";

    // Automatic (Black)
    const automatic = document.createElement("div");
    automatic.className = "oasis-color-picker-automatic";
    automatic.innerHTML = `
      <div class="oasis-color-picker-automatic-square"></div>
      <span>Automatic</span>
    `;
    automatic.addEventListener("click", () => this.selectColor("#000000"));
    this.dropdown.appendChild(automatic);

    // Theme Colors
    const themeSection = document.createElement("div");
    themeSection.className = "oasis-color-picker-section";
    themeSection.innerHTML = `<div class="oasis-color-picker-section-title">Theme Colors</div>`;
    
    const themeGrid = document.createElement("div");
    themeGrid.className = "oasis-color-picker-grid";
    
    THEME_COLORS.forEach(row => {
      row.forEach(swatch => {
        themeGrid.appendChild(this.createSwatch(swatch.color, swatch.name));
      });
    });
    themeSection.appendChild(themeGrid);
    this.dropdown.appendChild(themeSection);

    // Standard Colors
    const standardSection = document.createElement("div");
    standardSection.className = "oasis-color-picker-section";
    standardSection.innerHTML = `<div class="oasis-color-picker-section-title">Standard Colors</div>`;
    
    const standardGrid = document.createElement("div");
    standardGrid.className = "oasis-color-picker-grid";
    
    STANDARD_COLORS.forEach(swatch => {
      standardGrid.appendChild(this.createSwatch(swatch.color, swatch.name));
    });
    standardSection.appendChild(standardGrid);
    this.dropdown.appendChild(standardSection);
  }

  private createSwatch(color: string, name: string): HTMLElement {
    const swatch = document.createElement("div");
    swatch.className = "oasis-color-picker-swatch";
    swatch.style.backgroundColor = color;
    swatch.title = name;
    swatch.addEventListener("click", () => this.selectColor(color));
    return swatch;
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
