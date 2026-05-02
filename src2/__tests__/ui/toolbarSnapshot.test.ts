import { beforeEach, describe, expect, it } from "vitest";
import { createOasisEditor2 } from "../../app/bootstrap/createOasisEditor2App.js";
import { setupOasisEditor2Dom } from "./oasisEditor2TestHarness.js";

/**
 * Golden file: catalog of every toolbar `data-testid` rendered by the demo shell
 * with the default empty document. Locked in before the Phase 2 toolbar UI/UX
 * rewrite — any future Toolbar refactor MUST keep every entry on this list, or
 * this test goes red.
 *
 * If you intentionally remove or rename a testid, update this list in the same
 * commit and explain why in the PR.
 */
const EXPECTED_TOOLBAR_TESTIDS: readonly string[] = [
  "editor-2-toolbar-accept-revisions",
  "editor-2-toolbar-align-center",
  "editor-2-toolbar-align-justify",
  "editor-2-toolbar-align-left",
  "editor-2-toolbar-align-right",
  "editor-2-toolbar-bold",
  "editor-2-toolbar-color",
  "editor-2-toolbar-delete-table-column",
  "editor-2-toolbar-delete-table-row",
  "editor-2-toolbar-export-docx",
  "editor-2-toolbar-font-family",
  "editor-2-toolbar-font-size",
  "editor-2-toolbar-highlight",
  "editor-2-toolbar-image-alt",
  "editor-2-toolbar-import-docx",
  "editor-2-toolbar-indent-first-line",
  "editor-2-toolbar-indent-hanging",
  "editor-2-toolbar-indent-left",
  "editor-2-toolbar-insert-image",
  "editor-2-toolbar-insert-page-number",
  "editor-2-toolbar-insert-table",
  "editor-2-toolbar-insert-table-column-after",
  "editor-2-toolbar-insert-table-column-before",
  "editor-2-toolbar-insert-table-row-after",
  "editor-2-toolbar-insert-table-row-before",
  "editor-2-toolbar-insert-total-pages",
  "editor-2-toolbar-italic",
  "editor-2-toolbar-keep-with-next",
  "editor-2-toolbar-line-height",
  "editor-2-toolbar-link",
  "editor-2-toolbar-list-bullet",
  "editor-2-toolbar-list-format",
  "editor-2-toolbar-list-ordered",
  "editor-2-toolbar-list-start-at",
  "editor-2-toolbar-margins",
  "editor-2-toolbar-merge-table",
  "editor-2-toolbar-merge-table-cells",
  "editor-2-toolbar-merge-table-rows",
  "editor-2-toolbar-orientation",
  "editor-2-toolbar-page-break-before",
  "editor-2-toolbar-paragraph-borders",
  "editor-2-toolbar-paragraph-shading",
  "editor-2-toolbar-redo",
  "editor-2-toolbar-reject-revisions",
  "editor-2-toolbar-section-break-continuous",
  "editor-2-toolbar-section-break-next",
  "editor-2-toolbar-spacing-after",
  "editor-2-toolbar-spacing-before",
  "editor-2-toolbar-split-table",
  "editor-2-toolbar-split-table-cell",
  "editor-2-toolbar-split-table-row",
  "editor-2-toolbar-strike",
  "editor-2-toolbar-style",
  "editor-2-toolbar-subscript",
  "editor-2-toolbar-superscript",
  "editor-2-toolbar-table-align-center",
  "editor-2-toolbar-table-align-left",
  "editor-2-toolbar-table-align-right",
  "editor-2-toolbar-table-borders",
  "editor-2-toolbar-table-cell-width",
  "editor-2-toolbar-table-no-borders",
  "editor-2-toolbar-table-shading",
  "editor-2-toolbar-table-width-100",
  "editor-2-toolbar-track-changes",
  "editor-2-toolbar-underline",
  "editor-2-toolbar-undo",
  "editor-2-toolbar-unlink",
];

describe("Toolbar testid snapshot (regression guard for Phase 2 UI rewrite)", () => {
  beforeEach(() => {
    setupOasisEditor2Dom();
  });

  it("renders every expected toolbar control with its locked-in data-testid", () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);

    const rendered = Array.from(
      root.querySelectorAll<HTMLElement>('[data-testid^="editor-2-toolbar-"]'),
    )
      .map((element) => element.getAttribute("data-testid"))
      .filter((id): id is string => Boolean(id));

    const renderedSet = new Set(rendered);

    const missing = EXPECTED_TOOLBAR_TESTIDS.filter((id) => !renderedSet.has(id));
    const extra = rendered.filter((id) => !EXPECTED_TOOLBAR_TESTIDS.includes(id));

    expect(missing, `Missing toolbar controls: ${missing.join(", ")}`).toEqual([]);
    expect(extra, `Unexpected new toolbar controls: ${extra.join(", ")}`).toEqual([]);

    instance.dispose();
  });
});
