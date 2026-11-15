import { For, Show, type JSX } from "solid-js";
import type { RevisionMarkupBox } from "@/ui/editorUiTypes.js";
import type { Accessor } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";

export interface RevisionMarkupOverlayProps {
  boxes: Accessor<RevisionMarkupBox[]>;
}

/**
 * Paints Word-style track-changes decorations over the canvas: a solid green
 * underline for insertions, a red strike-through for deletions and a violet
 * underline for formatting (property) revisions. Structural table-cell
 * revisions (`variant === "cell"`) instead draw a full coloured cell outline,
 * section-level revisions (`variant === "section"`) a dashed per-page outline,
 * and `variant === "balloon"` a right-margin reviewer card (author, type and
 * snippet) with a connector back to the anchor text. Presentational only —
 * hit-testing and editing stay on the canvas underneath.
 */
export function RevisionMarkupOverlay(
  props: RevisionMarkupOverlayProps,
): JSX.Element {
  const t = useI18n();
  const typeLabel = (type: string): string => {
    if (type === "insert") return t("review.revisionInsert");
    if (type === "delete") return t("review.revisionDelete");
    if (type === "grid") return t("review.revisionGrid");
    if (type === "property") return t("review.revisionProperty");
    return t("review.revisionOther");
  };
  return (
    <div class="oasis-editor-revision-markup-root">
      <For each={props.boxes()}>
        {(box): JSX.Element => (
          <Show
            when={box.variant === "balloon"}
            fallback={
              <span
                class="oasis-editor-revision-markup"
                classList={{
                  "oasis-editor-revision-markup-insert": box.type === "insert",
                  "oasis-editor-revision-markup-delete": box.type === "delete",
                  "oasis-editor-revision-markup-property":
                    box.type === "property",
                  "oasis-editor-revision-markup-merge": box.type === "merge",
                  "oasis-editor-revision-markup-grid": box.type === "grid",
                  "oasis-editor-revision-markup-cell": box.variant === "cell",
                  "oasis-editor-revision-markup-section":
                    box.variant === "section",
                }}
                data-testid="editor-revision-markup"
                data-revision-type={box.type}
                data-revision-id={box.revisionId}
                data-revision-cell={box.variant === "cell" ? "true" : undefined}
                data-revision-section={
                  box.variant === "section" ? "true" : undefined
                }
                style={{
                  left: `${box.left}px`,
                  top: `${box.top}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                }}
              />
            }
          >
            <>
              <span
                class="oasis-editor-revision-balloon-connector"
                style={{
                  left: `${box.connectorLeft ?? box.left}px`,
                  top: `${box.connectorTop ?? box.top}px`,
                  width: `${box.connectorWidth ?? 0}px`,
                }}
              />
              <span
                class="oasis-editor-revision-balloon"
                classList={{
                  "oasis-editor-revision-balloon-insert": box.type === "insert",
                  "oasis-editor-revision-balloon-delete": box.type === "delete",
                  "oasis-editor-revision-balloon-property":
                    box.type === "property",
                  "oasis-editor-revision-balloon-grid": box.type === "grid",
                }}
                data-testid="editor-revision-balloon"
                data-revision-type={box.type}
                data-revision-id={box.revisionId}
                style={{
                  left: `${box.left}px`,
                  top: `${box.top}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                }}
              >
                <span class="oasis-editor-revision-balloon-head">
                  <strong>{box.author ?? "—"}</strong>
                  <span>{typeLabel(box.type)}</span>
                </span>
                <span class="oasis-editor-revision-balloon-snippet">
                  {box.snippet || "—"}
                </span>
              </span>
            </>
          </Show>
        )}
      </For>
    </div>
  );
}
