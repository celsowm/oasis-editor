import { createOasisEditor2 } from "./app/bootstrap/createOasisEditor2App.js";
import "./styles/oasis-editor-2.css";
import { installEditor2DebugControl } from "./utils/logger.js";

const container = document.getElementById("oasis-editor-2-root");
if (!container) {
  throw new Error("OasisEditor2: missing mount target #oasis-editor-2-root");
}

const loading = document.getElementById("oasis-editor-2-loading");
installEditor2DebugControl();

function hideLoading(): void {
  if (loading) {
    loading.classList.add("oasis-editor-2-loading-hidden");
    loading.addEventListener(
      "transitionend",
      () => loading.remove(),
      { once: true },
    );
  }
}

function init(): void {
  createOasisEditor2(container as HTMLElement);
  hideLoading();
}

document.fonts.ready.then(init).catch(() => {
  init();
});
