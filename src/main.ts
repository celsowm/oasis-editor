// @ts-nocheck








import { createOasisEditorApp } from "./app/bootstrap/createOasisEditorApp.js";
import "./styles/global.css";

const app = createOasisEditorApp();
document.fonts.ready.then(() => {
  app.start();
});
