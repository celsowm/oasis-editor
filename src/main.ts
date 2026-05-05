import { createOasisEditor } from "./app/bootstrap/createOasisEditorApp.js";
import "./styles/oasis-editor.css";
import "./styles/oasis-editor-demo.css";
import { installEditorDebugControl } from "./utils/logger.js";

const container = document.getElementById("oasis-editor-root");
if (!container) {
  throw new Error("OasisEditor: missing mount target #oasis-editor-root");
}

const loading = document.getElementById("oasis-editor-loading");
installEditorDebugControl();

function hideLoading(): void {
  if (loading) {
    loading.classList.add("oasis-editor-loading-hidden");
    loading.addEventListener(
      "transitionend",
      () => loading.remove(),
      { once: true },
    );
  }
}

function init(): void {
  const params = new URLSearchParams(window.location.search);
  const requestedShell = params.get("shell");
  const shell = requestedShell === "inline" || requestedShell === "balloon" ? requestedShell : "document";

  createOasisEditor(container as HTMLElement, {
    shell,
    uiVariant: "docs",
  });
  hideLoading();
}

document.fonts.ready.then(init).catch(() => {
  init();
});
