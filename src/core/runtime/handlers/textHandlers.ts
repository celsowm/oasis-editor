import { registerInlineHandlers } from "./inlineHandlers.js";
import { registerStructureHandlers } from "./structureHandlers.js";
import { registerAnnotationHandlers } from "./annotationHandlers.js";

export function registerTextHandlers(): void {
  registerInlineHandlers();
  registerStructureHandlers();
  registerAnnotationHandlers();
}
