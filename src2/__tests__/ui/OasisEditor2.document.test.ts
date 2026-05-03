import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOasisEditor2 } from "../../app/bootstrap/createOasisEditor2App.js";
import { importDocxToEditor2Document } from "../../import/docx/importDocxToEditor2Document.js";
import { buildDocx, createTinyPngFile, setupOasisEditor2Dom } from "./oasisEditor2TestHarness.js";

describe("OasisEditor2", () => {
  beforeEach(() => {
    setupOasisEditor2Dom();
  });

  it("pastes an inline image from the clipboard", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = createTinyPngFile("paste.png");

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
      const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, "clipboardData", {
        configurable: true,
        value: {
          items: [
            {
              kind: "file",
              type: "image/png",
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

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
      expect(image).not.toBeNull();
      expect(image?.getAttribute("src")).toContain("data:image/png;base64,");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("pastes inline image alt text from rich clipboard html", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

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
      const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, "clipboardData", {
        configurable: true,
        value: {
          items: [],
          files: [],
          getData: (type: string) =>
            type === "text/html"
              ? '<p>Before <img src="data:image/png;base64,abc" alt="Chart alt" width="20" height="10"></p>'
              : "",
        },
      });

      input.dispatchEvent(pasteEvent);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
        if (image?.getAttribute("alt") === "Chart alt") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
      expect(image).not.toBeNull();
      expect(image?.getAttribute("alt")).toBe("Chart alt");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
      instance.dispose();
    }
  });

  it("pastes plain text when ctrl plus shift plus v is used", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    try {
      const shortcutEvent = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "v",
        ctrlKey: true,
        shiftKey: true,
      });
      input.dispatchEvent(shortcutEvent);

      const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, "clipboardData", {
        configurable: true,
        value: {
          items: [],
          files: [],
          getData: (type: string) =>
            type === "text/plain"
              ? "Plain text"
              : type === "text/html"
                ? "<p><strong>Rich</strong> <a href=\"https://example.com\">link</a></p>"
                : "",
        },
      });

      input.dispatchEvent(pasteEvent);

      const runs = Array.from(root.querySelectorAll('[data-testid="editor-2-run"]')) as HTMLElement[];
      const text = runs.map((run) => run.textContent ?? "").join("");
      expect(text).toContain("Plain text");
      expect(runs.some((run) => run.innerHTML.includes("<strong>"))).toBe(false);
      expect(runs.some((run) => run.innerHTML.includes("<a "))).toBe(false);
    } finally {
      instance.dispose();
    }
  });

  it("inserts a soft line break with shift plus enter", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    try {
      input.value = "Line 1";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", shiftKey: true }));
      input.value = "Line 2";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const run = root.querySelector('[data-testid="editor-2-run"]') as HTMLElement | null;
      expect(run?.textContent).toContain("Line 1");
      expect(run?.textContent).toContain("Line 2");
    } finally {
      instance.dispose();
    }
  });

  it("deletes the previous word with ctrl plus backspace", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    try {
      input.value = "Hello brave world";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Backspace", ctrlKey: true }));

      const run = root.querySelector('[data-testid="editor-2-run"]') as HTMLElement | null;
      expect(run?.textContent).toContain("Hello brave ");
      expect(run?.textContent).not.toContain("world");
    } finally {
      instance.dispose();
    }
  });

  it("deletes the next word with ctrl plus delete", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    try {
      input.value = "Hello brave world";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Delete", ctrlKey: true }));

      const run = root.querySelector('[data-testid="editor-2-run"]') as HTMLElement | null;
      expect(run?.textContent).not.toContain("Hello");
      expect(run?.textContent).toContain(" brave world");
    } finally {
      instance.dispose();
    }
  });

  it("edits alt text for the selected inline image through the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const imageInput = root.querySelector('[data-testid="editor-2-insert-image-input"]') as HTMLInputElement;
    const file = createTinyPngFile("alt.png");
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Chart alt");
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

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
      expect(image).not.toBeNull();
      image?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 8, clientY: 8 }));

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const altBtn = root.querySelector('[data-testid="editor-2-toolbar-image-alt"]');
        if (altBtn && !altBtn.hasAttribute("disabled")) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      (root.querySelector('[data-testid="editor-2-toolbar-image-alt"]') as HTMLButtonElement | null)?.click();

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (document.querySelector('.oasis-editor-2-dialog-input')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const altInput = document.querySelector('.oasis-editor-2-dialog-input') as HTMLInputElement | null;
      expect(altInput).not.toBeNull();
      
      if (altInput) {
        altInput.value = "Chart alt";
        altInput.dispatchEvent(new Event("input", { bubbles: true }));
        const saveBtn = document.querySelector('.oasis-editor-2-dialog-button-primary') as HTMLButtonElement | null;
        saveBtn?.click();
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')?.getAttribute("alt") === "Chart alt") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const updatedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
      expect(updatedImage?.getAttribute("alt")).toBe("Chart alt");
      expect(updatedImage?.getAttribute("width")).toBe("64");
      expect(updatedImage?.getAttribute("height")).toBe("32");
    } finally {
      promptSpy.mockRestore();
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
      instance.dispose();
    }
  });

  it("edits alt text for the selected inline image with ctrl plus alt plus a", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const imageInput = root.querySelector('[data-testid="editor-2-insert-image-input"]') as HTMLInputElement;
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = createTinyPngFile("alt-shortcut.png");
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

      const image = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
      expect(image).not.toBeNull();
      image?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 8, clientY: 8 }));

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const altBtn = root.querySelector('[data-testid="editor-2-toolbar-image-alt"]');
        if (altBtn && !altBtn.hasAttribute("disabled")) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "a", ctrlKey: true, altKey: true }),
      );

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (document.querySelector('.oasis-editor-2-dialog-input')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const altInput = document.querySelector('.oasis-editor-2-dialog-input') as HTMLInputElement | null;
      expect(altInput).not.toBeNull();
      
      if (altInput) {
        altInput.value = "Shortcut alt";
        altInput.dispatchEvent(new Event("input", { bubbles: true }));
        const saveBtn = document.querySelector('.oasis-editor-2-dialog-button-primary') as HTMLButtonElement | null;
        saveBtn?.click();
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-image"]')?.getAttribute("alt") === "Shortcut alt") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      expect(root.querySelector('[data-testid="editor-2-image"]')?.getAttribute("alt")).toBe("Shortcut alt");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
      instance.dispose();
    }
  });

  it("supports undo and redo after pasting an inline image", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const file = createTinyPngFile("paste-undo.png");

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
      const pasteEvent = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
      Object.defineProperty(pasteEvent, "clipboardData", {
        configurable: true,
        value: {
          items: [
            {
              kind: "file",
              type: "image/png",
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

      expect(root.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
      await Promise.resolve();
      expect(root.querySelector('[data-testid="editor-2-image"]')).toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "y", ctrlKey: true }));
      await Promise.resolve();
      expect(root.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("drops an inline image at the resolved point", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const editor = root.querySelector('[data-testid="editor-2-editor"]') as HTMLElement;
    const file = createTinyPngFile("drop.png");

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
      input.value = "first";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "first", inputType: "insertText" }));
      await Promise.resolve();
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      await Promise.resolve();
      input.value = "second";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "second", inputType: "insertText" }));
      await Promise.resolve();

      const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-block"]'));
      const secondBlock = blocks[1] ?? null;
      expect(secondBlock).not.toBeNull();

      const originalElementFromPoint = (document as Document & {
        elementFromPoint?: ((x: number, y: number) => Element | null) | undefined;
      }).elementFromPoint;
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(() => secondBlock),
      });

      try {
        const dropEvent = new Event("drop", { bubbles: true, cancelable: true }) as DragEvent;
        Object.defineProperty(dropEvent, "dataTransfer", {
          configurable: true,
          value: {
            items: [
              {
                kind: "file",
                type: "image/png",
                getAsFile: () => file,
              },
            ],
            files: [file],
          },
        });
        Object.defineProperty(dropEvent, "clientX", { configurable: true, value: 12 });
        Object.defineProperty(dropEvent, "clientY", { configurable: true, value: 12 });

        editor.dispatchEvent(dropEvent);
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const image = secondBlock?.querySelector('[data-testid="editor-2-image"]');
          if (image) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        Object.defineProperty(document, "elementFromPoint", {
          configurable: true,
          value: originalElementFromPoint,
        });
      }

      const blocksAfter = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-block"]'));
      expect(blocksAfter[0]?.querySelector('[data-testid="editor-2-image"]')).toBeNull();
      expect(blocksAfter[1]?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

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

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

    const boldButton = root.querySelector('[data-testid="editor-2-toolbar-bold"]') as HTMLButtonElement;
    boldButton.click();
    await Promise.resolve();

    const runNodes = root.querySelectorAll('[data-testid="editor-2-run"]');
    expect((runNodes[runNodes.length - 1] as HTMLSpanElement).style.fontWeight).toBe("700");
    expect(boldButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    instance.dispose();
  });

  it("applies a link from the toolbar prompt", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "link";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "link", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

    const linkButton = root.querySelector('[data-testid="editor-2-toolbar-link"]') as HTMLButtonElement;
    linkButton.click();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (document.querySelector('.oasis-editor-2-dialog-input')) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const linkInput = document.querySelector('.oasis-editor-2-dialog-input') as HTMLInputElement | null;
    expect(linkInput).not.toBeNull();
    if (linkInput) {
      linkInput.value = "https://example.com";
      linkInput.dispatchEvent(new Event("input", { bubbles: true }));
      const applyBtn = document.querySelector('.oasis-editor-2-dialog-button-primary') as HTMLButtonElement | null;
      applyBtn?.click();
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelector('[data-testid="editor-2-link"]')) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const link = root.querySelector('[data-testid="editor-2-link"]') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com");

    instance.dispose();
  });

  it("edits the current link with ctrl+k when the caret is inside it", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "go";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "go", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

    const linkButton = root.querySelector('[data-testid="editor-2-toolbar-link"]') as HTMLButtonElement;
    linkButton.click();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (document.querySelector('.oasis-editor-2-dialog-input')) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    let linkInput = document.querySelector('.oasis-editor-2-dialog-input') as HTMLInputElement | null;
    if (linkInput) {
      linkInput.value = "https://old.example";
      linkInput.dispatchEvent(new Event("input", { bubbles: true }));
      const applyBtn = document.querySelector('.oasis-editor-2-dialog-button-primary') as HTMLButtonElement | null;
      applyBtn?.click();
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelector('[data-testid="editor-2-link"]')) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }));
    await Promise.resolve();
    expect(linkButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "k", ctrlKey: true }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (document.querySelector('.oasis-editor-2-dialog-input')) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    linkInput = document.querySelector('.oasis-editor-2-dialog-input') as HTMLInputElement | null;
    expect(linkInput).not.toBeNull();
    if (linkInput) {
      linkInput.value = "https://new.example";
      linkInput.dispatchEvent(new Event("input", { bubbles: true }));
      const applyBtn = document.querySelector('.oasis-editor-2-dialog-button-primary') as HTMLButtonElement | null;
      applyBtn?.click();
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelector('[data-testid="editor-2-link"]')?.getAttribute("href") === "https://new.example") break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const link = root.querySelector('[data-testid="editor-2-link"]') as HTMLAnchorElement | null;
    expect(link?.getAttribute("href")).toBe("https://new.example");

    instance.dispose();
  });

  it("removes the current link with the unlink button", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("https://example.com");

    input.value = "go";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "go", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    const linkButton = root.querySelector('[data-testid="editor-2-toolbar-link"]') as HTMLButtonElement;
    linkButton.click();
    await Promise.resolve();
    promptSpy.mockRestore();

    const unlinkButton = root.querySelector('[data-testid="editor-2-toolbar-unlink"]') as HTMLButtonElement;
    unlinkButton.click();
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-link"]')).toBeNull();
    expect(unlinkButton.disabled).toBe(true);

    instance.dispose();
  });

  it("undoes and redoes link changes from the keyboard history flow", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "go";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "go", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

    const linkButton = root.querySelector('[data-testid="editor-2-toolbar-link"]') as HTMLButtonElement;
    linkButton.click();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (document.querySelector('.oasis-editor-2-dialog-input')) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const linkInput = document.querySelector('.oasis-editor-2-dialog-input') as HTMLInputElement | null;
    expect(linkInput).not.toBeNull();
    if (linkInput) {
      linkInput.value = "https://example.com";
      linkInput.dispatchEvent(new Event("input", { bubbles: true }));
      const applyBtn = document.querySelector('.oasis-editor-2-dialog-button-primary') as HTMLButtonElement | null;
      applyBtn?.click();
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (root.querySelector('[data-testid="editor-2-link"]')) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(root.querySelector('[data-testid="editor-2-link"]')).not.toBeNull();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
    await Promise.resolve();
    expect(root.querySelector('[data-testid="editor-2-link"]')).toBeNull();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "y", ctrlKey: true }));
    await Promise.resolve();
    const link = root.querySelector('[data-testid="editor-2-link"]') as HTMLAnchorElement | null;
    expect(link?.getAttribute("href")).toBe("https://example.com");

    instance.dispose();
  });

  it("applies non-boolean text styles from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "ab";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ab", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();

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

    input.value = "para";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "para", inputType: "insertText" }));
    await Promise.resolve();

    const alignCenterButton = root.querySelector(
      '[data-testid="editor-2-toolbar-align-center"]',
    ) as HTMLButtonElement;
    alignCenterButton.click();
    await Promise.resolve();

    const spacingAfterInput = document.querySelector(
      '[data-testid="editor-2-toolbar-spacing-after"]',
    ) as HTMLInputElement;
    spacingAfterInput.value = "24";
    spacingAfterInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    const indentLeftInput = document.querySelector(
      '[data-testid="editor-2-toolbar-indent-left"]',
    ) as HTMLInputElement;
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

  it("applies paragraph styles across all paragraphs touched by the selection", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "alpha";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "alpha", inputType: "insertText" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();
    input.value = "beta";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "beta", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a", ctrlKey: true }));
    await Promise.resolve();

    const spacingAfterInput = document.querySelector(
      '[data-testid="editor-2-toolbar-spacing-after"]',
    ) as HTMLInputElement;
    spacingAfterInput.value = "18";
    spacingAfterInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    const indentLeftInput = document.querySelector(
      '[data-testid="editor-2-toolbar-indent-left"]',
    ) as HTMLInputElement;
    indentLeftInput.value = "20";
    indentLeftInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    const paragraphs = Array.from(root.querySelectorAll('[data-testid="editor-2-block"]')) as HTMLParagraphElement[];
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs.every((paragraph) => paragraph.style.paddingBottom === "18px")).toBe(true);
    expect(paragraphs.every((paragraph) => paragraph.style.paddingLeft === "20px")).toBe(true);

    instance.dispose();
  });

  it("toggles bullet and ordered lists from the toolbar", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "item";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "item", inputType: "insertText" }));
    await Promise.resolve();

    const bulletButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-bullet"]',
    ) as HTMLButtonElement;
    bulletButton.click();
    await Promise.resolve();

    let marker = root.querySelector('[data-testid="editor-2-list-marker"]') as HTMLSpanElement;
    expect(marker.textContent).toBe("•");
    expect(bulletButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    const orderedButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-ordered"]',
    ) as HTMLButtonElement;
    orderedButton.click();
    await Promise.resolve();

    marker = root.querySelector('[data-testid="editor-2-list-marker"]') as HTMLSpanElement;
    expect(marker.textContent).toBe("1.");
    expect(orderedButton.classList.contains("oasis-editor-2-tool-button-active")).toBe(true);

    instance.dispose();
  });

  it("toggles bullet and ordered lists with ctrl shift 8 and 7", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "item";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "item", inputType: "insertText" }));
    await Promise.resolve();

    input.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "8", ctrlKey: true, shiftKey: true }),
    );
    await Promise.resolve();

    let marker = root.querySelector('[data-testid="editor-2-list-marker"]') as HTMLSpanElement;
    expect(marker.textContent).toBe("•");

    input.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "7", ctrlKey: true, shiftKey: true }),
    );
    await Promise.resolve();

    marker = root.querySelector('[data-testid="editor-2-list-marker"]') as HTMLSpanElement;
    expect(marker.textContent).toBe("1.");

    instance.dispose();
  });

  it("indents and outdents list items with tab and shift plus tab outside tables", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "item";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "item", inputType: "insertText" }));
    await Promise.resolve();
    const bulletButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-bullet"]',
    ) as HTMLButtonElement;
    bulletButton.click();
    await Promise.resolve();

    let block = root.querySelector('[data-testid="editor-2-block"]') as HTMLElement;
    expect(block.style.marginLeft).toBe("0px");

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
    await Promise.resolve();

    block = root.querySelector('[data-testid="editor-2-block"]') as HTMLElement;
    expect(block.style.marginLeft).toBe("28px");

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab", shiftKey: true }));
    await Promise.resolve();

    block = root.querySelector('[data-testid="editor-2-block"]') as HTMLElement;
    expect(block.style.marginLeft).toBe("0px");

    instance.dispose();
  });

  it("numbers ordered lists by contiguous sequence at the same level", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "one";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "one", inputType: "insertText" }));
    await Promise.resolve();
    const orderedButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-ordered"]',
    ) as HTMLButtonElement;
    orderedButton.click();
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();
    input.value = "two";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "two", inputType: "insertText" }));
    await Promise.resolve();

    const markers = Array.from(root.querySelectorAll('[data-testid="editor-2-list-marker"]')).map(
      (element) => element.textContent,
    );
    expect(markers).toEqual(["1.", "2."]);

    instance.dispose();
  });

  it("creates a new list item on enter and exits the list on empty enter", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "item";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "item", inputType: "insertText" }));
    await Promise.resolve();
    const bulletButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-bullet"]',
    ) as HTMLButtonElement;
    bulletButton.click();
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();

    let markers = root.querySelectorAll('[data-testid="editor-2-list-marker"]');
    expect(markers.length).toBe(2);

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    await Promise.resolve();

    markers = root.querySelectorAll('[data-testid="editor-2-list-marker"]');
    expect(markers.length).toBe(1);

    instance.dispose();
  });

  it("outdents and then removes the list with backspace at item start", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    input.value = "item";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "item", inputType: "insertText" }));
    await Promise.resolve();
    const orderedButton = root.querySelector(
      '[data-testid="editor-2-toolbar-list-ordered"]',
    ) as HTMLButtonElement;
    orderedButton.click();
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
    await Promise.resolve();

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Backspace" }));
    await Promise.resolve();

    let block = root.querySelector('[data-testid="editor-2-block"]') as HTMLElement;
    expect(block.style.marginLeft).toBe("0px");
    expect(root.querySelector('[data-testid="editor-2-list-marker"]')?.textContent).toBe("1.");

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Backspace" }));
    await Promise.resolve();

    expect(root.querySelector('[data-testid="editor-2-list-marker"]')).toBeNull();

    instance.dispose();
  });

  it("positions the caret after the list marker for an empty list paragraph", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
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
      const bulletButton = root.querySelector(
        '[data-testid="editor-2-toolbar-list-bullet"]',
      ) as HTMLButtonElement;
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

    input.value = "alpha";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "alpha", inputType: "insertText" }));
    await Promise.resolve();

    const pageBreakButton = document.querySelector(
      '[data-testid="editor-2-toolbar-page-break-before"]',
    ) as HTMLButtonElement;
    const keepWithNextButton = document.querySelector(
      '[data-testid="editor-2-toolbar-keep-with-next"]',
    ) as HTMLButtonElement;

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
    const imageFile = new File(
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
        value: [imageFile],
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

      const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
      await Promise.resolve();
      expect(root.querySelector(".oasis-editor-2-image")).toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "y", ctrlKey: true }));
      await Promise.resolve();
      expect(root.querySelector(".oasis-editor-2-image")).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("moves a selected inline image inside a table cell to the previous table cell with alt plus arrow up", async () => {
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
      "table-move-up.png",
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
      const insertDropdown = document.querySelector('[data-testid="editor-2-toolbar-insert-dropdown"]') as HTMLElement;
      insertDropdown.click();
      await Promise.resolve();

      const insertTableButton = document.querySelector(
        '[data-testid="editor-2-toolbar-insert-table"]',
      ) as HTMLButtonElement;
      insertTableButton.click();
      await Promise.resolve();

      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }),
      );
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
      expect(image.closest('[data-testid="editor-2-table-cell"]')).toBe(secondCellBefore);

      image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }));
      await Promise.resolve();

      input.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp", altKey: true }),
      );
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const movedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
        if (movedImage && movedImage.closest('[data-testid="editor-2-table-cell"]') === firstCellBefore) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const cellsAfter = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-table-cell"]'));
      expect(cellsAfter[0]?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
      expect(cellsAfter[1]?.querySelector('[data-testid="editor-2-image"]')).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("moves a selected inline image before a table when moving up from the first paragraph", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
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
      "boundary-move-up.png",
      { type: "image/png" },
    );
    const docxFile = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t></w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
          <w:p><w:r><w:t>Tail</w:t></w:r></w:p>
        </w:body>
      </w:document>`);

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
      Object.defineProperty(importInput, "files", {
        configurable: true,
        value: [docxFile],
      });
      importInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-table"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

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

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp", altKey: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const topLevelBlocks = Array.from(
          root.querySelectorAll<HTMLElement>('[data-testid="editor-2-surface"] > [data-block-id]'),
        );
        if (topLevelBlocks[0]?.querySelector('[data-testid="editor-2-image"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const topLevelBlocks = Array.from(
        root.querySelectorAll<HTMLElement>('[data-testid="editor-2-surface"] > [data-block-id]'),
      );
      expect(topLevelBlocks[0]?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
      expect(topLevelBlocks[1]?.textContent?.replace(/\u00A0/g, "")).toBe("a");
      expect(root.querySelector('[data-testid="editor-2-table"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("drags a selected inline image to another paragraph with the mouse", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
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
      "drag.png",
      { type: "image/png" },
    );
    const docxFile = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>First</w:t></w:r></w:p>
          <w:p><w:r><w:t>Second</w:t></w:r></w:p>
        </w:body>
      </w:document>`);

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
      Object.defineProperty(importInput, "files", {
        configurable: true,
        value: [docxFile],
      });
      importInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelectorAll('[data-paragraph-id]').length === 2) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

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
      const paragraphs = Array.from(root.querySelectorAll<HTMLElement>("[data-paragraph-id]"));
      const targetParagraph = paragraphs[1] ?? null;
      const targetParagraphId = targetParagraph?.dataset.paragraphId ?? null;
      expect(image).not.toBeNull();
      expect(targetParagraph).not.toBeNull();

      const originalElementFromPoint = (document as Document & {
        elementFromPoint?: ((x: number, y: number) => Element | null) | undefined;
      }).elementFromPoint;
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(() => targetParagraph),
      });

      try {
        image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 12, clientY: 12 }));
        window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 42, clientY: 42 }));
        window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 42, clientY: 42 }));
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const movedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
          if (movedImage?.closest("[data-paragraph-id]") === targetParagraph) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        Object.defineProperty(document, "elementFromPoint", {
          configurable: true,
          value: originalElementFromPoint,
        });
      }

      const movedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
      expect((movedImage?.closest("[data-paragraph-id]") as HTMLElement | null)?.dataset.paragraphId).toBe(targetParagraphId);
      expect(paragraphs[0]?.textContent?.replace(/\u00A0/g, "")).toBe("First");
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("supports undo and redo after dropping an inline image", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const editor = root.querySelector('[data-testid="editor-2-editor"]') as HTMLElement;
    const file = createTinyPngFile("drop-undo.png");

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
      input.value = "first";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "first", inputType: "insertText" }));
      await Promise.resolve();
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
      await Promise.resolve();

      const originalElementFromPoint = (document as Document & {
        elementFromPoint?: ((x: number, y: number) => Element | null) | undefined;
      }).elementFromPoint;
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(() => editor),
      });

      try {
        const dropEvent = new Event("drop", { bubbles: true, cancelable: true }) as DragEvent;
        Object.defineProperty(dropEvent, "dataTransfer", {
          configurable: true,
          value: {
            items: [
              {
                kind: "file",
                type: "image/png",
                getAsFile: () => file,
              },
            ],
            files: [file],
          },
        });
        Object.defineProperty(dropEvent, "clientX", { configurable: true, value: 12 });
        Object.defineProperty(dropEvent, "clientY", { configurable: true, value: 12 });

        editor.dispatchEvent(dropEvent);
        for (let attempt = 0; attempt < 20; attempt += 1) {
          if (root.querySelector('[data-testid="editor-2-image"]')) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        Object.defineProperty(document, "elementFromPoint", {
          configurable: true,
          value: originalElementFromPoint,
        });
      }

      expect(root.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
      await Promise.resolve();
      expect(root.querySelector('[data-testid="editor-2-image"]')).toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "y", ctrlKey: true }));
      await Promise.resolve();
      expect(root.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("supports undo and redo after dragging an inline image", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const file = createTinyPngFile("undo-drag.png");

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
      input.value = "first";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "first", inputType: "insertText" }));
      await Promise.resolve();
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      await Promise.resolve();
      input.value = "second";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "second", inputType: "insertText" }));
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

      const originalElementFromPoint = (document as Document & {
        elementFromPoint?: ((x: number, y: number) => Element | null) | undefined;
      }).elementFromPoint;
      const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-block"]'));
      const targetParagraph = paragraphs[0] ?? null;
      const originalParagraph = paragraphs[1] ?? null;
      expect(targetParagraph).not.toBeNull();
      expect(originalParagraph).not.toBeNull();
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: vi.fn(() => targetParagraph),
      });

      try {
        image.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 12, clientY: 12 }));
        window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 44, clientY: 44 }));
        window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 44, clientY: 44 }));
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const movedImage = root.querySelector('[data-testid="editor-2-image"]') as HTMLImageElement | null;
          if (movedImage && movedImage.closest('[data-testid="editor-2-block"]') === targetParagraph) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        Object.defineProperty(document, "elementFromPoint", {
          configurable: true,
          value: originalElementFromPoint,
        });
      }

      const blocksAfterDrag = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-block"]'));
      const targetParagraphAfterDrag = blocksAfterDrag.find((block) => block.dataset.paragraphId === targetParagraph?.dataset.paragraphId) ?? null;
      const originalParagraphAfterDrag = blocksAfterDrag.find((block) => block.dataset.paragraphId === originalParagraph?.dataset.paragraphId) ?? null;
      expect(targetParagraphAfterDrag?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
      expect(originalParagraphAfterDrag?.querySelector('[data-testid="editor-2-image"]')).toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "z", ctrlKey: true }));
      await Promise.resolve();
      const blocksAfterUndo = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-block"]'));
      const targetParagraphAfterUndo = blocksAfterUndo.find((block) => block.dataset.paragraphId === targetParagraph?.dataset.paragraphId) ?? null;
      const originalParagraphAfterUndo = blocksAfterUndo.find((block) => block.dataset.paragraphId === originalParagraph?.dataset.paragraphId) ?? null;
      expect(targetParagraphAfterUndo?.querySelector('[data-testid="editor-2-image"]')).toBeNull();
      expect(originalParagraphAfterUndo?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "y", ctrlKey: true }));
      await Promise.resolve();
      const blocksAfterRedo = Array.from(root.querySelectorAll<HTMLElement>('[data-testid="editor-2-block"]'));
      const targetParagraphAfterRedo = blocksAfterRedo.find((block) => block.dataset.paragraphId === targetParagraph?.dataset.paragraphId) ?? null;
      const originalParagraphAfterRedo = blocksAfterRedo.find((block) => block.dataset.paragraphId === originalParagraph?.dataset.paragraphId) ?? null;
      expect(targetParagraphAfterRedo?.querySelector('[data-testid="editor-2-image"]')).not.toBeNull();
      expect(originalParagraphAfterRedo?.querySelector('[data-testid="editor-2-image"]')).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });

  it("round-trips a mixed document after editing an inline image", async () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;
    const imageInput = root.querySelector(
      '[data-testid="editor-2-insert-image-input"]',
    ) as HTMLInputElement;
    const importInput = root.querySelector(
      '[data-testid="editor-2-import-docx-input"]',
    ) as HTMLInputElement;
    const file = createTinyPngFile("round-trip.png");
    const docxFile = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Intro</w:t></w:r></w:p>
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
          <w:p><w:r><w:t>Outro</w:t></w:r></w:p>
        </w:body>
      </w:document>`);

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

    const previousCreateObjectURL = URL.createObjectURL;
    const previousRevokeObjectURL = URL.revokeObjectURL;
    const previousAnchorClick = HTMLAnchorElement.prototype.click;
    const createObjectURL = vi.fn(() => "blob:round-trip");
    const revokeObjectURL = vi.fn();
    const anchorClick = vi.fn();
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
      Object.defineProperty(importInput, "files", {
        configurable: true,
        value: [docxFile],
      });
      importInput.dispatchEvent(new Event("change", { bubbles: true }));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (root.querySelector('[data-testid="editor-2-table"]')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home", ctrlKey: true }));
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

      const fileDropdown = document.querySelector('[data-testid="editor-2-toolbar-file-dropdown"]') as HTMLElement;
      fileDropdown.click();
      await Promise.resolve();

      const exportButton = document.querySelector(
        '[data-testid="editor-2-toolbar-export-docx"]',
      ) as HTMLButtonElement;
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
        value: previousAnchorClick,
      });
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: OriginalImage,
      });
    }

    instance.dispose();
  });
});
