import {
  DEFAULT_LIST_INDENTATION,
  DEFAULT_ORDERED_LIST_INDENTATION,
} from "../../core/composition/ParagraphComposer.js";
import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { getListMarker, getDefaultListFormat } from "../../core/document/ListUtils.js";
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

export class PageBreakFragmentRenderer implements FragmentRenderer {
  canRender(fragment: LayoutFragment): boolean {
    return fragment.kind === "page-break";
  }

  render(fragment: LayoutFragment, isDimmed: boolean): HTMLElement {
    return h("div", {
      className: `oasis-page-break ${isDimmed ? "oasis-dimmed" : ""}`,
      dataset: { fragmentId: fragment.id, blockId: fragment.blockId },
      style: {
        position: "absolute",
        left: `${fragment.rect.x}px`,
        top: `${fragment.rect.y}px`,
        width: `${fragment.rect.width}px`,
        height: "1px",
        borderTop: "1px dashed #cbd5e1",
        pointerEvents: "none",
      },
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
      const format = fragment.listFormat ?? getDefaultListFormat(fragment.kind, fragment.listLevel ?? 0);
      const marker = getListMarker(
        format,
        fragment.listNumber ?? 1,
        fragment.listLevel ?? 0,
      );
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
      }, marker));
    }

    const displayRuns = fragment.runs?.length
      ? fragment.runs
      : [{ text: fragment.text, marks: fragment.marks ?? {} }];

    const highlightToColor: Record<string, string> = {
      yellow: "#fef08a", green: "#bbf7d0", cyan: "#a5f3fc", magenta: "#f0abfc",
      blue: "#bfdbfe", red: "#fecaca", darkBlue: "#60a5fa", darkCyan: "#22d3ee",
      darkGreen: "#4ade80", darkMagenta: "#c084fc", darkRed: "#f87171",
      darkYellow: "#facc15", darkGray: "#9ca3af", lightGray: "#e5e7eb",
      black: "#000000", white: "#ffffff",
    };

    for (const run of displayRuns) {
      const marks = run.marks || {};
      const decorations: string[] = [];
      if (marks.underline) decorations.push("underline");
      if (marks.strike) decorations.push("line-through");

      const hasSpecialWhitespace = run.text.includes("\t") || run.text.includes("\n");

      const style: Record<string, string> = {
        fontWeight: (marks.bold || fragment.kind === "heading") ? "700" : String(fragment.typography.fontWeight),
        fontStyle: marks.italic ? "italic" : "normal",
        textDecoration: decorations.length > 0 ? decorations.join(" ") : "none",
        color: marks.color || "inherit",
        fontFamily: marks.fontFamily || fragment.typography.fontFamily,
        whiteSpace: hasSpecialWhitespace ? "pre-wrap" : "normal",
      };

      if (marks.fontSize) {
        style.fontSize = `${Math.round(marks.fontSize * 0.6667)}px`;
      }
      if (marks.highlight) {
        style.backgroundColor = highlightToColor[marks.highlight] || marks.highlight;
      }
      if (marks.vertAlign) {
        style.verticalAlign = marks.vertAlign === "superscript" ? "super" : "sub";
        // Shrink font slightly for super/subscript if not already sized
        if (!marks.fontSize) {
          const baseSize = fragment.typography.fontSize;
          style.fontSize = `${Math.round(baseSize * 0.75)}px`;
        }
      }

      const rev = (run as any).revision as { type: "insert" | "delete" } | undefined;
      if (rev) {
        const revStyle = {
          ...style,
          color: rev.type === "insert" ? "#15803d" : "#dc2626",
          textDecoration: rev.type === "delete" ? "line-through" : style.textDecoration,
          backgroundColor: rev.type === "insert" ? "#dcfce7" : "#fee2e2",
        };
        fragmentEl.appendChild(h("span", {
          style: revStyle,
          title: rev.type === "insert" ? "Insertion" : "Deletion",
        }, run.text));
      } else if ((run as any).field) {
        const fieldStyle = {
          ...style,
          backgroundColor: "#e5e7eb",
          borderBottom: "1px dotted #6b7280",
          padding: "0 2px",
        };
        fragmentEl.appendChild(h("span", {
          style: fieldStyle,
          title: `Field: ${(run as any).field.type}`,
        }, run.text));
      } else if ((run as any).bookmarkStart || (run as any).bookmarkEnd) {
        const bmName = (run as any).bookmarkStart || (run as any).bookmarkEnd;
        const bmStyle = {
          ...style,
          backgroundColor: "#dbeafe",
          borderBottom: "1px dashed #3b82f6",
          padding: "0 2px",
        };
        fragmentEl.appendChild(h("span", {
          style: bmStyle,
          title: `Bookmark: ${bmName}`,
        }, run.text));
      } else if ((run as any).commentId) {
        fragmentEl.appendChild(h("span", {
          style: { ...style, backgroundColor: "#fef08a" },
          title: `Comment ${(run as any).commentId}`,
        }, run.text));
      } else if ((run as any).footnoteId) {
        fragmentEl.appendChild(h("sup", {
          style: { ...style, fontSize: "10px", color: "#2563eb" },
          title: `Footnote ${(run as any).footnoteId}`,
        }, (run as any).footnoteId));
      } else if ((run as any).endnoteId) {
        fragmentEl.appendChild(h("sup", {
          style: { ...style, fontSize: "10px", color: "#7c3aed" },
          title: `Endnote ${(run as any).endnoteId}`,
        }, (run as any).endnoteId));
      } else if (marks.link) {
        fragmentEl.appendChild(h("a", {
          href: marks.link,
          target: "_blank",
          style: { ...style, color: marks.color || "#2563eb", textDecoration: "underline", cursor: "pointer" }
        }, run.text));
      } else {
        fragmentEl.appendChild(h("span", { style }, run.text));
      }
    }

    return fragmentEl;
  }
}

export class EquationFragmentRenderer implements FragmentRenderer {
  canRender(fragment: LayoutFragment): boolean {
    return fragment.kind === "equation";
  }

  render(fragment: LayoutFragment, isDimmed: boolean): HTMLElement {
    const display = fragment.equationDisplay ?? false;
    const latex = fragment.equationLatex ?? "";

    const el = h(display ? "div" : "span", {
      className: `oasis-equation ${isDimmed ? "oasis-dimmed" : ""}`,
      dataset: { blockId: fragment.blockId, latex },
      style: {
        fontFamily: "Cambria Math, Latin Modern Math, serif",
        fontSize: "18px",
        textAlign: display ? "center" : "left",
        padding: display ? "8px 0" : "0",
        whiteSpace: "pre-wrap",
        minHeight: "24px",
      },
    }, latex);

    // If MathJax is available, queue typesetting
    if (typeof (window as any).MathJax !== "undefined") {
      const MathJax = (window as any).MathJax;
      if (MathJax.typesetPromise) {
        MathJax.typesetPromise([el]).catch(() => {
          // Ignore MathJax errors; fallback text remains visible
        });
      }
    }

    return el;
  }
}

export class ChartFragmentRenderer implements FragmentRenderer {
  canRender(fragment: LayoutFragment): boolean {
    return fragment.kind === "chart";
  }

  render(fragment: LayoutFragment, isDimmed: boolean): HTMLElement {
    const chartType = fragment.chartType ?? "unknown";
    const title = fragment.chartTitle;

    const wrapper = h("div", {
      className: `oasis-chart-placeholder ${isDimmed ? "oasis-dimmed" : ""}`,
      dataset: { blockId: fragment.blockId },
      style: {
        width: `${fragment.rect.width}px`,
        height: `${fragment.rect.height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
        border: "2px dashed #d1d5db",
        borderRadius: "4px",
        color: "#6b7280",
        fontFamily: "sans-serif",
        fontSize: "14px",
        textAlign: "center",
        userSelect: "none",
        margin: "0 auto",
      },
    }, title || `[${chartType} chart placeholder]`);

    return wrapper;
  }
}

// Registry
const rendererRegistry: FragmentRenderer[] = [
  new ImageFragmentRenderer(),
  new TableCellFragmentRenderer(),
  new PageBreakFragmentRenderer(),
  new ChartFragmentRenderer(),
  new EquationFragmentRenderer(),
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
