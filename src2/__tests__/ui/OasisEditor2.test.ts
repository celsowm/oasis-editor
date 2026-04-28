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

    expect(root.querySelector('[data-testid="editor-2-editor"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-surface"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="editor-2-input"]')).not.toBeNull();
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

    const selectedChars = root.querySelectorAll(".oasis-editor-2-char-selected");
    expect(selectedChars.length).toBe(1);
    expect(selectedChars[0]?.textContent).toBe("b");

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
});
