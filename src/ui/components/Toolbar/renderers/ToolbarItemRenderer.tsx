// `ToolbarItemRenderer` is defined in `renderers.tsx` because it is mutually
// recursive with the per-type renderers (menus/groups render child items
// through it). Re-exported here so existing importers keep their path.
export { ToolbarItemRenderer } from "./renderers.js";
