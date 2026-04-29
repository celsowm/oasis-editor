import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { createOasisEditor2 } from "../../app/bootstrap/createOasisEditor2App.js";

async function buildDocx(documentXml: string): Promise<File> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], "import.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

describe("OasisEditor2", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="oasis-editor-2-root"></div>
      <div id="oasis-editor-2-loading"></div>
    `;
  });

  it("renders the isolated editor shell and input overlay", () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    expect(root.querySelector('[data-testid="editor-2-editor"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-surface"]')).not.toBeNull();
    expect(input).not.toBeNull();
    expect(input.style.pointerEvents).toBe("none");
    expect(root.querySelector('[data-testid="editor-2-toolbar-bold"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-font-family"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-align-center"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-list-bullet"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-page-break-before"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-merge-table-cells"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-split-table-cell"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-export-docx"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-import-docx"]')).not.toBeNull();
    expect(root.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(1);
    expect(root.textContent).toContain("Minimal editor");
    expect(root.textContent).toContain("oasis-editor-2");

    instance.dispose();
    expect(root.textContent).toBe("");
  });

  it("repositions the caret from a click and inserts at the clicked offset", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    const chars = root.querySelectorAll('[data-testid="editor-2-char"]') as NodeListOf<HTMLSpanElement>;
    const rects = [
      { left: 0, right: 10, top: 0, bottom: 20, width: 10, height: 20, x: 0, y: 0 },
      { left: 10, right: 20, top: 0, bottom: 20, width: 10, height: 20, x: 10, y: 0 },
    ];

    chars.forEach((char, index) => {
      Object.defineProperty(char, "getBoundingClientRect", {
        configurable: true,
        value: () => rects[index],
      });
    });

    const firstChar = chars[0];
    firstChar.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 9, clientY: 5 }));
    await Promise.resolve();

    input.value = "X";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "X", inputType: "insertText" }));
    await Promise.resolve();

    const block = root.querySelector('[data-testid="editor-2-block"]') as HTMLParagraphElement;
    expect(block.textContent).toContain("aXb");

    instance.dispose();
  });

  it("expands selection with shift plus arrow left", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const selectedChars = root.querySelectorAll(".oasis-editor-2-char-selected");
    expect(selectedChars.length).toBe(1);
    expect(selectedChars[0]?.textContent).toBe("b");
    expect(root.querySelectorAll('[data-testid="editor-2-selection-box"]').length).toBeGreaterThan(0);

    instance.dispose();
  });

  it("supports undo and redo from the keyboard", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toBe("\u00A0");

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "y", ctrlKey: true }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("ab");

    instance.dispose();
  });

  it("groups continuous typing into a single undo step", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "a";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "a", inputType: "insertText" }));
    await Promise.resolve();

    input.value = "b";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "b", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toBe("\u00A0");

    instance.dispose();
  });

  it("commits IME composition once and ignores the duplicate input event", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    await Promise.resolve();

    input.value = "á";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "á", inputType: "insertCompositionText" }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toBe("\u00A0");

    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "á" }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("á");

    input.value = "á";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "á", inputType: "insertText" }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("á");
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).not.toContain("áá");

    instance.dispose();
  });

  it("highlights an empty block when a multi-block selection spans through it", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "a";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "a", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();

    input.value = "b";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "b", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp", shiftKey: true }));
    await Promise.resolve();

    const selectedEmpty = root.querySelector(".oasis-editor-2-empty-char-selected");
    expect(selectedEmpty).not.toBeNull();

    instance.dispose();
  });

  it("selects a word on double click", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello world";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "hello world", inputType: "insertText" }));
    await Promise.resolve();

    const chars = root.querySelectorAll('[data-testid="editor-2-char"]') as NodeListOf<HTMLSpanElement>;
    chars.forEach((char, index) => {
      Object.defineProperty(char, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          left: index * 10,
          right: index * 10 + 10,
          top: 0,
          bottom: 20,
          width: 10,
          height: 20,
          x: index * 10,
          y: 0,
        }),
      });
    });

    chars[7].dispatchEvent(new MouseEvent("mousedown", { bubbles: true, detail: 2, clientX: 75, clientY: 5 }));
    await Promise.resolve();

    const selectedChars = Array.from(root.querySelectorAll(".oasis-editor-2-char-selected")).map(
      (node) => node.textContent,
    );
    expect(selectedChars.join("")).toBe("world");

    instance.dispose();
  });

  it("selects the full block on triple click", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "hello", inputType: "insertText" }));
    await Promise.resolve();

    const chars = root.querySelectorAll('[data-testid="editor-2-char"]') as NodeListOf<HTMLSpanElement>;
    chars.forEach((char, index) => {
      Object.defineProperty(char, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          left: index * 10,
          right: index * 10 + 10,
          top: 0,
          bottom: 20,
          width: 10,
          height: 20,
          x: index * 10,
          y: 0,
        }),
      });
    });

    chars[2].dispatchEvent(new MouseEvent("mousedown", { bubbles: true, detail: 3, clientX: 25, clientY: 5 }));
    await Promise.resolve();

    const selectedChars = Array.from(root.querySelectorAll(".oasis-editor-2-char-selected")).map(
      (node) => node.textContent,
    );
    expect(selectedChars.join("")).toBe("hello");

    instance.dispose();
  });

  it("selects all content with ctrl+a", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "abc";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "abc", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();
    input.value = "def";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "def", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a", ctrlKey: true }));
    await Promise.resolve();

    const selectedChars = Array.from(root.querySelectorAll(".oasis-editor-2-char-selected")).map(
      (node) => node.textContent,
    );
    expect(selectedChars.join("")).toBe("abcdef");

    instance.dispose();
  });

  it("deletes the current selection with delete", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "hello", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Delete" }));
    await Promise.resolve();

    const block = root.querySelector('[data-testid="editor-2-block"]') as HTMLParagraphElement;
    expect(block.textContent).toContain("hell");

    instance.dispose();
  });

  it("cuts and pastes selected text", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "hello", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

    let clipboardText = "";
    const cutEvent = new Event("cut", { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(cutEvent, "clipboardData", {
      configurable: true,
      value: {
        setData: (_type: string, value: string) => {
          clipboardText = value;
        },
      },
    });
    input.dispatchEvent(cutEvent);
    await Promise.resolve();

    expect(clipboardText).toBe("o");
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("hell");

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      configurable: true,
      value: {
        getData: () => clipboardText,
      },
    });
    input.dispatchEvent(pasteEvent);
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("hello");

    instance.dispose();
  });

  it("extends the current selection with shift plus click", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "hello", inputType: "insertText" }));
    await Promise.resolve();

    const applyRects = () => {
      const chars = root.querySelectorAll('[data-testid="editor-2-char"]') as NodeListOf<HTMLSpanElement>;
      chars.forEach((char, index) => {
        Object.defineProperty(char, "getBoundingClientRect", {
          configurable: true,
          value: () => ({
            left: index * 10,
            right: index * 10 + 10,
            top: 0,
            bottom: 20,
            width: 10,
            height: 20,
            x: index * 10,
            y: 0,
          }),
        });
      });
      return chars;
    };

    applyRects();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }));
    await Promise.resolve();

    const chars = applyRects();
    chars.forEach((char, index) => {
      Object.defineProperty(char, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          left: index * 10,
          right: index * 10 + 10,
          top: 0,
          bottom: 20,
          width: 10,
          height: 20,
          x: index * 10,
          y: 0,
        }),
      });
    });

    chars[1].dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        shiftKey: true,
        clientX: 15,
        clientY: 5,
      }),
    );
    await Promise.resolve();

    const selectedChars = Array.from(root.querySelectorAll(".oasis-editor-2-char-selected")).map(
      (node) => node.textContent,
    );
    expect(selectedChars.join("")).toBe("el");

    instance.dispose();
  });

  it("toggles bold on the selected range with ctrl+b", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "b", ctrlKey: true }));
    await Promise.resolve();

    const runNodes = root.querySelectorAll('[data-testid="editor-2-run"]');
    expect(runNodes.length).toBeGreaterThan(1);
    expect((runNodes[runNodes.length - 1] as HTMLSpanElement).style.fontWeight).toBe("700");

    instance.dispose();
  });

  it("toggles bold from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const boldButton = root.querySelector('[data-testid="editor-2-toolbar-bold"]') as HTMLButtonElement;

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

    boldButton.click();
    await Promise.resolve();

    const runNodes = root.querySelectorAll('[data-testid="editor-2-run"]');
    expect((runNodes[runNodes.length - 1] as HTMLSpanElement).style.fontWeight).toBe("700");
    expect(boldButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    instance.dispose();
  });

  it("applies non-boolean text styles from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const fontFamilySelect = root.querySelector(
      '[data-testid="editor-2-toolbar-font-family"]',
    ) as HTMLSelectElement;
    const fontSizeSelect = root.querySelector(
      '[data-testid="editor-2-toolbar-font-size"]',
    ) as HTMLSelectElement;
    const colorInput = root.querySelector('[data-testid="editor-2-toolbar-color"]') as HTMLInputElement;
    const highlightInput = root.querySelector(
      '[data-testid="editor-2-toolbar-highlight"]',
    ) as HTMLInputElement;

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

    fontFamilySelect.value = "Georgia";
    fontFamilySelect.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    fontSizeSelect.value = "24";
    fontSizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    colorInput.value = "#ff0000";
    colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    highlightInput.value = "#ffff00";
    highlightInput.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    const runNodes = root.querySelectorAll('[data-testid="editor-2-run"]');
    const selectedRun = runNodes[runNodes.length - 1] as HTMLSpanElement;
    expect(selectedRun.style.fontFamily).toContain("Georgia");
    expect(selectedRun.style.fontSize).toBe("24px");
    expect(selectedRun.style.color).toBe("rgb(255, 0, 0)");
    expect(selectedRun.style.backgroundColor).toBe("rgb(255, 255, 0)");

    instance.dispose();
  });

  it("applies paragraph alignment and spacing from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const alignCenterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-align-center"]',
    ) as HTMLButtonElement;
    const spacingAfterInput = root.querySelector(
      '[data-testid="editor-2-toolbar-spacing-after"]',
    ) as HTMLInputElement;
    const indentLeftInput = root.querySelector(
      '[data-testid="editor-2-toolbar-indent-left"]',
    ) as HTMLInputElement;

    input.value = "para";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "para", inputType: "insertText" }));
    await Promise.resolve();

    alignCenterButton.click();
    await Promise.resolve();

    spacingAfterInput.value = "24";
    spacingAfterInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    indentLeftInput.value = "32";
    indentLeftInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    const paragraph = root.querySelector('[data-testid="editor-2-block"]') as HTMLParagraphElement;
    expect(paragraph.style.textAlign).toBe("center");
    expect(paragraph.style.paddingBottom).toBe("24px");
    expect(paragraph.style.paddingLeft).toBe("32px");
    expect(alignCenterButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    instance.dispose();
  });

  it("toggles bullet and ordered lists from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const bulletButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-bullet"]',
    ) as HTMLButtonElement;
    const orderedButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-ordered"]',
    ) as HTMLButtonElement;

    input.value = "item";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "item", inputType: "insertText" }));
    await Promise.resolve();

    bulletButton.click();
    await Promise.resolve();

    let marker = root.querySelector('[data-testid="editor-2-list-marker"]') as HTMLSpanElement;
    expect(marker.textContent).toBe("•");
    expect(bulletButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    orderedButton.click();
    await Promise.resolve();

    marker = root.querySelector('[data-testid="editor-2-list-marker"]') as HTMLSpanElement;
    expect(marker.textContent).toBe("1.");
    expect(orderedButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    instance.dispose();
  });

  it("positions the caret after the list marker for an empty list paragraph", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const bulletButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-bullet"]',
    ) as HTMLButtonElement;
    const marker = root.querySelector('[data-testid="editor-2-list-marker"]') as HTMLElement | null;

    expect(marker).toBeNull();

    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const previousGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: function () {
        const testId = this.getAttribute("data-testid");
        if (testId === "editor-2-editor") {
          return {
            left: 0,
            top: 0,
            right: 860,
            bottom: 600,
            width: 860,
            height: 600,
            x: 0,
            y: 0,
          };
        }
        if (testId === "editor-2-block") {
          return {
            left: 100,
            top: 80,
            right: 320,
            bottom: 112,
            width: 220,
            height: 32,
            x: 100,
            y: 80,
          };
        }
        if (testId === "editor-2-list-marker") {
          return {
            left: 100,
            top: 80,
            right: 126,
            bottom: 112,
            width: 26,
            height: 32,
            x: 100,
            y: 80,
          };
        }
        if (testId === "editor-2-empty-char") {
          return {
            left: 140,
            top: 80,
            right: 152,
            bottom: 112,
            width: 12,
            height: 32,
            x: 140,
            y: 80,
          };
        }
        return previousGetBoundingClientRect.call(this);
      },
    });

    try {
      bulletButton.click();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(input.style.left).toBe("140px");
    } finally {
      Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
        configurable: true,
        value: previousGetBoundingClientRect,
      });
    }

    instance.dispose();
  });

  it("toggles page break before and keep with next from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const pageBreakButton = root.querySelector(
      '[data-testid="editor-2-toolbar-page-break-before"]',
    ) as HTMLButtonElement;
    const keepWithNextButton = root.querySelector(
      '[data-testid="editor-2-toolbar-keep-with-next"]',
    ) as HTMLButtonElement;

    input.value = "alpha";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "alpha", inputType: "insertText" }));
    await Promise.resolve();

    pageBreakButton.click();
    keepWithNextButton.click();
    await Promise.resolve();

    expect(pageBreakButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);
    expect(keepWithNextButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    instance.dispose();
  });

  it("imports a docx file into the editor state through the hidden file input", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r><w:t>Hello import</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>`);

    Object.defineProperty(importInput, "files", {
      configurable: true,
      value: [file],
    });

    importInput.dispatchEvent(new Event("change", { bubbles: true }));
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (root.querySelector('[data-testid="editor-2-block"]')?.textContent?.includes("Hello import")) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("Hello import");

    instance.dispose();
  });

  it("inserts an inline image through the hidden image input", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "inline.png",
      { type: "image/png" },
    );

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

    try {
      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });

      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const image = root.querySelector(".oasis-editor-2-image") as HTMLImageElement | null;
        if (image?.getAttribute("width") === "64") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector(".oasis-editor-2-image") as HTMLImageElement | null;
      expect(image).not.toBeNull();
      expect(image?.getAttribute("src")).toContain("data:image/png;base64,");
      expect(image?.getAttribute("width")).toBe("64");
      expect(image?.getAttribute("height")).toBe("32");
      expect(imageInput.value).toBe("");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("fits a large inserted image to the page width", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const surface = root.querySelector('[data-testid="editor-2-surface"]') as HTMLDivElement;
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "large-inline.png",
      { type: "image/png" },
    );

    Object.defineProperty(surface, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 860,
        bottom: 600,
        width: 860,
        height: 600,
        x: 0,
        y: 0,
      }),
    });

    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const style = originalGetComputedStyle(element);
      if (element === surface) {
        return {
          ...style,
          paddingLeft: "88px",
          paddingRight: "88px",
        } as CSSStyleDeclaration;
      }
      return style;
    });

    const OriginalImage = globalThis.Image;
    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 1913;
      naturalHeight = 717;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: MockImage,
    });

    try {
      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });

      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const image = root.querySelector(".oasis-editor-2-image") as HTMLImageElement | null;
        if (image?.getAttribute("width") === "684") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector(".oasis-editor-2-image") as HTMLImageElement | null;
      expect(image).not.toBeNull();
      expect(image?.getAttribute("width")).toBe("684");
      expect(image?.getAttribute("height")).toBe("256");
    } finally {
      vi.restoreAllMocks();
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("fits a large inserted image to the containing table cell and keeps it clamped while resizing", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const surface = root.querySelector('[data-testid="editor-2-surface"]') as HTMLDivElement;
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const insertTableButton = root.querySelector(
      '[data-testid="editor-2-toolbar-insert-table"]',
    ) as HTMLButtonElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "table-cell-inline.png",
      { type: "image/png" },
    );

    Object.defineProperty(surface, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 860,
        bottom: 600,
        width: 860,
        height: 600,
        x: 0,
        y: 0,
      }),
    });

    insertTableButton.click();
    await Promise.resolve();

    const originalCellGetBoundingClientRect = HTMLTableCellElement.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLTableCellElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 300,
        bottom: 120,
        width: 300,
        height: 120,
        x: 0,
        y: 0,
      }),
    });

    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const style = originalGetComputedStyle(element);
      if (element === surface) {
        return {
          ...style,
          paddingLeft: "88px",
          paddingRight: "88px",
        } as CSSStyleDeclaration;
      }
      if (element instanceof HTMLTableCellElement) {
        return {
          ...style,
          paddingLeft: "14px",
          paddingRight: "14px",
        } as CSSStyleDeclaration;
      }
      return style;
    });

    const OriginalImage = globalThis.Image;
    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 1913;
      naturalHeight = 717;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: MockImage,
    });

    try {
      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });

      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const image = root.querySelector(".oasis-editor-2-image") as HTMLImageElement | null;
        if (image?.getAttribute("width") === "272") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector(".oasis-editor-2-image") as HTMLImageElement | null;
      expect(image).not.toBeNull();
      expect(image?.getAttribute("width")).toBe("272");
      expect(image?.getAttribute("height")).toBe("102");

      image?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const selectedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
        if (selectedImage?.classList.contains("oasis-editor-2-image-selected")) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image-resize-handle"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const handle = root.querySelector('[data-testid="editor-2-image-resize-handle"]') as HTMLButtonElement;
      expect(handle).not.toBeNull();

      handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 280, clientY: 110 }));
      window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 980, clientY: 110 }));
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 980, clientY: 110 }));
      await Promise.resolve();

      const resizedImage = root.querySelector(".oasis-editor-2-image") as HTMLImageElement | null;
      expect(resizedImage).not.toBeNull();
      expect(resizedImage?.getAttribute("width")).toBe("272");
      expect(resizedImage?.getAttribute("height")).toBe("102");
    } finally {
      vi.restoreAllMocks();
      Object.defineProperty(HTMLTableCellElement.prototype, "getBoundingClientRect", {
        configurable: true,
        value: originalCellGetBoundingClientRect,
      });
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("selects an inline image as a single object and deletes it", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "inline.png",
      { type: "image/png" },
    );

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

    try {
      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });

      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      expect(image).not.toBeNull();

      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      await Promise.resolve();
      const selectedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;

      expect(selectedImage.classList.contains("oasis-editor-2-image-selected")).toBe(true);
      expect(root.querySelector('[data-testid="editor-2-selection-box"]')).not.toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Delete" }));
      await Promise.resolve();

      expect(root.querySelector('[data-testid="editor-2-image"]')).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("moves the caret before a selected inline image with arrow left", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "inline.png",
      { type: "image/png" },
    );

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

    try {
      input.value = "ab";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
      await Promise.resolve();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }));
      await Promise.resolve();

      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      await Promise.resolve();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }));
      await Promise.resolve();

      input.value = "x";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "x", inputType: "insertText" }));
      await Promise.resolve();

      expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("ax\uFFFCb");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("moves the caret after a selected inline image with arrow right", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "inline.png",
      { type: "image/png" },
    );

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

    try {
      input.value = "ab";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
      await Promise.resolve();

      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      await Promise.resolve();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
      await Promise.resolve();

      input.value = "x";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "x", inputType: "insertText" }));
      await Promise.resolve();

      expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("ab\uFFFCx");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("resizes a selected inline image through the resize handle", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "inline.png",
      { type: "image/png" },
    );

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

    try {
      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });

      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      expect(image).not.toBeNull();

      Object.defineProperty(image, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          left: 120,
          top: 80,
          right: 184,
          bottom: 112,
          width: 64,
          height: 32,
          x: 120,
          y: 80,
        }),
      });

      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 125, clientY: 85 }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const selectedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
        if (selectedImage?.classList.contains("oasis-editor-2-image-selected")) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image-resize-handle"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const handle = root.querySelector('[data-testid="editor-2-image-resize-handle"]') as HTMLButtonElement;
      expect(handle).not.toBeNull();

      handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 184, clientY: 112 }));
      window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 216, clientY: 112 }));
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 216, clientY: 112 }));
      await Promise.resolve();

      const resizedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      expect(resizedImage.getAttribute("width")).toBe("96");
      expect(resizedImage.getAttribute("height")).toBe("48");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("clamps resized inline images to the page width", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        Uint8Array.from([
          137, 80, 78, 71, 13, 10, 26, 10,
          0, 0, 0, 13, 73, 72, 68, 82,
          0, 0, 0, 1, 0, 0, 0, 1,
          8, 6, 0, 0, 0, 31, 21, 196, 137,
          0, 0, 0, 13, 73, 68, 65, 84,
          120, 218, 99, 252, 255, 159, 161, 30,
          0, 7, 130, 2, 127, 63, 201, 164, 116,
          0, 0, 0, 0, 73, 69, 78, 68,
          174, 66, 96, 130,
        ]),
      ],
      "clamped.png",
      { type: "image/png" },
    );

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

    try {
      Object.defineProperty(imageInput, "files", {
        configurable: true,
        value: [file],
      });

      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      expect(image).not.toBeNull();

      Object.defineProperty(image, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          left: 120,
          top: 80,
          right: 184,
          bottom: 112,
          width: 64,
          height: 32,
          x: 120,
          y: 80,
        }),
      });

      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 125, clientY: 85 }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image-resize-handle"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const handle = root.querySelector('[data-testid="editor-2-image-resize-handle"]') as HTMLButtonElement;
      expect(handle).not.toBeNull();

      handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 184, clientY: 112 }));
      window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 2000, clientY: 112 }));
      window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 2000, clientY: 112 }));
      await Promise.resolve();

      const resizedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      expect(resizedImage.getAttribute("width")).toBe("684");
      expect(resizedImage.getAttribute("height")).toBe("342");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
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
