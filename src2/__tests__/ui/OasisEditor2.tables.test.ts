import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOasisEditor2 } from "../../app/bootstrap/createOasisEditor2App.js";
import { importDocxToEditor2Document } from "../../import/docx/importDocxToEditor2Document.js";
import { buildDocx, createTinyPngFile, setupOasisEditor2Dom } from "./oasisEditor2TestHarness.js";

describe("OasisEditor2", () => {
  beforeEach(() => {
    setupOasisEditor2Dom();
  });

  it("moves between imported table cells with tab and shift plus tab", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(root.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(2);

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
    await Promise.resolve();
    input.value = "X";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "X", inputType: "insertText" }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        const cellTexts = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
          (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
        );
        if (cellTexts[1] === "XB1") {
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    let cells = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["A1", "XB1"]);

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab", shiftKey: true }));
    await Promise.resolve();
    input.value = "Y";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "Y", inputType: "insertText" }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        const cellTexts = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
          (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
        );
        if (cellTexts[0] === "YA1") {
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    cells = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["YA1", "XB1"]);

    instance.dispose();
  });

  it("keeps tab navigation in tables even when the active cell paragraph is a list item", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p>
                  <w:pPr>
                    <w:numPr>
                      <w:ilvl w:val="0"/>
                      <w:numId w:val="1"/>
                    </w:numPr>
                  </w:pPr>
                  <w:r><w:t>A1</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:abstractNum w:abstractNumId="1">
          <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl>
        </w:abstractNum>
        <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
      </w:numbering>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
    await Promise.resolve();
    input.value = "X";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "X", inputType: "insertText" }));
    await Promise.resolve();

    const cells = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells[0]).toContain("A1");
    expect(cells[1]).toBe("XB1");

    instance.dispose();
  });

  it("splits a table cell with enter and keeps the table structure", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();

    const cell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(cell.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(2);
    expect(root.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(1);

    instance.dispose();
  });

  it("backspaces inside a table cell without collapsing the table", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Backspace" }));
    await Promise.resolve();

    const cell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(cell.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(1);
    expect(cell.textContent?.replace(/\u00A0/g, "")).toBe("a");
    expect(root.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(1);

    instance.dispose();
  });

  it("deletes forward inside a table cell without collapsing the table", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Delete" }));
    await Promise.resolve();

    const cell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(cell.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(1);
    expect(cell.textContent?.replace(/\u00A0/g, "")).toBe("a");
    expect(root.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(1);

    instance.dispose();
  });

  it("moves vertically between table cells with arrow up and arrow down", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await Promise.resolve();

    input.value = "X";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "X", inputType: "insertText" }));
    await Promise.resolve();

    let cells = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["A", "XB"]);

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }));
    await Promise.resolve();

    input.value = "Y";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "Y", inputType: "insertText" }));
    await Promise.resolve();

    cells = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["YA", "XB"]);

    instance.dispose();
  });

  it("merges and splits table cells horizontally through the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const mergeButton = root.querySelector(
      '[data-testid="editor-2-toolbar-merge-table-cells"]',
    ) as HTMLButtonElement;
    const splitButton = root.querySelector(
      '[data-testid="editor-2-toolbar-split-table-cell"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight", shiftKey: true }));
    await Promise.resolve();

    expect(mergeButton.disabled).toBe(false);
    mergeButton.click();
    await Promise.resolve();

    let cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(1);
    expect(cells[0]?.getAttribute("colspan")).toBe("2");
    expect(cells[0]?.textContent?.replace(/\u00A0/g, "")).toContain("A");
    expect(cells[0]?.textContent?.replace(/\u00A0/g, "")).toContain("B");

    expect(splitButton.disabled).toBe(false);
    splitButton.click();
    await Promise.resolve();

    cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(2);
    expect(cells[0]?.getAttribute("colspan") ?? "1").toBe("1");
    expect(cells[1]?.getAttribute("colspan") ?? "1").toBe("1");

    instance.dispose();
  });

  it("merges table cells contextually through the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const mergeButton = root.querySelector(
      '[data-testid="editor-2-toolbar-merge-table"]',
    ) as HTMLButtonElement;
    const splitButton = root.querySelector(
      '[data-testid="editor-2-toolbar-split-table"]',
    ) as HTMLButtonElement;

    const horizontalFile = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [horizontalFile],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight", shiftKey: true }));
    await Promise.resolve();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelector('[data-testid="editor-2-table-selection-label"]')?.textContent?.includes("Table selection: 2 cells")) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(root.querySelector('[data-testid="editor-2-table-selection-label"]')?.textContent).toContain("Table selection: 2 cells");

    mergeButton.click();
    await Promise.resolve();

    let cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(1);
    expect(cells[0]?.getAttribute("colspan")).toBe("2");

    expect(splitButton.disabled).toBe(false);
    splitButton.click();
    await Promise.resolve();

    cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(2);
    expect(cells[0]?.getAttribute("colspan") ?? "1").toBe("1");
    expect(cells[1]?.getAttribute("colspan") ?? "1").toBe("1");

    instance.dispose();
  });

  it("splits table rows contextually through the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const splitButton = root.querySelector(
      '[data-testid="editor-2-toolbar-split-table"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge w:val="restart"/></w:tcPr>
                <w:p><w:r><w:t>C</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge w:val="continue"/></w:tcPr>
                <w:p><w:r><w:t>D</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    expect(splitButton.disabled).toBe(false);
    splitButton.click();
    await Promise.resolve();

    const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(2);
    expect(cells[0]?.getAttribute("rowspan") ?? "1").toBe("1");
    expect(cells[1]?.getAttribute("rowspan") ?? "1").toBe("1");

    instance.dispose();
  });

  it("inserts and deletes table rows through the advanced table actions", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const insertRowAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-row-after"]',
    ) as HTMLButtonElement;
    const deleteRowButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-row"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>A2</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 4) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    insertRowAfterButton.click();
    await Promise.resolve();

    let rows = root.querySelectorAll('[data-testid="editor-2-table-row"]');
    expect(rows.length).toBe(3);

    let cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["A1", "A2", "", "", "B1", "B2"]);

    deleteRowButton.click();
    await Promise.resolve();

    rows = root.querySelectorAll('[data-testid="editor-2-table-row"]');
    expect(rows.length).toBe(2);
    cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["A1", "A2", "B1", "B2"]);

    instance.dispose();
  });

  it("inserts and deletes table columns through the advanced table actions", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const insertColumnAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-column-after"]',
    ) as HTMLButtonElement;
    const deleteColumnButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-column"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>A2</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>B2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 4) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    insertColumnAfterButton.click();
    await Promise.resolve();

    let rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(2);
    let cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["A1", "", "A2", "B1", "", "B2"]);

    deleteColumnButton.click();
    await Promise.resolve();

    rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(2);
    cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["A1", "A2", "B1", "B2"]);

    instance.dispose();
  });

  it("inserts and deletes table columns in vertically merged tables", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const insertColumnAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-column-after"]',
    ) as HTMLButtonElement;
    const deleteColumnButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-column"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge w:val="restart"/></w:tcPr>
                <w:p><w:r><w:t>A1</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>A2</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge/></w:tcPr>
                <w:p><w:r><w:t>Hidden</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>B2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    expect(insertColumnAfterButton.disabled).toBe(false);
    insertColumnAfterButton.click();
    await Promise.resolve();

    let rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(2);
    let rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["A1", "", "A2"], ["", "B2"]]);

    deleteColumnButton.click();
    await Promise.resolve();

    rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(2);
    rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["A1", "A2"], ["B2"]]);

    instance.dispose();
  });

  it("inserts and deletes table rows in horizontally merged tables", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const insertRowAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-row-after"]',
    ) as HTMLButtonElement;
    const deleteRowButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-row"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
                <w:p><w:r><w:t>Merged</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>Tail</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Bottom</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Right</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 4) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    expect(insertRowAfterButton.disabled).toBe(false);
    insertRowAfterButton.click();
    await Promise.resolve();

    let rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(3);
    let rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["Merged", "Tail"], ["", ""], ["Bottom", "Right"]]);

    deleteRowButton.click();
    await Promise.resolve();

    rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(2);
    rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["Merged", "Tail"], ["Bottom", "Right"]]);

    instance.dispose();
  });

  it("inserts and deletes table rows and columns in mixed-span tables", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const insertRowAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-row-after"]',
    ) as HTMLButtonElement;
    const deleteRowButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-row"]',
    ) as HTMLButtonElement;
    const insertColumnAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-column-after"]',
    ) as HTMLButtonElement;
    const deleteColumnButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-column"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge w:val="restart"/>
                </w:tcPr>
                <w:p><w:r><w:t>TopLeft</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>TopRight</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge/>
                </w:tcPr>
                <w:p><w:r><w:t>Hidden</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>BottomRight</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    expect(insertRowAfterButton.disabled).toBe(false);
    expect(deleteRowButton.disabled).toBe(false);
    expect(insertColumnAfterButton.disabled).toBe(false);
    expect(deleteColumnButton.disabled).toBe(false);

    insertRowAfterButton.click();
    await Promise.resolve();

    expect(root.querySelectorAll('[data-testid="editor-2-table-row"]').length).toBe(3);
    expect((root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement).getAttribute("rowspan")).toBe("3");

    deleteRowButton.click();
    await Promise.resolve();

    expect(root.querySelectorAll('[data-testid="editor-2-table-row"]').length).toBe(2);
    expect((root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement).getAttribute("rowspan")).toBe("2");

    insertColumnAfterButton.click();
    await Promise.resolve();

    let rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    let rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["TopLeft", "TopRight", ""], ["BottomRight", ""]]);

    deleteColumnButton.click();
    await Promise.resolve();

    rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["TopLeft", "TopRight"], ["BottomRight"]]);

    instance.dispose();
  });

  it("inserts and deletes table columns in horizontally merged tables", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const insertColumnAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-column-after"]',
    ) as HTMLButtonElement;
    const deleteColumnButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-column"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
                <w:p><w:r><w:t>Merged</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>Tail</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Bottom</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Right</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 4) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    expect(insertColumnAfterButton.disabled).toBe(false);
    insertColumnAfterButton.click();
    await Promise.resolve();

    let rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(2);
    let rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["Merged", "", "Tail"], ["Bottom", "Right", ""]]);

    deleteColumnButton.click();
    await Promise.resolve();

    rows = Array.from(root.querySelectorAll('[data-testid="editor-2-table-row"]'));
    expect(rows.length).toBe(2);
    rowTexts = rows.map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
        (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
      ),
    );
    expect(rowTexts).toEqual([["Merged", "Tail"], ["Bottom", "Right"]]);

    instance.dispose();
  });

  it("inserts and deletes table rows in vertically merged tables", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const insertRowAfterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table-row-after"]',
    ) as HTMLButtonElement;
    const deleteRowButton = root.querySelector(
      '[data-testid="editor-2-toolbar-delete-table-row"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge w:val="restart"/></w:tcPr>
                <w:p><w:r><w:t>A1</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>A2</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr><w:vMerge/></w:tcPr>
                <w:p><w:r><w:t>Hidden</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>B2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();

    expect(insertRowAfterButton.disabled).toBe(false);
    insertRowAfterButton.click();
    await Promise.resolve();

    let rows = root.querySelectorAll('[data-testid="editor-2-table-row"]');
    expect(rows.length).toBe(3);
    let firstCell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(firstCell.getAttribute("rowspan")).toBe("3");

    deleteRowButton.click();
    await Promise.resolve();

    rows = root.querySelectorAll('[data-testid="editor-2-table-row"]');
    expect(rows.length).toBe(2);
    firstCell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(firstCell.getAttribute("rowspan")).toBe("2");

    instance.dispose();
  });

  it("merges and splits table rows vertically through the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const mergeButton = root.querySelector(
      '[data-testid="editor-2-toolbar-merge-table-rows"]',
    ) as HTMLButtonElement;
    const splitButton = root.querySelector(
      '[data-testid="editor-2-toolbar-split-table-row"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", shiftKey: true }));
    await Promise.resolve();

    expect(mergeButton.disabled).toBe(false);
    mergeButton.click();
    await Promise.resolve();

    let cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(1);
    expect(cells[0]?.getAttribute("rowspan")).toBe("2");
    expect(cells[0]?.textContent?.replace(/\u00A0/g, "")).toContain("A");
    expect(cells[0]?.textContent?.replace(/\u00A0/g, "")).toContain("B");

    expect(splitButton.disabled).toBe(false);
    splitButton.click();
    await Promise.resolve();

    cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(2);
    expect(cells[0]?.getAttribute("rowspan") ?? "1").toBe("1");
    expect(cells[1]?.getAttribute("rowspan") ?? "1").toBe("1");
    expect(cells[0]?.textContent?.replace(/\u00A0/g, "")).toContain("A");
    expect(cells[1]?.textContent?.replace(/\u00A0/g, "")).toContain("");

    instance.dispose();
  });

  it("moves vertically past continued cells created by a row merge", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const mergeButton = root.querySelector(
      '[data-testid="editor-2-toolbar-merge-table-rows"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>C</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", shiftKey: true }));
    await Promise.resolve();

    mergeButton.click();
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await Promise.resolve();
    input.value = "X";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "X", inputType: "insertText" }));
    await Promise.resolve();

    const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["AB", "XC"]);

    instance.dispose();
  });

  it("highlights the visible range of a mixed-span table selection", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge w:val="restart"/>
                </w:tcPr>
                <w:p><w:r><w:t>TopLeft</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>TopRight</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge/>
                </w:tcPr>
                <w:p><w:r><w:t>Hidden</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>BottomRight</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const paragraphs = root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"] [data-paragraph-id]');
    expect(paragraphs.length).toBe(3);

    paragraphs[0]!.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 6,
        clientY: 6,
      }),
    );
    await Promise.resolve();

    paragraphs[2]!.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        shiftKey: true,
        clientX: 6,
        clientY: 6,
      }),
    );
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.querySelectorAll('[data-testid="editor-2-selection-box"]').length).toBe(3);

    instance.dispose();
  });

  it("moves through visible cells in a mixed-span table with tab and shift plus tab", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge w:val="restart"/>
                </w:tcPr>
                <w:p><w:r><w:t>TopLeft</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>TopRight</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge/>
                </w:tcPr>
                <w:p><w:r><w:t>Hidden</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>BottomRight</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
    await Promise.resolve();
    input.value = "X";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "X", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab", shiftKey: true }));
    await Promise.resolve();
    input.value = "Y";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "Y", inputType: "insertText" }));
    await Promise.resolve();

    const cellTexts = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cellTexts).toEqual(["YTopLeft", "XTopRight", "BottomRight"]);

    instance.dispose();
  });

  it("moves vertically through a mixed-span table with arrow down and arrow up", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge w:val="restart"/>
                </w:tcPr>
                <w:p><w:r><w:t>TopLeft</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>TopRight</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr>
                  <w:gridSpan w:val="2"/>
                  <w:vMerge/>
                </w:tcPr>
                <w:p><w:r><w:t>Hidden</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:p><w:r><w:t>BottomRight</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await Promise.resolve();
    input.value = "D";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "D", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }));
    await Promise.resolve();
    input.value = "U";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "U", inputType: "insertText" }));
    await Promise.resolve();

    const cellTexts = Array.from(root.querySelectorAll('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cellTexts).toEqual(["UTopLeft", "TopRight", "DBottomRight"]);

    instance.dispose();
  });

  it("disables vertical merge when a selected cell already has multiple blocks", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const mergeButton = root.querySelector(
      '[data-testid="editor-2-toolbar-merge-table-rows"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.value = "x";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "x", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", shiftKey: true }));
    await Promise.resolve();

    expect(mergeButton.disabled).toBe(true);

    instance.dispose();
  });

  it("disables vertical merge when a selected cell already has multiple blocks", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const mergeButton = root.querySelector(
      '[data-testid="editor-2-toolbar-merge-table-rows"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>A1</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>B1</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.value = "x";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "x", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", shiftKey: true }));
    await Promise.resolve();

    expect(mergeButton.disabled).toBe(true);

    instance.dispose();
  });

  it("backspaces within a multi-block table cell without flattening the cell", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>A</w:t></w:r></w:p>
                <w:p><w:r><w:t>B</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>Tail</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const cellParagraphs = root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"] [data-paragraph-id]');
    expect(cellParagraphs.length).toBe(3);

    cellParagraphs[1]!.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 5,
        clientY: 5,
      }),
    );
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Backspace" }));
    await Promise.resolve();

    const firstCell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(firstCell.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(1);
    const cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]')).map(
      (cell) => cell.textContent?.replace(/\u00A0/g, "") ?? "",
    );
    expect(cells).toEqual(["AB", "Tail"]);
    expect(root.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(2);

    instance.dispose();
  });

  it("splits a multi-block table cell with enter at a block boundary and keeps the table structure", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>A</w:t></w:r></w:p>
                <w:p><w:r><w:t>B</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>Tail</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const cellParagraphs = root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"] [data-paragraph-id]');
    expect(cellParagraphs.length).toBe(3);

    cellParagraphs[0]!.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 5,
        clientY: 5,
      }),
    );
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();

    const firstCell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(firstCell.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(3);
    expect(firstCell.textContent?.replace(/\u00A0/g, "")).toBe("AB");
    expect(root.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(2);

    instance.dispose();
  });

  it("deletes forward across a multi-block table cell boundary and merges the blocks", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:p><w:r><w:t>A</w:t></w:r></w:p>
                <w:p><w:r><w:t>B</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>Tail</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 2) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const cellParagraphs = root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"] [data-paragraph-id]');
    expect(cellParagraphs.length).toBe(3);

    cellParagraphs[0]!.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 5,
        clientY: 5,
      }),
    );
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Delete" }));
    await Promise.resolve();

    const firstCell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(firstCell.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(1);
    expect(firstCell.textContent?.replace(/\u00A0/g, "")).toBe("AB");
    expect(root.querySelectorAll('[data-testid="editor-2-table-cell"]').length).toBe(2);

    instance.dispose();
  });

  it("preserves horizontal span when merging and splitting vertically in a mixed-span table", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const mergeButton = root.querySelector(
      '[data-testid="editor-2-toolbar-merge-table-rows"]',
    ) as HTMLButtonElement;
    const splitButton = root.querySelector(
      '[data-testid="editor-2-toolbar-split-table-row"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc>
                <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
                <w:p><w:r><w:t>A</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>R1</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc>
                <w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
                <w:p><w:r><w:t>B</w:t></w:r></w:p>
              </w:tc>
              <w:tc><w:p><w:r><w:t>R2</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 4) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const firstParagraph = root.querySelector('[data-testid="editor-2-table-cell"] [data-paragraph-id]') as HTMLElement;
    firstParagraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", shiftKey: true }));
    await Promise.resolve();

    mergeButton.click();
    await Promise.resolve();

    let cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(3);
    expect(cells[0]?.getAttribute("colspan")).toBe("2");
    expect(cells[0]?.getAttribute("rowspan")).toBe("2");

    splitButton.click();
    await Promise.resolve();

    cells = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
    expect(cells.length).toBe(4);
    expect(cells[0]?.getAttribute("colspan")).toBe("2");
    expect(cells[1]?.textContent?.replace(/\u00A0/g, "")).toBe("R1");
    expect(cells[2]?.getAttribute("colspan")).toBe("2");
    expect(cells[3]?.textContent?.replace(/\u00A0/g, "")).toBe("R2");

    instance.dispose();
  });

  it("applies bold to the full visual table-cell range including the last cell", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const boldButton = root.querySelector(
      '[data-testid="editor-2-toolbar-bold"]',
    ) as HTMLButtonElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>asd</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>asd</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>asd</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelectorAll('[data-testid="editor-2-table-cell"]').length === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const paragraphs = root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"] [data-paragraph-id]');
    expect(paragraphs.length).toBe(3);

    paragraphs[2]!.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        shiftKey: true,
        clientX: 5,
        clientY: 5,
      }),
    );
    await Promise.resolve();

    boldButton.click();
    await Promise.resolve();

    const runs = root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"] [data-testid="editor-2-run"]');
    expect(runs.length).toBe(3);
    expect(Array.from(runs).map((run) => run.style.fontWeight)).toEqual(["700", "700", "700"]);

    instance.dispose();
  });

  it("exports the current document through a download link", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const exportButton = root.querySelector(
      '[data-testid="editor-2-toolbar-export-docx"]',
    ) as HTMLButtonElement;

    input.value = "export me";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "export me", inputType: "insertText" }));
    await Promise.resolve();

    const createObjectURL = vi.fn(() => "blob:test-export");
    const revokeObjectURL = vi.fn();
    const anchorClick = vi.fn();
    const previousCreateObjectURL = URL.createObjectURL;
    const previousRevokeObjectURL = URL.revokeObjectURL;
    const previousClick = HTMLAnchorElement.prototype.click;

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    Object.defineProperty(HTMLAnchorElement.prototype, "click", {
      configurable: true,
      value: anchorClick,
    });

    try {
      exportButton.click();
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (createObjectURL.mock.calls.length > 0) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = (createObjectURL.mock.calls as unknown[][]).at(0)?.[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-export");
    } finally {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: previousCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: previousRevokeObjectURL,
      });
      Object.defineProperty(HTMLAnchorElement.prototype, "click", {
        configurable: true,
        value: previousClick,
      });
    }

    instance.dispose();
  });

  it("renders the Insert Table toolbar button", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);

    const insertTableButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table"]',
    ) as HTMLButtonElement;
    expect(insertTableButton).not.toBeNull();

    instance.dispose();
  });

  it("inserts a 3x3 table into the document on Insert Table click", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const insertTableButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table"]',
    ) as HTMLButtonElement;

    insertTableButton.click();
    await Promise.resolve();

    const tableGrid = root.querySelector('[data-testid="editor-2-table-grid"]');
    expect(tableGrid).not.toBeNull();

    const rows = root.querySelectorAll('[data-testid="editor-2-table-row"]');
    expect(rows.length).toBe(3);

    const cells = root.querySelectorAll('[data-testid="editor-2-table-cell"]');
    expect(cells.length).toBe(9);

    instance.dispose();
  });

  it("moves the caret into the first cell after Insert Table", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const insertTableButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table"]',
    ) as HTMLButtonElement;

    input.value = "before";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "before", inputType: "insertText" }));
    await Promise.resolve();

    insertTableButton.click();
    await Promise.resolve();

    // After inserting, the first cell should be in the DOM and text typed goes there
    input.value = "cell";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "cell", inputType: "insertText" }));
    await Promise.resolve();

    const firstCell = root.querySelector('[data-testid="editor-2-table-cell"]') as HTMLElement;
    expect(firstCell?.textContent?.replace(/\u00A0/g, "")).toBe("cell");

    instance.dispose();
  });

  it("renders cell data-row-index and data-cell-index attributes for selection", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const insertTableButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table"]',
    ) as HTMLButtonElement;

    insertTableButton.click();
    await Promise.resolve();

    const cells = root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]');
    expect(cells.length).toBe(9);

    // First row cells
    expect(cells[0]?.dataset.rowIndex).toBe("0");
    expect(cells[0]?.dataset.cellIndex).toBe("0");
    expect(cells[1]?.dataset.rowIndex).toBe("0");
    expect(cells[1]?.dataset.cellIndex).toBe("1");
    expect(cells[2]?.dataset.rowIndex).toBe("0");
    expect(cells[2]?.dataset.cellIndex).toBe("2");

    // Second row first cell
    expect(cells[3]?.dataset.rowIndex).toBe("1");
    expect(cells[3]?.dataset.cellIndex).toBe("0");

    instance.dispose();
  });
});
