import { createOasisEditor } from "./app/bootstrap/createOasisEditorApp.js";
import "./styles/global.css";
import "./styles/components/ColorPicker.css";
import "./styles/components/TablePicker.css";
import "./styles/components/Ruler.css";
import { createIcons, icons } from "lucide";

const container = document.getElementById("oasis-editor-root");
if (!container) {
  throw new Error("OasisEditor: missing mount target #oasis-editor-root");
}

const loading = document.getElementById("oasis-editor-loading");

document.fonts.ready.then(() => {
  const { controller } = createOasisEditor(container);
  createIcons({ icons });
  controller.start();

  if (loading) {
    loading.classList.add("oasis-editor-loading-hidden");
    loading.addEventListener("transitionend", () => loading.remove(), {
      once: true,
    });
  }
});
