import { render } from "solid-js/web";
import { OasisSiteApp } from "./OasisSiteApp.js";
import "../src/styles/oasis-editor.css";
import "./styles/base.css";
import "./styles/app.css";
import { installEditorDebugControl } from "../src/utils/logger.js";

const container = document.getElementById("oasis-editor-root");
if (!container) {
  throw new Error("OasisEditor: missing mount target #oasis-editor-root");
}

installEditorDebugControl();

render(() => OasisSiteApp(), container);
