import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOasisEditor2 } from "../../app/bootstrap/createOasisEditor2App.js";
import { createOasisEditor2Container } from "../../app/bootstrap/createOasisEditor2Container.js";
import { importDocxToEditor2Document } from "../../import/docx/importDocxToEditor2Document.js";
import { buildDocx, createTinyPngFile, setupOasisEditor2Dom } from "./oasisEditor2TestHarness.js";

describe("OasisEditor2", () => {
  beforeEach(() => {
    setupOasisEditor2Dom();
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
    expect(root.querySelector('[data-testid="editor-2-toolbar-merge-table"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-split-table"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-undo"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-redo"]')).not.toBeNull();
    expect(root.textContent).toContain("Advanced table actions");
    expect(root.querySelector('[data-testid="editor-2-toolbar-insert-table-column-before"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-insert-table-column-after"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-delete-table-column"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-insert-table-row-before"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-insert-table-row-after"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-delete-table-row"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-merge-table-cells"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-split-table-cell"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-merge-table-rows"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-split-table-row"]')).not.toBeNull();
    expect(root.textContent).toContain("Merge Selection");
    expect(root.textContent).toContain("Split Selection");
    expect(root.textContent).toContain("Merge Horizontally");
    expect(root.textContent).toContain("Merge Vertically");
    expect(root.textContent).toContain("Insert Row Before");
    expect(root.textContent).toContain("Insert Row After");
    expect(root.textContent).toContain("Delete Row");
    expect(root.textContent).toContain("Insert Column Before");
    expect(root.textContent).toContain("Insert Column After");
    expect(root.textContent).toContain("Delete Column");
    expect(root.querySelector('[data-testid="editor-2-toolbar-export-docx"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-toolbar-import-docx"]')).not.toBeNull();
    expect(root.querySelectorAll('[data-testid="editor-2-block"]').length).toBe(1);
    expect(root.textContent).toContain("Minimal editor");
    expect(root.textContent).toContain("oasis-editor-2");

    instance.dispose();
    expect(root.textContent).toBe("");
  });

  it("renders the public container without demo chrome and emits state changes", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const onStateChange = vi.fn();
    const instance = createOasisEditor2Container(root, {
      viewportHeight: 480,
      class: "test-public-container",
      onStateChange,
    });
    const editor = root.querySelector('[data-testid="editor-2-editor"]') as HTMLDivElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    expect(editor).not.toBeNull();
    expect(editor.classList.contains("test-public-container")).toBe(true);
    expect(editor.style.height).toBe("480px");
    expect(root.querySelector(".oasis-editor-2-header")).toBeNull();
    expect(root.querySelector(".oasis-editor-2-toolbar")).toBeNull();

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("ab");
    expect(onStateChange).toHaveBeenCalled();

    instance.dispose();
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

  it("supports undo and redo from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const undoButton = root.querySelector('[data-testid="editor-2-toolbar-undo"]') as HTMLButtonElement;
    const redoButton = root.querySelector('[data-testid="editor-2-toolbar-redo"]') as HTMLButtonElement;

    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(true);

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    expect(undoButton.disabled).toBe(false);
    expect(redoButton.disabled).toBe(true);

    undoButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toBe("\u00A0");
    expect(redoButton.disabled).toBe(false);

    redoButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("ab");

    instance.dispose();
  });

  it("moves to the start and end of the current paragraph with home and end", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "hello", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
    await Promise.resolve();
    input.value = "!";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "!", inputType: "insertText" }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("hello!");

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    await Promise.resolve();
    input.value = "^";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "^", inputType: "insertText" }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("^hello!");

    instance.dispose();
  });

  it("moves to the start and end of the document with ctrl plus home and end", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "first";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "first", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();
    input.value = "second";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "second", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home", ctrlKey: true }));
    await Promise.resolve();
    input.value = ">";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: ">", inputType: "insertText" }));
    await Promise.resolve();

    const paragraphsAfterStart = Array.from(root.querySelectorAll("[data-paragraph-id]"));
    expect(paragraphsAfterStart[0]?.textContent).toContain(">first");
    expect(paragraphsAfterStart[1]?.textContent).toContain("second");

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End", ctrlKey: true }));
    await Promise.resolve();
    input.value = "<";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "<", inputType: "insertText" }));
    await Promise.resolve();

    const paragraphsAfterEnd = Array.from(root.querySelectorAll("[data-paragraph-id]"));
    expect(paragraphsAfterEnd[0]?.textContent).toContain(">first");
    expect(paragraphsAfterEnd[1]?.textContent).toContain("second<");

    instance.dispose();
  });

  it("moves by word with ctrl plus arrow left and right", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello brave world";
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, data: "hello brave world", inputType: "insertText" }),
    );
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", ctrlKey: true }));
    await Promise.resolve();
    input.value = "^";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "^", inputType: "insertText" }));
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain(
      "hello brave ^world",
    );

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight", ctrlKey: true }));
    await Promise.resolve();
    input.value = "*";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "*", inputType: "insertText" }));
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain(
      "hello *brave ^world",
    );

    instance.dispose();
  });

  it("extends selection by word with ctrl plus shift plus arrow left", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "hello brave world";
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, data: "hello brave world", inputType: "insertText" }),
    );
    await Promise.resolve();

    input.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", ctrlKey: true, shiftKey: true }),
    );
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const selectedChars = Array.from(root.querySelectorAll(".oasis-editor-2-char-selected")).map(
      (node) => node.textContent,
    );
    expect(selectedChars.join("")).toBe("world");

    instance.dispose();
  });

  it("moves a selected inline image to the next paragraph with alt plus arrow down", async () => {
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
      "move.png",
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
      input.value = "a";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "a", inputType: "insertText" }));
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
      expect(image).not.toBeNull();

      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      await Promise.resolve();

      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", altKey: true }),
      );
      await Promise.resolve();

      input.value = "b";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "b", inputType: "insertText" }));
      await Promise.resolve();

      const paragraphs = Array.from(root.querySelectorAll("[data-paragraph-id]")) as HTMLElement[];
      expect(paragraphs[0]?.textContent).toBe("a");
      expect(paragraphs[1]?.textContent).toBe("b");
      expect(paragraphs[1]?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("moves a selected inline image to the previous paragraph with alt plus arrow up", async () => {
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
      "move-up.png",
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
      input.value = "a";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "a", inputType: "insertText" }));
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
      expect(image).not.toBeNull();

      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      await Promise.resolve();

      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp", altKey: true }),
      );
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const imageAfterMove = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
        const firstParagraph = root.querySelectorAll<HTMLElement>("[data-paragraph-id]")[0] ?? null;
        if (imageAfterMove && imageAfterMove.closest("[data-paragraph-id]") === firstParagraph) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const paragraphs = Array.from(root.querySelectorAll("[data-paragraph-id]")) as HTMLElement[];
      const imageAfterMove = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
      expect(imageAfterMove?.closest("[data-paragraph-id]")).toBe(paragraphs[0] ?? null);
      expect(paragraphs[1]?.textContent).toBe("a");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("moves a selected inline image inside a table cell to the next table cell with alt plus arrow down", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
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
      "table-move.png",
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
      insertTableButton.click();
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

      const cellsBefore = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
      const firstCellBefore = cellsBefore[0] ?? null;
      const secondCellBefore = cellsBefore[1] ?? null;
      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      expect(image).not.toBeNull();
      expect(image.closest('[data-testid="editor-2-table-cell"]')).toBe(firstCellBefore);

      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      await Promise.resolve();

      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", altKey: true }),
      );
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const movedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
        if (movedImage && movedImage.closest('[data-testid="editor-2-table-cell"]') === secondCellBefore) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const cellsAfter = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
      expect(cellsAfter[0]?.querySelector('[data-testid="editor-2-image"]')).toBeNull();
      expect(cellsAfter[1]?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

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
    let clipboardHtml = "";
    const cutEvent = new Event("cut", { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(cutEvent, "clipboardData", {
      configurable: true,
      value: {
        setData: (_type: string, value: string) => {
          if (_type === "text/plain") {
            clipboardText = value;
          }
          if (_type === "text/html") {
            clipboardHtml = value;
          }
        },
      },
    });
    input.dispatchEvent(cutEvent);
    await Promise.resolve();

    expect(clipboardText).toBe("o");
    expect(clipboardHtml).toContain("<p>");
    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("hell");

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      configurable: true,
      value: {
        getData: (type: string) => (type === "text/html" ? clipboardHtml : clipboardText),
      },
    });
    input.dispatchEvent(pasteEvent);
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-block"]')?.textContent).toContain("hello");

    instance.dispose();
  });

  it("pastes rich html content with inline styles and links", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      configurable: true,
      value: {
        getData: (type: string) =>
          type === "text/html"
            ? `<p style="text-align:center"><strong>He</strong><img src="data:image/png;base64,abc" width="12" height="8"><a href="https://example.com">llo</a></p><p><em>world</em></p>`
            : "",
      },
    });

    input.dispatchEvent(pasteEvent);
    await Promise.resolve();

    const paragraphs = root.querySelectorAll('[data-testid="editor-2-block"]');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent).toContain("Hello");
    expect((paragraphs[0] as HTMLParagraphElement).style.textAlign).toBe("center");
    expect(root.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-link"]')).not.toBeNull();
    expect(paragraphs[1]?.textContent).toContain("world");

    instance.dispose();
  });

  it("pastes image files from the clipboard and keeps undo and redo coherent", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const undoButton = root.querySelector('[data-testid="editor-2-toolbar-undo"]') as HTMLButtonElement;
    const redoButton = root.querySelector('[data-testid="editor-2-toolbar-redo"]') as HTMLButtonElement;
    const file = createTinyPngFile("clipboard-image.png");

    const OriginalImage = globalThis.Image;
    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 80;
      naturalHeight = 40;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: MockImage,
    });

    try {
      const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, "clipboardData", {
        configurable: true,
        value: {
          items: [
            {
              kind: "file",
              getAsFile: () => file,
            },
          ],
          files: [file],
          getData: () => "",
        },
      });

      input.dispatchEvent(pasteEvent);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement;
      expect(image).not.toBeNull();
      expect(image.width).toBe(80);
      expect(image.height).toBe(40);
      expect(undoButton.disabled).toBe(false);

      undoButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      expect(root.querySelector('[data-testid="editor-2-image"]')).toBeNull();
      expect(redoButton.disabled).toBe(false);

      redoButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      expect(root.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

});
