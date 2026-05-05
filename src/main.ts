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
  const tabsContainer = document.createElement("div");
  tabsContainer.style.padding = "10px";
  tabsContainer.style.background = "#eee";
  tabsContainer.style.display = "flex";
  tabsContainer.style.gap = "10px";
  
  const shells: Array<"document" | "inline" | "balloon"> = ["document", "inline", "balloon"];
  let currentInstance: any = null;

  shells.forEach(shell => {
    const btn = document.createElement("button");
    btn.textContent = shell.charAt(0).toUpperCase() + shell.slice(1) + " Shell";
    btn.onclick = () => {
      if (currentInstance) currentInstance.dispose();
      container!.innerHTML = "";
      currentInstance = createOasisEditor(container as HTMLElement, {
        shell,
        uiVariant: "docs",
      });
    };
    tabsContainer.appendChild(btn);
  });

  document.body.prepend(tabsContainer);
  currentInstance = createOasisEditor(container as HTMLElement, {
    shell: "document",
    uiVariant: "docs",
  });
  hideLoading();
}

document.fonts.ready.then(init).catch(() => {
  init();
});
