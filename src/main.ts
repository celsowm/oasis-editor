import { createOasisEditorApp } from "./app/bootstrap/createOasisEditorApp.js";
import "./styles/global.css";
import { createIcons, icons } from "lucide";

const app: ReturnType<typeof createOasisEditorApp> = createOasisEditorApp();
document.fonts.ready.then(() => {
  app.start();
  createIcons({ icons });
});
