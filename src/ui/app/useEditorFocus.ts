import { createSignal } from "solid-js";

export function createEditorFocusController() {
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
    get viewportRef() {
      return viewportRef;
    },
    set viewportRef(element: HTMLDivElement | undefined) {
      viewportRef = element;
    },
    get surfaceRef() {
      return surfaceRef;
    },
    set surfaceRef(element: HTMLDivElement | undefined) {
      surfaceRef = element;
    },
    get textareaRef() {
      return textareaRef;
    },
    set textareaRef(element: HTMLTextAreaElement | undefined) {
      textareaRef = element;
    },
    get importInputRef() {
      return importInputRef;
    },
    set importInputRef(element: HTMLInputElement | undefined) {
      importInputRef = element;
    },
    get imageInputRef() {
      return imageInputRef;
    },
    set imageInputRef(element: HTMLInputElement | undefined) {
      imageInputRef = element;
    },
  };
}
