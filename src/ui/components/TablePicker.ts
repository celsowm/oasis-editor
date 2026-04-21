export interface TablePickerListener {
  onTableSelected: (rows: number, cols: number) => void;
}

export class TablePicker {
  private button: HTMLElement;
  private listener: TablePickerListener;
  private dropdown: HTMLElement | null = null;
  private isOpen: boolean = false;
  private gridContainer: HTMLElement | null = null;
  private infoText: HTMLElement | null = null;

  constructor(buttonId: string, listener: TablePickerListener) {
    const btn = document.getElementById(buttonId);
    if (!btn) throw new Error(`Button #${buttonId} not found`);
    this.button = btn;
    this.listener = listener;

    this.init();
  }

  private init(): void {
    // Dropdown (absolute positioned relative to body or button)
    this.dropdown = document.createElement("div");
    this.dropdown.className = "oasis-table-picker-dropdown";
    
    this.infoText = document.createElement("div");
    this.infoText.className = "oasis-table-picker-info";
    this.infoText.textContent = "0 x 0 Table";
    this.dropdown.appendChild(this.infoText);

    this.gridContainer = document.createElement("div");
    this.gridContainer.className = "oasis-table-picker-grid";
    
    for (let r = 1; r <= 10; r++) {
      for (let c = 1; c <= 10; c++) {
        const cell = document.createElement("div");
        cell.className = "oasis-table-picker-cell";
        cell.dataset["row"] = r.toString();
        cell.dataset["col"] = c.toString();

        cell.addEventListener("mouseover", (e) => {
          e.stopPropagation();
          this.highlightGrid(r, c);
        });
        
        cell.addEventListener("click", (e) => {
          e.stopPropagation();
          this.listener.onTableSelected(r, c);
          this.toggleDropdown();
        });

        this.gridContainer.appendChild(cell);
      }
    }

    this.dropdown.appendChild(this.gridContainer);
    document.body.appendChild(this.dropdown);

    this.button.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    window.addEventListener("click", () => {
      if (this.isOpen) this.toggleDropdown();
    });

    this.dropdown.addEventListener("click", (e) => e.stopPropagation());
  }

  private highlightGrid(rows: number, cols: number): void {
    if (!this.gridContainer || !this.infoText) return;
    this.infoText.textContent = `${rows} x ${cols} Table`;

    const cells = this.gridContainer.querySelectorAll(".oasis-table-picker-cell");
    cells.forEach((cell) => {
      const r = parseInt((cell as HTMLElement).dataset["row"] || "0");
      const c = parseInt((cell as HTMLElement).dataset["col"] || "0");
      if (r <= rows && c <= cols) {
        cell.classList.add("highlight");
      } else {
        cell.classList.remove("highlight");
      }
    });
  }

  private toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      const rect = this.button.getBoundingClientRect();
      this.dropdown!.style.top = `${rect.bottom + window.scrollY + 5}px`;
      this.dropdown!.style.left = `${rect.left + window.scrollX}px`;
      this.dropdown!.classList.add("show");
      this.highlightGrid(0, 0);
    } else {
      this.dropdown!.classList.remove("show");
    }
  }
}
