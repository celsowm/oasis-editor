import type { IRenderingEngine } from "../../core/engine.js";
import { domTextMeasurer } from "../textMeasurement.js";
import { DOMEditorSurface } from "../components/DOMEditorSurface.js";

export const domEngine: IRenderingEngine = {
  id: "dom",
  measurer: domTextMeasurer,
  SurfaceComponent: DOMEditorSurface,
};
