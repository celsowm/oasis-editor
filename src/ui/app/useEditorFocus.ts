import { createSignal, type Accessor, type Setter } from "solid-js";

export interface EditorFocusController {
  focused: Accessor<boolean>;
  setFocused: Setter<boolean>;
  focusInput: () => void;
  focusInputAfterPointerSelection: () => void;
  viewportRef: HTMLDivElement | undefined;
  surfaceRef: HTMLDivElement | undefined;
  textareaRef: HTMLTextAreaElement | undefined;
  importInputRef: HTMLInputElement | undefined;
  imageInputRef: HTMLInputElement | undefined;
}

export function createEditorFocusController(): EditorFocusController {
  const [focused, setFocused] = createSignal(false);
  let viewportRef: HTMLDivElement | undefined;
  let surfaceRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let importInputRef: HTMLInputElement | undefined;
  let imageInputRef: HTMLInputElement | undefined;

  const focusInput = (): void => {
    setFocused(true);
    queueMicrotask((): void => {
      textareaRef?.focus({ preventScroll: true });
      if (textareaRef) {
        textareaRef.selectionStart = textareaRef.value.length;
        textareaRef.selectionEnd = textareaRef.value.length;
      }
    });
  };

  const focusInputAfterPointerSelection = (): void => {
    setFocused(true);
    queueMicrotask((): void => {
      requestAnimationFrame((): void => {
        textareaRef?.focus({ preventScroll: true });
        if (textareaRef) {
          textareaRef.selectionStart = textareaRef.value.length;
          textareaRef.selectionEnd = textareaRef.value.length;
        }
      });
    });
  };

  return {
    focused,
    setFocused,
    focusInput,
    focusInputAfterPointerSelection,
    get viewportRef(): HTMLDivElement | undefined {
      return viewportRef;
    },
    set viewportRef(element: HTMLDivElement | undefined) {
      viewportRef = element;
    },
    get surfaceRef(): HTMLDivElement | undefined {
      return surfaceRef;
    },
    set surfaceRef(element: HTMLDivElement | undefined) {
      surfaceRef = element;
    },
    get textareaRef(): HTMLTextAreaElement | undefined {
      return textareaRef;
    },
    set textareaRef(element: HTMLTextAreaElement | undefined) {
      textareaRef = element;
    },
    get importInputRef(): HTMLInputElement | undefined {
      return importInputRef;
    },
    set importInputRef(element: HTMLInputElement | undefined) {
      importInputRef = element;
    },
    get imageInputRef(): HTMLInputElement | undefined {
      return imageInputRef;
    },
    set imageInputRef(element: HTMLInputElement | undefined) {
      imageInputRef = element;
    },
  };
}
