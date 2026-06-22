/**
 * Re-export the refactored model module under its original path.
 *
 * The 1411-line monolithic `model.ts` was split into focused modules under
 * `./model/` (types, queries, styleResolution, pageGeometry, documentIndex,
 * editingZones, etc.). This file is now a one-liner barrel so the 43+
 * existing `import { ... } from "@/model.js"` sites continue to work
 * without any change.
 */
export * from "./model/index.js";
export * from "./tableStyleResolver.js";
