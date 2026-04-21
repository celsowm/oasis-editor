import { LayoutFragment } from "../../core/layout/LayoutFragment.js";

export interface ResizeResult {
  blockId: string;
  width: number;
  height: number;
}

/**
 * ImageResizeOverlay — renders 8 resize handles around the selected image
 * and wires drag behaviour that preserves the aspect ratio.
 */
export class ImageResizeOverlay {
  private container: HTMLElement;
  private overlayEl: HTMLElement | null = null;
  private onResize: (result: ResizeResult) => void;

  constructor(
    container: HTMLElement,
    onResize: (result: ResizeResult) => void,
  ) {
    this.container = container;
    this.onResize = onResize;
  }

  attach(fragment: LayoutFragment): void {
    this.detach();

    const overlay = document.createElement("div");
    overlay.className = "oasis-image-resize-overlay";
    overlay.style.cssText = `
      position: absolute;
      left: ${fragment.rect.x}px;
      top: ${fragment.rect.y}px;
      width: ${fragment.rect.width}px;
      height: ${fragment.rect.height}px;
      pointer-events: none;
      z-index: 10;
    `;

    // Border ring
    const ring = document.createElement("div");
    ring.className = "oasis-image-resize-ring";
    ring.style.cssText = `
      position: absolute;
      inset: 0;
      border: 2px solid #4285f4;
      pointer-events: none;
      border-radius: 2px;
    `;
    overlay.appendChild(ring);

    // 8 handles: corners + midpoints
    const HANDLES = [
      { cursor: "nw-resize", top: "0", left: "0", originX: 1, originY: 1 },
      { cursor: "n-resize", top: "0", left: "50%", originX: 0, originY: 1 },
      { cursor: "ne-resize", top: "0", right: "0", originX: -1, originY: 1 },
      { cursor: "e-resize", top: "50%", right: "0", originX: -1, originY: 0 },
      {
        cursor: "se-resize",
        bottom: "0",
        right: "0",
        originX: -1,
        originY: -1,
      },
      {
        cursor: "s-resize",
        bottom: "0",
        left: "50%",
        originX: 0,
        originY: -1,
      },
      {
        cursor: "sw-resize",
        bottom: "0",
        left: "0",
        originX: 1,
        originY: -1,
      },
      { cursor: "w-resize", top: "50%", left: "0", originX: 1, originY: 0 },
    ] as const;

    for (const handleDef of HANDLES) {
      const handle = document.createElement("div");
      handle.className = "oasis-image-resize-handle";

      const baseStyle: Partial<CSSStyleDeclaration> = {
        position: "absolute",
        width: "9px",
        height: "9px",
        background: "#ffffff",
        border: "2px solid #4285f4",
        borderRadius: "2px",
        cursor: handleDef.cursor,
        pointerEvents: "auto",
        transform: "translate(-50%, -50%)",
        zIndex: "11",
      };

      // Position the handle
      if ("top" in handleDef) handle.style.top = handleDef.top;
      if ("bottom" in handleDef) handle.style.bottom = handleDef.bottom;
      if ("left" in handleDef) handle.style.left = handleDef.left;
      if ("right" in handleDef) handle.style.right = handleDef.right;
      if ("top" in handleDef && handleDef.top === "50%")
        handle.style.transform = "translate(-50%, -50%)";
      if ("left" in handleDef && handleDef.left === "50%")
        handle.style.transform = "translate(-50%, -50%)";

      Object.assign(handle.style, baseStyle);

      const { originX, originY } = handleDef;
      const aspectRatio =
        fragment.rect.height > 0
          ? fragment.rect.height / fragment.rect.width
          : 1;

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = fragment.rect.width;
        const startH = fragment.rect.height;

        const onMouseMove = (ev: MouseEvent) => {
          const dx = (ev.clientX - startX) * -originX;
          const dy = (ev.clientY - startY) * -originY;

          let newW = startW + dx;
          let newH = startH + dy;

          // Preserve aspect ratio unless it's a pure top/bottom or left/right handle
          if (originX !== 0 && originY !== 0) {
            // Corner — maintain aspect ratio based on dominant axis
            const dxMag = Math.abs(dx);
            const dyMag = Math.abs(dy);
            if (dxMag >= dyMag) {
              newH = newW * aspectRatio;
            } else {
              newW = newH / aspectRatio;
            }
          } else if (originY === 0) {
            // Left / right only — maintain ratio
            newH = newW * aspectRatio;
          } else {
            // Top / bottom only — maintain ratio
            newW = newH / aspectRatio;
          }

          newW = Math.max(40, Math.round(newW));
          newH = Math.max(40, Math.round(newH));

          // Live feedback — resize the overlay
          overlay.style.width = `${newW}px`;
          overlay.style.height = `${newH}px`;
        };

        const onMouseUp = (ev: MouseEvent) => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);

          const finalW = parseInt(overlay.style.width, 10);
          const finalH = parseInt(overlay.style.height, 10);
          this.onResize({ blockId: fragment.blockId, width: finalW, height: finalH });
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      overlay.appendChild(handle);
    }

    this.container.appendChild(overlay);
    this.overlayEl = overlay;
  }

  detach(): void {
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }
    this.overlayEl = null;
  }
}
