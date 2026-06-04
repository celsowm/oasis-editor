import { render } from "solid-js/web";
import { OasisSiteApp } from "./demo/OasisSiteApp.js";
import "./styles/oasis-editor.css";
import "./styles/oasis-editor-demo.css";
import "./styles/oasis-editor-site.css";
import { installEditorDebugControl } from "./utils/logger.js";

const container = document.getElementById("oasis-editor-root");
if (!container) {
  throw new Error("OasisEditor: missing mount target #oasis-editor-root");
}

installEditorDebugControl();

render(() => OasisSiteApp(), container);
