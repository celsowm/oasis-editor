import { Component, For, Show, Switch, Match } from "solid-js";
import { LayoutFragment } from "../../core/layout/LayoutFragment.js";
import { TextRun } from "../../core/document/BlockTypes.js";
import { getListMarker, getDefaultListFormat } from "../../core/document/ListUtils.js";
import {
  DEFAULT_LIST_INDENTATION,
  DEFAULT_ORDERED_LIST_INDENTATION
} from "../../core/composition/ParagraphComposer.js";
import { sanitizeUrl } from "../../core/utils/sanitizeUrl.js";

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "#fef08a", green: "#bbf7d0", cyan: "#a5f3fc", magenta: "#f0abfc",
  blue: "#bfdbfe", red: "#fecaca", darkBlue: "#60a5fa", darkCyan: "#22d3ee",
  darkGreen: "#4ade80", darkMagenta: "#c084fc", darkRed: "#f87171",
  darkYellow: "#facc15", darkGray: "#9ca3af", lightGray: "#e5e7eb",
  black: "#000000", white: "#ffffff",
};

function renderRun(run: TextRun, fragment: LayoutFragment) {
  const marks = run.marks || {};
  const decorations: string[] = [];
  if (marks.underline) decorations.push("underline");
  if (marks.strike) decorations.push("line-through");

  const style = {
    "font-weight": (marks.bold || fragment.kind === "heading") ? "700" : String(fragment.typography.fontWeight),
    "font-style": marks.italic ? "italic" : "normal",
    "text-decoration": decorations.length > 0 ? decorations.join(" ") : "none",
    color: marks.color || "inherit",
    "font-family": marks.fontFamily || fragment.typography.fontFamily,
    "white-space": "pre",
    "font-size": marks.fontSize ? `${marks.fontSize}px` : (marks.vertAlign ? `${Math.round(fragment.typography.fontSize * 0.75)}px` : undefined),
    "background-color": marks.highlight ? (HIGHLIGHT_COLORS[marks.highlight] || marks.highlight) : undefined,
    "vertical-align": marks.vertAlign === "superscript" ? "super" : (marks.vertAlign === "subscript" ? "sub" : undefined),
  };

  const rev = (run as any).revision as { type: "insert" | "delete" } | undefined;

  return (
    <Switch fallback={<span style={style}>{run.text}</span>}>
      <Match when={rev}>
        <span
          style={{
            ...style,
            color: rev!.type === "insert" ? "#15803d" : "#dc2626",
            "text-decoration": rev!.type === "delete" ? "line-through" : style["text-decoration"],
            "background-color": rev!.type === "insert" ? "#dcfce7" : "#fee2e2",
          }}
          title={rev!.type === "insert" ? "Insertion" : "Deletion"}
        >
          {run.text}
        </span>
      </Match>
      <Match when={(run as any).field}>
        <span
          style={{ ...style, "background-color": "#e5e7eb", "border-bottom": "1px dotted #6b7280", padding: "0 2px" }}
          title={`Field: ${(run as any).field.type}`}
        >
          {run.text}
        </span>
      </Match>
      <Match when={marks.link}>
        {(() => {
          const safeHref = sanitizeUrl(marks.link as string);
          return safeHref ? (
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...style, color: marks.color || "#2563eb", "text-decoration": "underline", cursor: "pointer" }}
            >
              {run.text}
            </a>
          ) : (
            <span style={style}>{run.text}</span>
          );
        })()}
      </Match>
      <Match when={(run as any).footnoteId}>
        <sup
          class="oasis-footnote-ref"
          data-footnote-id={(run as any).footnoteId}
          style={{ ...style, "font-size": "10px", color: "#2563eb", cursor: "pointer" }}
          title={`Footnote ${(run as any).footnoteId}`}
        >
          {(run as any).footnoteId}
        </sup>
      </Match>
    </Switch>
  );
}

export const TextFragment: Component<{ fragment: LayoutFragment; isDimmed: boolean }> = (props) => {
  const indent = () => {
    const defaultIndent = props.fragment.kind === "ordered-list-item"
      ? DEFAULT_ORDERED_LIST_INDENTATION
      : props.fragment.kind === "list-item"
        ? DEFAULT_LIST_INDENTATION
        : 0;
    return props.fragment.indentation !== undefined ? props.fragment.indentation : defaultIndent;
  };

  const displayRuns = () => props.fragment.runs?.length
    ? props.fragment.runs
    : [{ id: `${props.fragment.id}:run:0`, text: props.fragment.text, marks: props.fragment.marks ?? {} }];

  return (
    <article
      class={`oasis-fragment oasis-fragment--${props.fragment.kind} ${props.isDimmed ? "oasis-dimmed" : ""}`}
      data-fragment-id={props.fragment.id}
      data-block-id={props.fragment.blockId}
      style={{
        "font-family": props.fragment.typography.fontFamily,
        "font-size": `${props.fragment.typography.fontSize}px`,
        left: `${props.fragment.rect.x}px`,
        top: `${props.fragment.rect.y}px`,
        width: `${props.fragment.rect.width}px`,
        height: `${props.fragment.rect.height}px`,
        "padding-left": indent() > 0 ? `${indent()}px` : "0",
        "pointer-events": props.isDimmed ? "none" : "auto",
        opacity: props.isDimmed ? "0.3" : "1",
        overflow: "visible",
      }}
    >
      <Show when={props.fragment.kind === "list-item" || props.fragment.kind === "ordered-list-item"}>
        <div
          class="oasis-bullet"
          style={{
            position: "absolute",
            left: "0",
            width: `${indent()}px`,
            height: `${props.fragment.lines[0]?.height || 20}px`,
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
          }}
        >
          {getListMarker(
            props.fragment.listFormat ?? getDefaultListFormat(props.fragment.kind as any, props.fragment.listLevel ?? 0),
            props.fragment.listNumber ?? 1,
            props.fragment.listLevel ?? 0,
          )}
        </div>
      </Show>

      <For each={props.fragment.lines.length > 0 ? props.fragment.lines : [{
        id: `${props.fragment.id}:line:0`,
        text: props.fragment.text,
        width: props.fragment.rect.width,
        height: props.fragment.rect.height,
        x: 0,
        y: props.fragment.rect.y,
        offsetStart: 0,
        offsetEnd: props.fragment.text.length,
        runs: displayRuns(),
      }]}>
        {(line) => (
          <div
            class="oasis-fragment-line"
            style={{
              position: "absolute",
              left: `${line.x}px`,
              top: `${line.y - props.fragment.rect.y}px`,
              height: `${line.height}px`,
              "white-space": "pre",
              "word-break": "normal",
            }}
          >
            <For each={line.runs?.length ? line.runs : displayRuns()}>
              {(run) => renderRun(run, props.fragment)}
            </For>
          </div>
        )}
      </For>
    </article>
  );
};

export const ImageFragment: Component<{ fragment: LayoutFragment; isDimmed: boolean }> = (props) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent("image-select", {
      bubbles: true,
      detail: { blockId: props.fragment.blockId },
    });
    (e.currentTarget as HTMLElement).dispatchEvent(event);
  };

  return (
    <div
      class={`oasis-image-wrapper ${props.isDimmed ? "oasis-dimmed" : ""}`}
      data-block-id={props.fragment.blockId}
      onClick={handleClick}
      draggable={!props.isDimmed}
      style={{
        position: "absolute",
        left: `${props.fragment.rect.x}px`,
        top: `${props.fragment.rect.y}px`,
        width: `${props.fragment.rect.width}px`,
        height: `${props.fragment.rect.height}px`,
        cursor: props.isDimmed ? "default" : "move",
        "pointer-events": props.isDimmed ? "none" : "auto",
      }}
    >
      <img
        src={props.fragment.imageSrc}
        alt={props.fragment.imageAlt ?? ""}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          "object-fit": "fill",
          display: "block",
          "user-select": "none",
          "pointer-events": "none",
        }}
      />
    </div>
  );
};

export const TableCellFragment: Component<{ fragment: LayoutFragment; isDimmed: boolean }> = (props) => (
  <div
    class={`oasis-table-cell ${props.isDimmed ? "oasis-dimmed" : ""}`}
    data-block-id={props.fragment.blockId}
    style={{
      position: "absolute",
      left: `${props.fragment.rect.x}px`,
      top: `${props.fragment.rect.y}px`,
      width: `${props.fragment.rect.width}px`,
      height: `${props.fragment.rect.height}px`,
      border: "1px solid #94a3b8",
      "background-color": "transparent",
      "box-sizing": "border-box",
      "pointer-events": "none",
    }}
  ></div>
);

export const FragmentRenderer: Component<{ fragment: LayoutFragment; isDimmed: boolean }> = (props) => {
  return (
    <Switch fallback={<TextFragment fragment={props.fragment} isDimmed={props.isDimmed} />}>
      <Match when={props.fragment.kind === "image"}>
        <ImageFragment fragment={props.fragment} isDimmed={props.isDimmed} />
      </Match>
      <Match when={props.fragment.kind === "table-cell"}>
        <TableCellFragment fragment={props.fragment} isDimmed={props.isDimmed} />
      </Match>
      <Match when={props.fragment.kind === "page-break"}>
        <div
          class={`oasis-page-break ${props.isDimmed ? "oasis-dimmed" : ""}`}
          data-fragment-id={props.fragment.id}
          data-block-id={props.fragment.blockId}
          style={{
            position: "absolute",
            left: `${props.fragment.rect.x}px`,
            top: `${props.fragment.rect.y}px`,
            width: `${props.fragment.rect.width}px`,
            height: "1px",
            "border-top": "1px dashed #cbd5e1",
            "pointer-events": "none",
          }}
        ></div>
      </Match>
    </Switch>
  );
};
