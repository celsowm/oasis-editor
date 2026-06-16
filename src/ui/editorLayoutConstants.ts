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

/**
 * Width (px) reserved for the editor's vertical scrollbar gutter.
 *
 * The page paper is `width: 100%` of the scroll content, so the editor shell
 * width is sized as `pageWidth + 2 * gutter (+ this reserve)`. Without reserving
 * the scrollbar's track, the fixed-width canvas surface (`pageWidth`) collides
 * with the vertical scrollbar and forces a spurious horizontal scrollbar — most
 * visible in landscape, where the page is wide. We pair this reserve with
 * `scrollbar-gutter: stable` on `.oasis-editor-editor` (see app-shell.css) so the
 * gutter is always reserved and the paper stays exactly `pageWidth`. Keep this in
 * lockstep with the `::-webkit-scrollbar { width }` value in app-shell.css.
 */
export const EDITOR_SCROLLBAR_RESERVE_PX = 10;
