# Layout Projection Unification & Caret-Latency Plan

> Status: proposal / not yet implemented.
> Scope: the canvas layout/projection pipeline and selection geometry.
> Compatibility: **greenfield** — we deliberately change internal function
> signatures and component wiring. No backward-compat shims.

## 1. Problem

Editing a table-heavy document (e.g. `documento_casos_uso_parcelamento_v2_1.docx`,
14 pages, ~296 blocks, dozens of tables) feels sluggish, and the blinking caret
lags after typing or clicking.

Root cause: **the document is fully projected twice per interaction, by two
independent consumers that do not share work.**

```diagram
                          ╭───────────────────────────╮
   state.document ───────▶│ CanvasEditorSurface        │
   measured maps          │   documentLayout = memo(   │──▶ projectDocumentLayout ──▶ render pages
   fontsGeneration        │     projectDocumentLayout) │
                          ╰───────────────────────────╯

                          ╭───────────────────────────╮
   selection / caret ────▶│ useEditorLayout            │
   scroll / resize        │   syncInputBox()           │──▶ buildCanvasLayoutSnapshot
   content-change         │     (queueMicrotask)       │        ├─ projectDocumentLayout  (AGAIN)
                          ╰───────────────────────────╯        ├─ buildCanvasTableLayout (every table)
                                                                └─ getBoundingClientRect (every page)
                                                                      │
                                                                      ▼
                                                      computeCanvasSelectionGeometry(snapshot, state)
                                                      computeCommentHighlights(snapshot, state)
```

Key facts (verified in code):

- [`CanvasEditorSurface.tsx`](../src/ui/components/CanvasEditorSurface.tsx) builds a
  `documentLayout` `createMemo` by calling `projectDocumentLayout`.
- [`CanvasLayoutSnapshot.ts`](../src/ui/canvas/CanvasLayoutSnapshot.ts)
  (`buildCanvasLayoutSnapshot`) calls `projectDocumentLayout` **a second time**,
  then walks every page and calls `buildCanvasTableLayout` for every table to
  produce an absolute-coordinate geometry snapshot.
- [`useEditorLayout.ts`](../src/app/controllers/useEditorLayout.ts) invokes
  `syncInputBox` (which builds the whole snapshot) on **every** selection change,
  caret move, scroll, resize, and content change.
- The snapshot is **selection-independent**: only `computeCanvasSelectionGeometry`
  and `computeCommentHighlights` read selection. So a pure caret move rebuilds the
  entire document snapshot just to reposition the caret.

Consequence: a click or arrow-key press triggers a full re-projection +
all-table layout + per-page DOM measurement, even though nothing about the
document layout changed.

## 2. Goals & principles

1. **Project once per layout-relevant change.** `CanvasEditorSurface` and
   selection geometry must consume the *same* projected `EditorLayoutDocument`.
2. **Separate the two dependency classes** the snapshot conflates:
   - **Logical layout** (pure, deterministic): depends on `document`, measured
     maps, font/measurement generation, default tab stop, hyphenation. Zoom- and
     DOM-independent.
   - **Absolute geometry** (impure): depends on live DOM page rects
     (`getBoundingClientRect`), surface origin, and zoom.
3. **Caret/selection moves do zero projection work.** They only re-derive
   selection geometry from an already-valid snapshot.
4. **Scroll does not re-project.** Scrolling only changes absolute page offsets;
   it must reuse the cached logical projection and re-apply offsets cheaply.
5. **Correctness comes from explicit dependency keys, never from the `reason`
   string.** (`reason` is a hint for scheduling, not an invalidation boundary.)

## 3. Target architecture

```diagram
                 ╭──────────────────────────────────────────────────────────╮
                 │ Shared reactive layout source (new)                       │
                 │                                                           │
 document ──────▶│  projectedLayout = createMemo(() =>                        │
 measured maps   │      projectDocumentLayout(document, …, measured…))        │──┐
 layoutEpoch ───▶│  // logical only; NO dom, NO zoom                          │  │
                 ╰──────────────────────────────────────────────────────────╯  │
                                                                                 │
        ┌────────────────────────────────────────────────────────────────────┘
        │ projectedLayout (EditorLayoutDocument)
        ▼
 ╭────────────────────────╮         ╭──────────────────────────────────────────╮
 │ CanvasEditorSurface     │         │ buildCanvasLayoutSnapshot(projectedLayout, │
 │   <Index pages>         │         │   surface, state, zoom)                    │
 │   (paints pages)        │         │   // applies DOM rects + zoom only         │
 ╰────────────────────────╯         ╰──────────────────────────────────────────╯
                                                   │ snapshot (absolute geometry)
                                                   ▼
                              computeCanvasSelectionGeometry(snapshot, state)
                              computeCommentHighlights(snapshot, state)
```

### 3.1 One shared projection

Introduce a single source of truth for the projected layout — a Solid
`createMemo` (or a small reactive resource) that owns `projectDocumentLayout`.
Both the page renderer and the snapshot builder read it. Place it where both can
consume it (e.g. an `EditorLayoutContext` provided around the surface, or hoist
it into the component that owns both `CanvasEditorSurface` and
`useEditorLayout`).

The memo depends on:

- `state.document`
- `measuredBlockHeights()`
- `measuredParagraphLayouts()`
- `layoutMetricsEpoch()` (font/measurement generation — see §3.4)
- document settings that affect projection (default tab stop, hyphenation) —
  already inside `document`.

It must **not** depend on zoom, scroll, or DOM rects.

### 3.2 `buildCanvasLayoutSnapshot` consumes a pre-projected layout

Change the signature so the snapshot never projects:

```ts
// before
buildCanvasLayoutSnapshot({ surface, state, measuredBlockHeights,
  measuredParagraphLayouts, zoomFactor })

// after
buildCanvasLayoutSnapshot({ surface, state, documentLayout, zoomFactor })
```

`documentLayout` is the shared `projectedLayout()`. Internally the function drops
its `projectDocumentLayout(...)` call and keeps only the DOM-rect + zoom +
per-table-geometry passes. (`buildCanvasTableLayout` stays, but now its cell
paragraph shaping is already cache-hot from the shared projection and the table
cell paragraph cache.)

### 3.3 Snapshot caching keyed on dependencies (not `reason`)

In `useEditorLayout`, keep the last snapshot plus the exact inputs that produced
it. Reuse when **all** match; otherwise rebuild:

```ts
interface SnapshotCacheKey {
  surface: HTMLElement;              // element identity
  documentLayout: EditorLayoutDocument; // shared memo identity (covers doc + measured + epoch)
  zoomFactor: number;
  domRectSignature: string;          // surface rect + sorted page rects (rounded)
}
```

- `documentLayout` identity already folds in document, measured maps, and the
  layout metrics epoch (because the shared memo recomputes when any of those
  change). So we do not need to list those separately.
- `domRectSignature` = surface `getBoundingClientRect()` plus each
  `[data-renderer="canvas"][data-page-index]` element's index + rounded
  `left/top/width/height`. This makes **scroll/resize/panel-toggle/browser-zoom**
  correctly invalidate without trusting `reason`.
- On a pure caret move: `documentLayout` identity, zoom, and rect signature are
  all unchanged → snapshot reused → only selection geometry recomputed.

`computeCanvasSelectionGeometry` and `computeCommentHighlights` are **always**
recomputed from the (possibly cached) snapshot using current `state`.

### 3.4 Layout metrics epoch (font/measurement generation)

Async font loading and precise-font-mode changes mutate global measurement caches
(`clearTextMeasureCache`, `clearNormalLineHeightCache`,
`clearProjectedParagraphLayoutCache`) and bump `fontsGeneration` inside
`CanvasEditorSurface`. The snapshot/projection layer must observe this.

Introduce a single global, reactive **layout metrics epoch**:

- A module-level counter incremented whenever projection/measurement caches are
  cleared (centralize the increment in `clearProjectedParagraphLayoutCache` and
  the font-ready path).
- Exposed as a Solid signal (`layoutMetricsEpoch()`), read by the shared
  projection memo.
- This replaces the ad-hoc, component-local `fontsGeneration` signal as the
  canonical invalidation token; `CanvasEditorSurface` reads the same epoch.

Result: when fonts settle, the shared memo recomputes once, the snapshot cache
key (via `documentLayout` identity) changes, and the caret is repositioned with
correct metrics — no stale-geometry window.

### 3.5 Scroll/resize without re-projection (stretch, but enabled by §3.1–3.2)

Because logical projection is now separate from absolute geometry, scrolling only
changes `domRectSignature`. The snapshot rebuild on scroll **reuses the shared
`projectedLayout()`** (no re-projection) and only re-applies page rects + zoom.
That removes the current full re-projection-per-scroll cost too.

Optionally add a `ResizeObserver` on the editor surface/viewport/page-stack that
calls `requestInputBoxSync("resize")`, so container/panel geometry changes that
don't emit `window.resize` still refresh the rect signature.

## 4. Concrete changes (by file)

| File | Change |
|---|---|
| `src/layoutProjection/paragraphProjection.ts` | Add module-level epoch counter; increment inside `clearProjectedParagraphLayoutCache`. Export `getLayoutMetricsEpoch()`. |
| `src/layoutProjection/index.ts` | Re-export `getLayoutMetricsEpoch` (+ any new epoch helpers). |
| `src/text/fonts/…` / new `layoutMetricsEpoch` module | Provide a reactive `layoutMetricsEpoch()` signal + `bumpLayoutMetricsEpoch()`; call the bump wherever measurement caches are cleared. |
| `src/ui/components/CanvasEditorSurface.tsx` | Stop owning a private `fontsGeneration`; read the shared epoch. Consume the **shared** `projectedLayout()` instead of calling `projectDocumentLayout` directly. |
| New: shared layout source | A `createMemo`/context that calls `projectDocumentLayout` once, depending on document + measured maps + epoch. Provided to both the surface and `useEditorLayout`. |
| `src/ui/canvas/CanvasLayoutSnapshot.ts` | `buildCanvasLayoutSnapshot` takes `documentLayout` as input; remove its internal `projectDocumentLayout` call. |
| `src/app/controllers/useEditorLayout.ts` | Consume shared `projectedLayout()`. Add dependency-keyed snapshot cache (surface, layout identity, zoom, rect signature). Reuse on pure selection changes. Always recompute selection + comment geometry. Optionally add `ResizeObserver`. |
| `src/ui/canvas/CanvasSelectionGeometry.ts`, `CanvasCommentGeometry.ts` | Unchanged API; just fed the cached snapshot. |

## 5. Invalidation model

| Event | `projectedLayout` recompute? | Snapshot rebuild? | Selection geometry recompute? |
|---|---|---|---|
| Caret move / click (no doc change) | No | No (cache hit) | Yes |
| Typing / structural edit | Yes (document identity changed) | Yes | Yes |
| Measured-height/paragraph reflow | Yes (measured map identity changed) | Yes | Yes |
| Fonts settle / precise-font toggle | Yes (epoch changed) | Yes | Yes |
| Scroll | No | Yes (rect signature changed) — reuses projection | Yes |
| Resize / zoom / panel toggle | No | Yes (rect signature / zoom changed) | Yes |

## 6. Implementation order

1. **Epoch first.** Add the reactive layout metrics epoch and route all cache
   clears through `bumpLayoutMetricsEpoch()`. Switch `CanvasEditorSurface` to read
   it. (No behavior change yet; verifies the epoch fires correctly.)
2. **Shared projection.** Introduce the single `projectedLayout()` memo/context;
   make `CanvasEditorSurface` consume it. Verify rendering unchanged.
3. **Snapshot takes pre-projected layout.** Change
   `buildCanvasLayoutSnapshot` signature; feed it `projectedLayout()`. This alone
   removes the duplicate projection.
4. **Snapshot cache.** Add the dependency-keyed cache in `useEditorLayout`; reuse
   on pure selection changes.
5. **(Stretch)** `ResizeObserver` + verify scroll no longer re-projects.

Each step is independently shippable and verifiable.

## 7. Verification

- **Unit/integration (vitest):** existing `CanvasTableLayout`,
  `layoutProjection`, `canvasLayoutSnapshot`, `canvasSelectionGeometry` suites
  must stay green. Add a test asserting `buildCanvasLayoutSnapshot` does not call
  `projectDocumentLayout` (inject/spy the projector).
- **Caret correctness:** snapshot-cache test — same document + rects + zoom →
  identical snapshot object reused; changing any key field → new snapshot.
- **Perf (manual, real doc):** measure `input-to-layout` and caret repaint on the
  14-page doc. Expect: pure caret moves do ~0 projection; typing does exactly one
  projection (shared), not two.
- **Async-font correctness:** after import, before fonts settle, click to place
  caret; when fonts settle, caret must reposition (epoch invalidates cache).

## 8. Risks & mitigations

| Risk | Trigger | Mitigation |
|---|---|---|
| Stale caret after async layout shift | fonts settle, image load, panel toggle moves rects with `reason="selection"` | rect signature + layout metrics epoch in cache key (don't trust `reason`) |
| `state.document` is a mutable store proxy (identity stable while content changes) | in-place mutation | drive projection memo off an explicit document/layout epoch if identity isn't replaced on edit |
| Memo staleness vs DOM | snapshot needs live `getBoundingClientRect` | keep absolute-geometry pass imperative; only the *logical* projection is memoized |
| Over-invalidation on scroll | rect signature changes every scroll tick | acceptable: rebuild reuses shared projection (cheap); optionally throttle scroll sync |

## 9. Out of scope (future)

- Incremental/dirty-region projection (only re-project changed blocks/pages).
- Sharing `buildCanvasTableLayout` results across painter, snapshot, and revision
  hit-test consumers.
- Virtualizing off-screen page painting.
