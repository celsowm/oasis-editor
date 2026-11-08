import { serializeEditorSelectionToHtml } from "@/core/commands/clipboard.js";
import { getSelectedText } from "@/core/commands/selection.js";
import type { EditorState } from "@/core/model.js";
import type { EssentialsBrowserCapability } from "@/plugins/internal/essentialsCapabilities.js";

/**
 * Copies the editor's *model selection*, not the DOM selection of the button
 * that currently holds focus. Keyboard copy through the editor input continues
 * to use useEditorClipboard, preserving its existing rich-clipboard behavior.
 */
export function buildEssentialsBrowser(
  state: () => EditorState,
): EssentialsBrowserCapability {
  const selectedText = (): string => getSelectedText(state());

  const copyPlainTextSynchronously = (text: string): void => {
    const previousFocus = document.activeElement;
    const input = document.createElement("textarea");
    input.value = text;
    input.readOnly = true;
    input.setAttribute("aria-hidden", "true");
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    try {
      input.focus({ preventScroll: true });
      input.select();
      document.execCommand("copy");
    } finally {
      input.remove();
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus({ preventScroll: true });
      }
    }
  };

  const writePlainText = (text: string): void => {
    if (navigator.clipboard?.writeText) {
      try {
        void navigator.clipboard.writeText(text).catch((): void => {
          copyPlainTextSynchronously(text);
        });
        return;
      } catch {
        // Clipboard API access can throw synchronously on insecure contexts.
      }
    }
    copyPlainTextSynchronously(text);
  };

  return {
    hasSelection: (): boolean => selectedText().length > 0,
    copy: (): void => {
      const snapshot = state();
      const text = getSelectedText(snapshot);
      if (!text) return;

      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        try {
          const html = serializeEditorSelectionToHtml(snapshot);
          const item = new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          });
          void navigator.clipboard.write([item]).catch((): void => {
            writePlainText(text);
          });
          return;
        } catch {
          // Some browsers support text/plain but reject rich ClipboardItem.
        }
      }
      writePlainText(text);
    },
  };
}
