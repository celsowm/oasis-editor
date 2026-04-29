import { beforeEach, describe, expect, it } from "vitest";
import { createOasisEditor2 } from "../../app/bootstrap/createOasisEditor2App.js";

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
});
