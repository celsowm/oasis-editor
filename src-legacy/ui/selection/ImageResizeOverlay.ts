import { LayoutFragment } from "../../core/layout/LayoutFragment.js";

export interface ResizeResult {
  blockId: string;
  width: number;
  height: number;
}

/**
 * Strategy interface for calculating new dimensions based on handle origin.
 */
interface ResizeStrategy {
  calculate(
    dx: number,
    dy: number,
    startW: number,
    startH: number,
    aspectRatio: number,
  ): { x: number; y: number; w: number; h: number };
}

class CornerResizeStrategy implements ResizeStrategy {
  constructor(
    private originX: number,
    private originY: number,
  ) {}
  calculate(
    dx: number,
    dy: number,
    startW: number,
    startH: number,
    aspectRatio: number,
  ) {
    const deltaX = dx * -this.originX;
    const deltaY = dy * -this.originY;

    let newW = startW + deltaX;
    let newH = startH + deltaY;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      newH = newW * aspectRatio;
    } else {
      newW = newH / aspectRatio;
    }

    // Determine the offset for x and y to keep the opposite corner fixed
    const x = this.originX === 1 ? startW - newW : 0;
    const y = this.originY === 1 ? startH - newH : 0;

    return { x, y, w: newW, h: newH };
  }
}

class SideResizeStrategy implements ResizeStrategy {
  constructor(
    private isHorizontal: boolean,
    private origin: number,
  ) {}
  calculate(
    dx: number,
    dy: number,
    startW: number,
    startH: number,
    aspectRatio: number,
  ) {
    let newW = startW;
    let newH = startH;
    let x = 0;
    let y = 0;

    if (this.isHorizontal) {
      newW = startW + dx * -this.origin;
      x = this.origin === 1 ? startW - newW : 0;
      y = 0;
    } else {
      newH = startH + dy * -this.origin;
      y = this.origin === 1 ? startH - newH : 0;
      x = 0;
    }
    return { x, y, w: newW, h: newH };
  }
}

/**
 * ImageResizeOverlay — renders 8 resize handles and provides S.O.L.I.D resizing logic.
 */
export class ImageResizeOverlay {
  private container: HTMLElement;
  private overlayEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;
  private onResize: (result: ResizeResult) => void;

  constructor(
    container: HTMLElement,
    onResize: (result: ResizeResult) => void,
  ) {
    this.container = container;
    this.onResize = onResize;
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  attach(fragment: LayoutFragment): void {
    this.detach();

    const overlay = document.createElement("div");
    overlay.className = "oasis-image-resize-overlay";
    Object.assign(overlay.style, {
      position: "absolute",
      left: `${fragment.rect.x}px`,
      top: `${fragment.rect.y}px`,
      width: `${fragment.rect.width}px`,
      height: `${fragment.rect.height}px`,
      pointerEvents: "none",
      zIndex: "100",
    });

    const ring = document.createElement("div");
    ring.className = "oasis-image-resize-ring";
    Object.assign(ring.style, {
      position: "absolute",
      inset: "0",
      border: "2px solid #4285f4",
      pointerEvents: "none",
      borderRadius: "2px",
      boxShadow: "0 0 4px rgba(66, 133, 244, 0.3)",
    });
    overlay.appendChild(ring);

    // Dimensions badge
    const badge = document.createElement("div");
    badge.className = "oasis-image-resize-badge";
    Object.assign(badge.style, {
      position: "absolute",
      bottom: "-25px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#4285f4",
      color: "white",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "10px",
      fontFamily: "sans-serif",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      display: "none",
    });
    this.badgeEl = badge;
    overlay.appendChild(badge);

    const HANDLES = [
      {
        pos: { top: "0%", left: "0%" },
        strategy: new CornerResizeStrategy(1, 1),
        cursor: "nw-resize",
      },
      {
        pos: { top: "0%", left: "50%" },
        strategy: new SideResizeStrategy(false, 1),
        cursor: "n-resize",
      },
      {
        pos: { top: "0%", left: "100%" },
        strategy: new CornerResizeStrategy(-1, 1),
        cursor: "ne-resize",
      },
      {
        pos: { top: "50%", left: "100%" },
        strategy: new SideResizeStrategy(true, -1),
        cursor: "e-resize",
      },
      {
        pos: { top: "100%", left: "100%" },
        strategy: new CornerResizeStrategy(-1, -1),
        cursor: "se-resize",
      },
      {
        pos: { top: "100%", left: "50%" },
        strategy: new SideResizeStrategy(false, -1),
        cursor: "s-resize",
      },
      {
        pos: { top: "100%", left: "0%" },
        strategy: new CornerResizeStrategy(1, -1),
        cursor: "sw-resize",
      },
      {
        pos: { top: "50%", left: "0%" },
        strategy: new SideResizeStrategy(true, 1),
        cursor: "w-resize",
      },
    ];

    const aspectRatio = fragment.rect.height / fragment.rect.width;

    HANDLES.forEach((hDef) => {
      const handle = document.createElement("div");
      handle.className = "oasis-image-resize-handle";
      Object.assign(handle.style, {
        position: "absolute",
        width: "10px",
        height: "10px",
        background: "white",
        border: "1px solid #4285f4",
        borderRadius: "50%",
        cursor: hDef.cursor,
        pointerEvents: "auto",
        transform: "translate(-50%, -50%)",
        ...hDef.pos,
      });

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = fragment.rect.width;
        const startH = fragment.rect.height;
        const initialLeft = fragment.rect.x;
        const initialTop = fragment.rect.y;

        badge.style.display = "block";
        badge.textContent = `${Math.round(startW)} × ${Math.round(startH)}`;

        const onMouseMove = (moveEv: MouseEvent) => {
          const dx = moveEv.clientX - startX;
          const dy = moveEv.clientY - startY;

          const { x, y, w, h } = hDef.strategy.calculate(
            dx,
            dy,
            startW,
            startH,
            aspectRatio,
          );

          const finalW = Math.max(20, Math.round(w));
          const finalH = Math.max(20, Math.round(h));

          overlay.style.width = `${finalW}px`;
          overlay.style.height = `${finalH}px`;
          overlay.style.left = `${initialLeft + x}px`;
          overlay.style.top = `${initialTop + y}px`;

          badge.textContent = `${finalW} × ${finalH}`;
        };

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          badge.style.display = "none";

          this.onResize({
            blockId: fragment.blockId,
            width: parseInt(overlay.style.width, 10),
            height: parseInt(overlay.style.height, 10),
          });
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      overlay.appendChild(handle);
    });

    this.container.appendChild(overlay);
    this.overlayEl = overlay;
  }

  detach(): void {
    if (this.overlayEl?.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }
    this.overlayEl = null;
    this.badgeEl = null;
  }

  destroy(): void {
    this.detach();
  }
}
