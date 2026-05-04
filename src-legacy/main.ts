import { createOasisEditor } from "./app/bootstrap/createOasisEditorApp.tsx";
import { Logger } from "./core/utils/Logger.js";
import "./styles/global.css";
import "./styles/components/PickerBase.css";
import "./styles/components/ColorPicker.css";
import "./styles/components/HighlightColorPicker.css";
import "./styles/components/TablePicker.css";
import "./styles/components/Ruler.css";
import { startIconObserver } from "./ui/utils/IconManager.js";

const container = document.getElementById("oasis-editor-root");
if (!container) {
  throw new Error("OasisEditor: missing mount target #oasis-editor-root");
}

const loading = document.getElementById("oasis-editor-loading");

function hideLoading(): void {
  if (loading) {
    loading.classList.add("oasis-editor-loading-hidden");
    loading.addEventListener("transitionend", () => loading.remove(), {
      once: true,
    });
  }
}

function initEditor(): void {
  const { controller } = createOasisEditor(container!);
  startIconObserver(container!);
  hideLoading();
}

document.fonts.ready.then(initEditor).catch((err) => {
  Logger.error("Font loading failed, initializing anyway:", err);
  initEditor();
});
