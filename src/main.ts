import { createOasisEditorApp } from "./app/bootstrap/createOasisEditorApp.js";
import "./styles/global.css";

const app: ReturnType<typeof createOasisEditorApp> = createOasisEditorApp();
document.fonts.ready.then(() => {
  app.start();
});
