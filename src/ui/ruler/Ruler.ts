import { PageTemplate } from "../../core/pages/PageTemplateTypes.js";
import "../../styles/components/Ruler.css";

export class Ruler {
  private container: HTMLElement;
  private template: PageTemplate | null = null;
  private rulerEl: HTMLElement;

  private currentIndentation = 0;
  private onIndentationChangeCallback?: (indent: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Create wrapper for sticky positioning
    const wrapper = document.createElement("div");
    wrapper.className = "oasis-ruler-container";

    this.rulerEl = document.createElement("div");
    this.rulerEl.className = "oasis-ruler";
    wrapper.appendChild(this.rulerEl);

    this.container.appendChild(wrapper);
  }

  onIndentationChange(cb: (indent: number) => void) {
    this.onIndentationChangeCallback = cb;
  }

  setIndentation(indent: number) {
    this.currentIndentation = indent;
    this.render();
  }

  update(template: PageTemplate, currentIndent: number = 0) {
    this.currentIndentation = currentIndent;
    if (this.template?.id === template.id) {
      this.render(); // force render in case margins changed or something else
      return;
    }
    this.template = template;
    this.render();
  }

  private render() {
    if (!this.template) return;
    this.rulerEl.innerHTML = "";
    this.rulerEl.style.width = `${this.template.size.width}px`;

    const margins = this.template.margins;
    const pageWidth = this.template.size.width;

    // Left margin area
    const leftMarginEl = document.createElement("div");
    leftMarginEl.className = "oasis-ruler-margin oasis-ruler-margin-left";
    leftMarginEl.style.width = `${margins.left}px`;
    this.rulerEl.appendChild(leftMarginEl);

    // Right margin area
    const rightMarginEl = document.createElement("div");
    rightMarginEl.className = "oasis-ruler-margin oasis-ruler-margin-right";
    rightMarginEl.style.width = `${margins.right}px`;
    rightMarginEl.style.left = `${pageWidth - margins.right}px`;
    this.rulerEl.appendChild(rightMarginEl);

    // Ticks container
    const ticksEl = document.createElement("div");
    ticksEl.className = "oasis-ruler-ticks";
    ticksEl.style.left = `${margins.left}px`;
    ticksEl.style.width = `${pageWidth - margins.left - margins.right}px`;

    // 1 inch = 96 px
    const pxPerInch = 96;
    const numTicks = Math.floor(
      (pageWidth - margins.left - margins.right) / (pxPerInch / 8),
    ); // 1/8 inch ticks

    for (let i = 0; i <= numTicks; i++) {
      const tick = document.createElement("div");
      tick.className = "oasis-ruler-tick";
      if (i % 8 === 0) {
        tick.classList.add("oasis-ruler-tick-inch");
        const number = document.createElement("span");
        number.textContent = `${i / 8}`;
        tick.appendChild(number);
      } else if (i % 4 === 0) {
        tick.classList.add("oasis-ruler-tick-half");
      } else if (i % 2 === 0) {
        tick.classList.add("oasis-ruler-tick-quarter");
      }
      tick.style.left = `${i * (pxPerInch / 8)}px`;
      ticksEl.appendChild(tick);
    }

    this.rulerEl.appendChild(ticksEl);

    // Left Indent Marker Container (Includes first-line, hanging, and block left indent)
    const leftIndentBase = margins.left + this.currentIndentation;

    // Left Indent Marker (Bottom rectangle)
    const leftIndentMarker = document.createElement("div");
    leftIndentMarker.className = "oasis-ruler-marker oasis-ruler-left-indent";
    leftIndentMarker.style.left = `${leftIndentBase}px`;
    // The visual rectangle of left indent
    leftIndentMarker.innerHTML =
      '<svg width="11" height="5" viewBox="0 0 11 5"><rect x="0" y="0" width="11" height="5" fill="#f0f0f0" stroke="#888" stroke-width="1"/></svg>';
    this.rulerEl.appendChild(leftIndentMarker);

    // Hanging Indent Marker (Upward-pointing triangle)
    const hangingIndentMarker = document.createElement("div");
    hangingIndentMarker.className =
      "oasis-ruler-marker oasis-ruler-hanging-indent";
    hangingIndentMarker.style.left = `${leftIndentBase}px`;
    hangingIndentMarker.innerHTML =
      '<svg width="11" height="9" viewBox="0 0 11 9"><path d="M5.5,0 L11,4 L11,9 L0,9 L0,4 Z" fill="#f0f0f0" stroke="#888" stroke-width="1"/></svg>';
    this.rulerEl.appendChild(hangingIndentMarker);

    // First Line Indent Marker (Downward-pointing triangle)
    const firstLineMarker = document.createElement("div");
    firstLineMarker.className = "oasis-ruler-marker oasis-ruler-first-line";
    firstLineMarker.style.left = `${leftIndentBase}px`;
    firstLineMarker.innerHTML =
      '<svg width="11" height="9" viewBox="0 0 11 9"><path d="M0,0 L11,0 L11,5 L5.5,9 L0,5 Z" fill="#f0f0f0" stroke="#888" stroke-width="1"/></svg>';
    this.rulerEl.appendChild(firstLineMarker);

    // Right Indent Marker (Upward-pointing triangle on the right margin)
    const rightIndentMarker = document.createElement("div");
    rightIndentMarker.className = "oasis-ruler-marker oasis-ruler-right-indent";
    rightIndentMarker.style.left = `${pageWidth - margins.right}px`;
    rightIndentMarker.innerHTML =
      '<svg width="11" height="9" viewBox="0 0 11 9"><path d="M5.5,0 L11,4 L11,9 L0,9 L0,4 Z" fill="#f0f0f0" stroke="#888" stroke-width="1"/></svg>';
    this.rulerEl.appendChild(rightIndentMarker);

    // Add interaction for left indent (moves all left markers)
    this.setupDraggable(leftIndentMarker, (newLeft) => {
      const relativeIndent = newLeft - margins.left;
      // Snap to 1/8 inch?
      // Let's just do smooth for now but apply limits
      const newIndent = Math.max(0, relativeIndent);
      this.setIndentation(newIndent);
      if (this.onIndentationChangeCallback) {
        this.onIndentationChangeCallback(newIndent);
      }
    });
  }

  private setupDraggable(
    element: HTMLElement,
    onDrag: (newLeft: number) => void,
  ) {
    let isDragging = false;
    let startX = 0;
    let initialLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      initialLeft = parseFloat(element.style.left);
      e.preventDefault(); // prevent text selection

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      onDrag(initialLeft + deltaX);
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    element.addEventListener("mousedown", onMouseDown);
  }
}
