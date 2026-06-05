/**
 * Horizontal gutter (px) between the page (`.oasis-editor-paper`) and the edge
 * of the scrollable editor content (`.oasis-editor-editor-scroll-content`).
 *
 * The single source of truth for the horizontal gutter. TS uses it directly for
 * the editor shell width (`pageWidth + 2 * gutter`) and injects it into CSS as
 * the `--oasis-editor-gutter-x` custom property on `.oasis-editor-app` (see
 * OasisEditorApp.tsx), so the gutter is defined exactly once. Keeping it
 * identical across every UI variant is what keeps the ruler origin aligned with
 * the caret — the ruler still measures the paper from the DOM as a backstop.
 */
export const EDITOR_SCROLL_PADDING_PX = 34;
