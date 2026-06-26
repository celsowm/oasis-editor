# Layout Projection Unification & Caret-Latency Plan

> Status: implemented in this change set; retained as architecture record.
> Scope: the canvas layout/projection pipeline, selection geometry, status page
> reads, and canvas hit-testing.
> Compatibility: **greenfield** - we deliberately change internal function
> signatures and component wiring. No backward-compat shims.

## 1. Problem

Editing a table-heavy document (for example
`documento_casos_uso_parcelamento_v2_1.docx`, 14 pages, ~296 blocks, dozens of
tables) feels sluggish, and the blinking caret lags after typing or clicking.

Root cause: **the same document layout is projected by multiple independent
consumers that do not share work.**

```diagram
                          ╭───────────────────────────╮
   state.document ───────▶│ CanvasEditorSurface        │
   measured maps          │   documentLayout = memo(   │──▶ projectDocumentLayout ──▶ render pages
   fontsGeneration        │     projectDocumentLayout) │
                          ╰───────────────────────────╯

                          ╭───────────────────────────╮
   selection / caret ────▶│ useEditorLayout            │
   scroll / resize        │   syncInputBox()           │──▶ buildCanvasLayoutSnapshot
   content-change         │     (queueMicrotask)       │        ├─ projectDocumentLayout  (again)
                          ╰───────────────────────────╯        ├─ buildCanvasTableLayout (every table)
                                                                └─ getBoundingClientRect (every page)

                          ╭───────────────────────────╮
   status/current page ──▶│ OasisEditorEditor          │──▶ projectDocumentLayout  (again)
                          ╰───────────────────────────╯

                          ╭───────────────────────────╮
   click / drag hit-test ▶│ useCanvasSurfaceHitResolver│──▶ buildCanvasLayoutSnapshot
                          ╰───────────────────────────╯        └─ projectDocumentLayout  (again on cache miss)
```

Key facts verified in code:

- [`CanvasEditorSurface.tsx`](../src/ui/components/CanvasEditorSurface.tsx)
  builds a `documentLayout` `createMemo` by calling `projectDocumentLayout`.
- [`CanvasLayoutSnapshot.ts`](../src/ui/canvas/CanvasLayoutSnapshot.ts)
  (`buildCanvasLayoutSnapshot`) calls `projectDocumentLayout` internally, then
  walks every page and calls `buildCanvasTableLayout` for every table to produce
  an absolute-coordinate geometry snapshot.
- [`useEditorLayout.ts`](../src/app/controllers/useEditorLayout.ts) invokes
  `syncInputBox` on every selection change, caret move, scroll, resize, and
  content change.
- [`OasisEditorEditor.tsx`](../src/ui/OasisEditorEditor.tsx) has a separate
  `statusDocumentLayout` projection for total pages and current page fallback.
- [`useCanvasSurfaceHitResolver.ts`](../src/ui/app/useCanvasSurfaceHitResolver.ts)
  builds its own canvas snapshot for click/drag hit-testing, with a local cache
  keyed on document/measured-map references and viewport dimensions.
- The canvas snapshot is selection-independent: only
  `computeCanvasSelectionGeometry` and `computeCommentHighlights` read the
  current selection. A pure caret move currently rebuilds the whole document
  snapshot just to reposition the caret.

Consequence: a click, arrow-key press, drag, or status refresh can trigger full
re-projection, all-table layout, and per-page DOM measurement even when the
logical document layout has not changed.

## 2. Goals & Principles

1. **Project once per layout-relevant change.** Page rendering, selection/caret
   geometry, status/current-page logic, and canvas hit-testing must consume the
   same projected `EditorLayoutDocument`.
2. **Put the shared projection above the editor view.** The owner must be a
   runtime/view-model layer that can feed `useEditorLayout`, `OasisEditorEditor`,
   `CanvasEditorSurface`, and `useCanvasSurfaceHitResolver`. Do not use a
   surface-local context that only solves rendering.
3. **Separate logical layout from absolute geometry.**
   - Logical layout is pure and deterministic: `document`, measured maps,
     font/measurement epoch, default tab stop, and hyphenation.
   - Absolute geometry is impure: live DOM page rects, surface origin, and zoom.
4. **Caret/selection moves do zero projection work.** They only re-derive
   selection and comment geometry from an already-valid snapshot.
5. **Scroll does not re-project.** Scrolling may rebuild absolute geometry, but
   it must reuse the cached logical projection.
6. **Correctness comes from explicit dependency keys, never from the `reason`
   string.** `reason` remains only a scheduling/debug hint.

## 3. Target Architecture

```diagram
                 ╭──────────────────────────────────────────────────────────╮
                 │ Editor runtime / view model                               │
                 │                                                           │
 document ──────▶│  projectedLayout = createMemo(() =>                        │
 measured maps   │      stabilize(projectDocumentLayout(document, ...)))      │──┐
 layoutEpoch ───▶│  // logical only; no DOM, no zoom                          │  │
                 │                                                           │  │
                 │  canvasSnapshotProvider(projectedLayout, surface, zoom)    │──┼─┐
                 ╰──────────────────────────────────────────────────────────╯  │ │
                                                                                 │ │
        ┌────────────────────────────────────────────────────────────────────┘ │
        │ projectedLayout (EditorLayoutDocument)                                │
        ▼                                                                        │
 ╭────────────────────────╮       ╭─────────────────────╮                       │
 │ CanvasEditorSurface     │       │ OasisEditorEditor   │                       │
 │ paints pages            │       │ status/current page │                       │
 ╰────────────────────────╯       ╰─────────────────────╯                       │
                                                                                 │
        ┌────────────────────────────────────────────────────────────────────────┘
        │ snapshot (absolute geometry; no projection)
        ▼
 ╭────────────────────────╮       ╭────────────────────────────────╮
 │ useEditorLayout         │       │ useCanvasSurfaceHitResolver     │
 │ caret/selection/comment │       │ click/drag hit-testing          │
 ╰────────────────────────╯       ╰────────────────────────────────╯
```

### 3.1 Shared Projected Layout Accessor

Create one Solid accessor for `EditorLayoutDocument` in the runtime/view-model
layer above `OasisEditorEditor`.

Recommended placement:

- Build the accessor from the document runtime/view state, near the existing
  layout accessors returned from `createEditorDocumentRuntime`.
- Thread it through the view object into `EditorWorkspace` / `DocumentShell` /
  `OasisEditorEditor` the same way `measuredBlockHeights` and
  `measuredParagraphLayouts` are currently threaded.
- Pass the same accessor into `useEditorLayout` and
  `createCanvasSurfaceHitResolver`.

The accessor depends on:

- `state.document`
- `measuredBlockHeights()`
- `measuredParagraphLayouts()`
- `layoutMetricsEpoch()`
- document settings that affect projection, already contained in `document`
  (`defaultTabStop`, hyphenation settings, sections, footnotes, headers, etc.)

It must not depend on zoom, scroll, DOM rects, selection, comments, hovered
revision state, or status bar state.

`CanvasEditorSurface` must stop calling `projectDocumentLayout` and instead
receive the shared accessor through `EditorSurfaceProps`.

`OasisEditorEditor` must remove `statusDocumentLayout` and use the same accessor
for `totalPages`, current-page fallback, and the effect that schedules
`recomputeViewportPageIndex`.

### 3.2 Snapshot Builder Consumes a Pre-Projected Layout

Change `buildCanvasLayoutSnapshot` so it never projects.

```ts
// before
buildCanvasLayoutSnapshot({
  surface,
  state,
  measuredBlockHeights,
  measuredParagraphLayouts,
  zoomFactor,
});

// after
buildCanvasLayoutSnapshot({
  surface,
  state,
  documentLayout,
  zoomFactor,
});
```

`documentLayout` is the shared `projectedLayout()`.

`BuildCanvasLayoutSnapshotOptions` must remove `measuredBlockHeights` and
`measuredParagraphLayouts`, add `documentLayout: EditorLayoutDocument`, and
`CanvasLayoutSnapshot.ts` must drop its `projectDocumentLayout` import.

The snapshot builder continues to own only:

- finding rendered canvas page elements;
- reading `getBoundingClientRect`;
- applying zoom-invariant coordinate conversion;
- walking the pre-projected pages;
- building canvas table geometry with `buildCanvasTableLayout`;
- building paragraph/image/textbox/floating-table absolute geometry indexes.

### 3.3 Shared Snapshot Cache / Provider

Extract the snapshot cache policy into a shared helper/provider consumed by both
`useEditorLayout` and `useCanvasSurfaceHitResolver`.

The provider should expose a function like:

```ts
getCanvasLayoutSnapshot({
  surface,
  state,
  documentLayout,
  zoomFactor,
}): CanvasLayoutSnapshot | null
```

The cache key is:

```ts
interface SnapshotCacheKey {
  surface: HTMLElement;
  documentLayout: EditorLayoutDocument;
  zoomFactor: number;
  domRectSignature: string;
}
```

`domRectSignature` is computed from:

- `surface.getBoundingClientRect()`;
- every `[data-renderer="canvas"][data-page-index]` element, sorted by page
  index;
- rounded `left`, `top`, `width`, and `height` values.

This replaces the current duplicate cache logic in
`useCanvasSurfaceHitResolver`, whose keys are based on document/measured-map
references, viewport scroll, client dimensions, and window size.

`computeCanvasSelectionGeometry` and `computeCommentHighlights` are always
recomputed from the current snapshot and current `state`. Snapshot reuse must
not freeze selection, comments, hovered state, or active object state.

### 3.4 Layout Metrics Epoch

Async font loading and precise-font-mode changes mutate global measurement
caches (`clearTextMeasureCache`, `clearNormalLineHeightCache`,
`clearProjectedParagraphLayoutCache`) and currently bump a private
`fontsGeneration` signal inside `CanvasEditorSurface`. The shared projection
must observe the same invalidation.

Create `src/layoutProjection/layoutMetricsEpoch.ts` with:

- `layoutMetricsEpoch(): number`
- `bumpLayoutMetricsEpoch(): void`

Re-export both from `src/layoutProjection/index.ts`.

Do **not** put the epoch owner in `src/layoutProjection/paragraphProjection.ts`;
that file is currently only a barrel over `paragraphPagination.ts`.

Increment the epoch whenever projection/measurement caches are cleared. The
font-ready path in `CanvasEditorSurface` should clear caches, call
`bumpLayoutMetricsEpoch()`, and then rely on the shared accessor to re-project.
`CanvasEditorSurface` may still pass the epoch value as a paint invalidation
token if needed, but it must not own the canonical layout invalidation signal.

Result: when fonts settle, the shared layout accessor recomputes once, the
snapshot cache key changes through `documentLayout` identity, and the caret is
repositioned with correct metrics.

### 3.5 Scroll/Resize Without Re-Projection

Scrolling changes DOM rects, not logical layout. On scroll, the snapshot provider
may rebuild absolute geometry because `domRectSignature` changes, but it must
reuse `projectedLayout()`.

Add a `ResizeObserver` on the relevant editor surface/page-stack/viewport if
needed so panel toggles or container changes that do not emit `window.resize`
still schedule `requestInputBoxSync("resize")`. The observer should only
schedule sync; invalidation remains driven by the explicit snapshot key.

## 4. Concrete Changes

| Area                                         | Change                                                                                                                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared layout source                         | Add a runtime/view-model accessor that calls `projectDocumentLayout` once with document, measured maps, the canvas measurer, and `layoutMetricsEpoch()`. Preserve `createLayoutIdentityStabilizer` behavior at this shared source. |
| Runtime/view wiring                          | Thread `projectedLayout` through the existing view props/accessor path into `OasisEditorEditor`, `CanvasEditorSurface`, `useEditorLayout`, and `createCanvasSurfaceHitResolver`.                                                   |
| `src/ui/components/CanvasEditorSurface.tsx`  | Remove the local `documentLayout` projection. Use the shared accessor for pages. Replace private `fontsGeneration` as the canonical invalidation with `layoutMetricsEpoch`.                                                        |
| `src/ui/OasisEditorEditor.tsx`               | Remove `statusDocumentLayout`; use shared `projectedLayout` for total pages, current-page fallback, and viewport-page recomputation effects.                                                                                       |
| `src/ui/canvas/CanvasLayoutSnapshot.ts`      | Change `buildCanvasLayoutSnapshot` to take `documentLayout`; remove the internal `projectDocumentLayout` call and import.                                                                                                          |
| `src/ui/canvas/canvasSnapshotTypes.ts`       | Replace measured-map fields in `BuildCanvasLayoutSnapshotOptions` with `documentLayout: EditorLayoutDocument`.                                                                                                                     |
| `src/app/controllers/useEditorLayout.ts`     | Consume shared `projectedLayout` and the shared snapshot provider. Recompute selection/comment geometry every sync, but reuse the snapshot on cache hits.                                                                          |
| `src/ui/app/useCanvasSurfaceHitResolver.ts`  | Replace local snapshot cache with the shared snapshot provider and key policy.                                                                                                                                                     |
| `src/layoutProjection/layoutMetricsEpoch.ts` | New reactive epoch module with `layoutMetricsEpoch` and `bumpLayoutMetricsEpoch`.                                                                                                                                                  |
| `src/layoutProjection/index.ts`              | Re-export the epoch helpers.                                                                                                                                                                                                       |
| Tests                                        | Update snapshot tests to build layout outside `buildCanvasLayoutSnapshot`; add coverage for no projector call, snapshot cache reuse/invalidation, and shared projected layout use by caret + hit-test paths.                       |

## 5. Invalidation Model

| Event                                    | `projectedLayout` recompute?                          | Snapshot rebuild?             | Selection/hit geometry recompute? |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------------- | --------------------------------- |
| Caret move / click without layout change | No                                                    | No on cache hit               | Yes                               |
| Typing / structural edit                 | Yes if document/layout epoch changes                  | Yes                           | Yes                               |
| Measured-height/paragraph reflow         | Yes                                                   | Yes                           | Yes                               |
| Fonts settle / precise-font toggle       | Yes via layout metrics epoch                          | Yes                           | Yes                               |
| Scroll                                   | No                                                    | Yes if rect signature changes | Yes                               |
| Resize / zoom / panel toggle             | No for resize/panel, yes only if layout input changes | Yes                           | Yes                               |
| Status bar refresh                       | No separate projection                                | No snapshot needed            | N/A                               |
| Drag hit-test                            | No on layout cache hit                                | No on snapshot cache hit      | Hit-test reads current state      |

If implementation confirms that `state.document` can mutate in place while its
identity stays stable, the shared projection accessor must also depend on an
explicit document/layout epoch. Do not silently rely on object identity in that
case.

## 6. Implementation Order

1. **Epoch first.** Add `layoutMetricsEpoch.ts`, re-export it, and route font
   cache clear paths through `bumpLayoutMetricsEpoch()`. Keep behavior unchanged
   except for replacing private font-generation as the canonical invalidation.
2. **Shared projection.** Create the runtime/view-model `projectedLayout`
   accessor with the existing canvas measurer and identity stabilizer. Thread it
   to `OasisEditorEditor` and `CanvasEditorSurface`; remove their independent
   projections.
3. **Snapshot takes pre-projected layout.** Update
   `BuildCanvasLayoutSnapshotOptions` and `buildCanvasLayoutSnapshot`; update
   all callers and tests.
4. **Shared snapshot provider.** Extract the dependency-keyed cache and wire it
   into `useEditorLayout` and `useCanvasSurfaceHitResolver`.
5. **Geometry observers.** Add/adjust `ResizeObserver` coverage only where rect
   changes are not already scheduling sync.
6. **Perf verification.** Instrument or spy projection calls to confirm pure
   caret moves and hit-test cache hits do not project, and typing projects once.

Each step is independently shippable and verifiable.

## 7. Verification

- **Unit/integration (Vitest):** keep the existing `CanvasTableLayout`,
  `layoutProjection`, `canvasLayoutSnapshot`, `canvasSelectionGeometry`, and
  `canvasHitTestService` suites green.
- **Snapshot API:** update `canvasLayoutSnapshot` tests so they call
  `projectDocumentLayout` outside the snapshot builder and pass the resulting
  `documentLayout`.
- **No hidden projection:** add a test asserting `buildCanvasLayoutSnapshot`
  does not import or call `projectDocumentLayout` internally.
- **Snapshot cache correctness:** same `surface`, `documentLayout`, `zoomFactor`,
  and `domRectSignature` reuses the same snapshot object; changing any field
  produces a new snapshot.
- **Shared layout integration:** verify caret/selection and canvas hit-test are
  both fed by the same pre-projected layout accessor.
- **Status/current page:** verify total page count and current-page fallback use
  the shared layout and do not trigger a separate projection.
- **Manual perf on real doc:** measure caret repaint/input-to-layout on the
  14-page table-heavy DOCX. Expected: pure caret moves do zero projection;
  typing does one projection, not multiple; hit-test cache hits do not project.
- **Async-font correctness:** after import, place the caret before fonts settle;
  when fonts settle, epoch invalidates the shared layout and the caret
  repositions correctly.

Run at minimum:

```bash
npm test -- --run tests/vitest/__tests__/ui/canvasLayoutSnapshot.test.ts tests/vitest/__tests__/ui/canvasSelectionGeometry.test.ts tests/vitest/__tests__/ui/canvasHitTestService.test.ts
npx tsc --noEmit
npm run build:lib
```

## 8. Risks & Mitigations

| Risk                                                     | Trigger                                                                      | Mitigation                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Stale caret after async layout shift                     | fonts settle, image load, panel toggle moves rects with `reason="selection"` | Use layout metrics epoch plus DOM rect signature; never trust `reason` as invalidation.                        |
| Stable `state.document` identity despite content changes | in-place mutation of Solid store/proxy                                       | Add or consume an explicit document/layout epoch in the shared projection accessor.                            |
| Surface-local context does not reach controllers         | layout source created below `useEditorLayout` or hit-test resolver           | Own `projectedLayout` in the runtime/view-model and pass it down/up through existing accessors.                |
| Duplicate snapshot caches survive                        | `useEditorLayout` and hit-test keep independent cache implementations        | Replace both with one snapshot provider/helper and one key policy.                                             |
| Memo staleness vs DOM                                    | snapshot needs live `getBoundingClientRect`                                  | Keep absolute-geometry pass imperative; memoize only logical projection.                                       |
| Over-invalidation on scroll                              | rect signature changes every scroll tick                                     | Accept rebuilds because they reuse projection; throttle scheduling only if profiling shows DOM reads dominate. |

## 9. Out of Scope

- Incremental/dirty-region projection for only changed blocks/pages.
- Sharing `buildCanvasTableLayout` results across painter, snapshot, revision
  hit-test, and export consumers.
- Virtualizing off-screen page painting.
- Changing PDF/export projection behavior.
