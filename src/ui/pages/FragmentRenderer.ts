import {
  DEFAULT_LIST_INDENTATION,
  DEFAULT_ORDERED_LIST_INDENTATION,
} from "../../core/composition/ParagraphComposer.js";
import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { h } from "../utils/dom.js";

export interface FragmentRenderer {
  canRender(fragment: LayoutFragment): boolean;
  render(fragment: LayoutFragment, isDimmed: boolean): HTMLElement;
}

export class ImageFragmentRenderer implements FragmentRenderer {
  canRender(fragment: LayoutFragment): boolean {
    return fragment.kind === "image" && !!fragment.imageSrc;
  }

  render(fragment: LayoutFragment, isDimmed: boolean): HTMLElement {
    const img = h("img", {
      src: fragment.imageSrc,
      alt: fragment.imageAlt ?? "",
      draggable: false,
      style: { width: "100%", height: "100%", objectFit: "fill", display: "block", userSelect: "none", pointerEvents: "none" }
    });

    const wrapper = h("div", {
      className: `oasis-image-wrapper ${isDimmed ? "oasis-dimmed" : ""}`,
      dataset: { blockId: fragment.blockId },
      style: {
        position: "absolute",
        left: `${fragment.rect.x}px`,
        top: `${fragment.rect.y}px`,
        width: `${fragment.rect.width}px`,
        height: `${fragment.rect.height}px`,
        cursor: isDimmed ? "default" : "pointer",
        pointerEvents: isDimmed ? "none" : "auto",
      },
      onMouseDown: (e: MouseEvent) => {
        if (isDimmed) return;
        e.preventDefault();
        e.stopPropagation();
        wrapper.dispatchEvent(new CustomEvent("image-select", {
          bubbles: true,
          detail: { blockId: fragment.blockId, fragment }
        }));
      }
    }, img);

    return wrapper;
  }
}

export class TableCellFragmentRenderer implements FragmentRenderer {
  canRender(fragment: LayoutFragment): boolean {
    return fragment.kind === "table-cell";
  }

  render(fragment: LayoutFragment, isDimmed: boolean): HTMLElement {
    return h("div", {
      className: `oasis-table-cell ${isDimmed ? "oasis-dimmed" : ""}`,
      dataset: { blockId: fragment.blockId },
      style: {
        position: "absolute",
        left: `${fragment.rect.x}px`,
        top: `${fragment.rect.y}px`,
        width: `${fragment.rect.width}px`,
        height: `${fragment.rect.height}px`,
        border: "1px solid #94a3b8",
        backgroundColor: "transparent",
        boxSizing: "border-box",
        pointerEvents: "none",
      }
    });
  }
}

export class TextFragmentRenderer implements FragmentRenderer {
  canRender(_fragment: LayoutFragment): boolean {
    return true; // Default fallback
  }

  render(fragment: LayoutFragment, isDimmed: boolean): HTMLElement {
    const defaultIndent = fragment.kind === "ordered-list-item"
      ? DEFAULT_ORDERED_LIST_INDENTATION
      : fragment.kind === "list-item"
        ? DEFAULT_LIST_INDENTATION
        : 0;

    const indent = fragment.indentation !== undefined ? fragment.indentation : defaultIndent;

    const fragmentEl = h("article", {
      className: `oasis-fragment oasis-fragment--${fragment.kind} ${isDimmed ? "oasis-dimmed" : ""}`,
      dataset: { fragmentId: fragment.id, blockId: fragment.blockId },
      style: {
        fontFamily: fragment.typography.fontFamily,
        fontSize: `${fragment.typography.fontSize}px`,
        left: `${fragment.rect.x}px`,
        top: `${fragment.rect.y}px`,
        width: `${fragment.rect.width}px`,
        height: `${fragment.rect.height}px`,
        textAlign: fragment.align as CSSStyleDeclaration["textAlign"],
        paddingLeft: indent > 0 ? `${indent}px` : "0",
        pointerEvents: isDimmed ? "none" : "auto",
        opacity: isDimmed ? "0.3" : "1"
      }
    });

    // Render bullet or number for list items
    if (fragment.kind === "list-item" || fragment.kind === "ordered-list-item") {
      fragmentEl.appendChild(h("div", {
        className: "oasis-bullet",
        style: {
          position: "absolute",
          left: "0",
          width: `${indent}px`,
          height: `${fragment.lines[0]?.height || 20}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, fragment.kind === "ordered-list-item" && fragment.listNumber !== undefined
         ? `${fragment.listNumber}.`
         : "•"));
    }

    const displayRuns = fragment.runs?.length
      ? fragment.runs
      : [{ text: fragment.text, marks: fragment.marks ?? {} }];

    for (const run of displayRuns) {
      const marks = run.marks || {};
      fragmentEl.appendChild(h("span", {
        style: {
          fontWeight: (marks.bold || fragment.kind === "heading") ? "700" : String(fragment.typography.fontWeight),
          fontStyle: marks.italic ? "italic" : "normal",
          textDecoration: marks.underline ? "underline" : "none",
          color: marks.color || "inherit"
        }
      }, run.text));
    }

    return fragmentEl;
  }
}

// Registry
const rendererRegistry: FragmentRenderer[] = [
  new ImageFragmentRenderer(),
  new TableCellFragmentRenderer(),
  new TextFragmentRenderer(),
];

export function renderFragment(fragment: LayoutFragment, isDimmed: boolean = false): HTMLElement {
  for (const renderer of rendererRegistry) {
    if (renderer.canRender(fragment)) {
      return renderer.render(fragment, isDimmed);
    }
  }
  // Should never reach here since TextFragmentRenderer is catch-all
  const fallback = document.createElement("div");
  fallback.className = "oasis-fragment";
  fallback.textContent = fragment.text;
  return fallback;
}
