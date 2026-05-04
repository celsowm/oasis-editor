import { beforeEach, describe, expect, it } from "vitest";
import { createOasisEditor } from "../../app/bootstrap/createOasisEditorApp.js";
import { setupOasisEditorDom } from "./oasisEditorTestHarness.js";

/**
 * Golden file: catalog of every toolbar `data-testid` rendered by the demo shell
 * with the default empty document. Locked in before the Phase 2 toolbar UI/UX
 * rewrite â€” any future Toolbar refactor MUST keep every entry on this list, or
 * this test goes red.
 *
 * If you intentionally remove or rename a testid, update this list in the same
 * commit and explain why in the PR.
 */
const EXPECTED_TOOLBAR_TESTIDS: readonly string[] = [
  "editor-toolbar-accept-revisions",
  "editor-toolbar-align-center",
  "editor-toolbar-align-justify",
  "editor-toolbar-align-left",
  "editor-toolbar-align-right",
  "editor-toolbar-bold",
  "editor-toolbar-color",
  "editor-toolbar-delete-table-column",
  "editor-toolbar-delete-table-row",
  "editor-toolbar-export-docx",
  "editor-toolbar-file-dropdown",
  "editor-toolbar-font-family",
  "editor-toolbar-font-size",
  "editor-toolbar-highlight",
  "editor-toolbar-image-alt",
  "editor-toolbar-import-docx",
  "editor-toolbar-indent-first-line",
  "editor-toolbar-indent-hanging",
  "editor-toolbar-indent-left",
  "editor-toolbar-insert-dropdown",
  "editor-toolbar-insert-image",
  "editor-toolbar-insert-page-number",
  "editor-toolbar-insert-table",
  "editor-toolbar-insert-table-column-after",
  "editor-toolbar-insert-table-column-before",
  "editor-toolbar-insert-table-row-after",
  "editor-toolbar-insert-table-row-before",
  "editor-toolbar-insert-total-pages",
  "editor-toolbar-italic",
  "editor-toolbar-keep-with-next",
  "editor-toolbar-line-height",
  "editor-toolbar-link",
  "editor-toolbar-list-bullet",
  "editor-toolbar-list-format",
  "editor-toolbar-list-ordered",
  "editor-toolbar-list-start-at",
  "editor-toolbar-margins",
  "editor-toolbar-merge-table",
  "editor-toolbar-orientation",
  "editor-toolbar-page-break-before",
  "editor-toolbar-paragraph-borders",
  "editor-toolbar-paragraph-shading",
  "editor-toolbar-redo",
  "editor-toolbar-reject-revisions",
  "editor-toolbar-review-dropdown",
  "editor-toolbar-section-break-continuous",
  "editor-toolbar-section-break-next",
  "editor-toolbar-spacing-after",
  "editor-toolbar-spacing-before",
  "editor-toolbar-split-table",
  "editor-toolbar-strike",
  "editor-toolbar-style",
  "editor-toolbar-subscript",
  "editor-toolbar-superscript",
  "editor-toolbar-table-align-center",
  "editor-toolbar-table-align-left",
  "editor-toolbar-table-align-right",
  "editor-toolbar-table-borders",
  "editor-toolbar-table-cell-width",
  "editor-toolbar-table-no-borders",
  "editor-toolbar-table-shading",
  "editor-toolbar-table-width-100",
  "editor-toolbar-track-changes",
  "editor-toolbar-underline",
  "editor-toolbar-undo",
  "editor-toolbar-unlink",
];

describe("Toolbar testid snapshot (regression guard for Phase 2 UI rewrite)", () => {
  beforeEach(() => {
    setupOasisEditorDom();
  });

  it("renders every expected toolbar control with its locked-in data-testid", async () => {
    const root = document.getElementById("oasis-editor-root") as HTMLElement;
    const instance = createOasisEditor(root);

    // 1. Insert a table to show contextual table buttons
    const insertDropdown = root.querySelector('[data-testid="editor-toolbar-insert-dropdown"]') as HTMLElement;
    insertDropdown.click();
    await Promise.resolve();
    const insertTableButton = document.querySelector('[data-testid="editor-toolbar-insert-table"]') as HTMLElement;
    insertTableButton.click();
    await Promise.resolve();

    // 2. Insert an image to show the 'Alt' button
    const imageInput = root.querySelector('[data-testid="editor-insert-image-input"]') as HTMLInputElement;
    const tinyFile = new File([new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ])], "tiny.png", { type: "image/png" });

    const OriginalImage = globalThis.Image;
    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 64;
      naturalHeight = 32;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: MockImage,
    });

    Object.defineProperty(imageInput, "files", { configurable: true, value: [tinyFile] });
    imageInput.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait for image to be processed and rendered
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      if (document.querySelector('img')) break;
    }

    // Select the image to show the 'Alt' button
    const image = document.querySelector('img');
    if (image) {
      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 4, clientY: 4 }));
    }

    // Wait for selectedImageRun to become active
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const altBtn = document.querySelector('[data-testid="editor-toolbar-image-alt"]');
      if (altBtn) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: OriginalImage,
    });

    // 3. Open dropdowns to render their contents in Portals
    const dropdowns = ["file", "insert", "review"];
    for (const name of dropdowns) {
      const dropdown = root.querySelector(`[data-testid="editor-toolbar-${name}-dropdown"]`) as HTMLElement;
      dropdown.click();
      await Promise.resolve();
    }

    const rendered = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid^="editor-toolbar-"]'),
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
