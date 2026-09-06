/**
 * Prints a PDF blob using a hidden iframe so the browser's native print
 * dialog renders the document itself (not the editor chrome around it).
 */
export function printBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    let settled = false;
    const cleanup = (): void => {
      if (settled) return;
      settled = true;
      iframe.remove();
      URL.revokeObjectURL(url);
      resolve();
    };

    const fallback = (): void => {
      if (settled) return;
      const popup = window.open(url, "_blank");
      if (!popup) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "oasis-editor.pdf";
        anchor.click();
      }
      cleanup();
    };

    iframe.addEventListener("load", () => {
      try {
        const contentWindow = iframe.contentWindow;
        if (!contentWindow) {
          fallback();
          return;
        }
        contentWindow.addEventListener("afterprint", cleanup);
        // Safety net: not every browser fires `afterprint` for a print
        // triggered from inside an iframe.
        globalThis.setTimeout(cleanup, 60_000);
        contentWindow.focus();
        contentWindow.print();
      } catch {
        fallback();
      }
    });

    iframe.src = url;
    document.body.appendChild(iframe);
  });
}
