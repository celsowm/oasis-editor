# Responsive Style Gallery — correction and regression plan

Status: planned; implementation and browser reproduction pending.
Target: `main`. Scope: reusable editor UI, not the demo alone.
Reported 2026-11-15: Safari on macOS, Portuguese demo with sidebar open; Heading 1 is applied and highlighted in the expanded gallery, but its inline strip is blank.

## 1. Evidence and diagnosis

- [StyleGallery.tsx](../src/ui/components/Toolbar/StyleGallery.tsx) computes visible slots with `Math.max(0, Math.floor(strip.clientWidth / 106))`. A strip narrower than 106 CSS px renders no cards. Initial slot count, observer delivery and integer rounding must be investigated.
- [toolbar.css](../src/ui/components/Toolbar/toolbar.css) uses 106 px card basis, 24 px expand button, 2 px total gallery border, 58 px height, and a compact width of 132 px by default. This leaves exactly 106 px for one card at the nominal minimum: no tolerance for other CSS or fractional dimensions.
- [ribbonModel.ts](../src/ui/components/Toolbar/ribbon/ribbonModel.ts) computes whole-card allocations using separate constants and measured chrome; [RibbonGroup.tsx](../src/ui/components/Toolbar/ribbon/RibbonGroup.tsx) subtracts group chrome from the allocation; [measureRibbonGroups.ts](../src/ui/components/Toolbar/ribbon/measureRibbonGroups.ts) measures inert copies and rounds group widths. These contracts must agree. Do not assume the exact measured Safari width until reproduced.
- The inline strip uses `styles().slice(0, visibleSlots())`; an applied style outside the prefix therefore has no inline representation.
- The compact native select already has a fallback for styles outside quick styles, but is hidden in the ribbon mode shown in the report. The blank strip is distinct from a native select with no matching option.
- The expanded panel uses bottom-end placement and a width capped at 660 px. Leftward expansion is intentional in some layouts; it is not itself evidence of a positioning defect. Judge geometry relative to the owning editor and viewport.
- Built-in labels are currently rendered from style.name. Localize presentation only after distinguishing built-ins from arbitrary imported style names.

## 2. Reproduce before changing behavior (P0)

1. Record the baseline commit, Safari version, CSS viewport, device pixel ratio, zoom, locale, ribbon state, sidebar width, and editor container dimensions.
2. Recreate the demo with sidebar open and Heading 1 applied. Add an embedded fixture with independently resizable host container, not merely a smaller browser window.
3. Log group allocated/measured width, compact chrome, gallery and strip bounding rectangles, clientWidth, computed borders and button width, observer deliveries, visibleSlots, rendered card count, active paragraph/character IDs and panel rectangle.
4. Reproduce the failure at widths immediately below/at/above the nominal card threshold. Include fractional widths, initial mount, resize from full and direct mount at narrow width.
5. Add a failing browser regression: an enabled gallery with available styles in an inline presentation must render a readable card or an explicit usable compact trigger, never a blank white strip. Assert the applied style remains represented when a card is shown.
6. Save baseline screenshots and geometry JSON. Distinguish a verified failure from a hypothesized cause.

## 3. Shared layout contract (P0)

Introduce an internal pure module such as `styleGalleryLayout.ts` for preferred card width, minimum readable width, button width, border accounting and capacity calculation. Keep a single source of truth between TS and CSS (e.g. CSS custom properties populated from shared metrics, or explicit measurement plus documented fallback). Do not publish a new public API.

- Separate group outer width, gallery border-box width and usable strip content width. Account for chrome exactly once. Use fractional measurement consistently with CSS sizing; avoid rounding at multiple boundaries.
- Preserve the existing ribbon priority rules, including the invariant that collapsing a neighboring group never buys extra style cards, and no group expands as the available budget shrinks.
- At full width show as many whole preferred-size cards as fit. At intermediate widths show fewer whole cards. For one-card compact mode permit a flexible card within a validated readable minimum; 80 px is an initial experiment, not a fixed requirement.
- Below the minimum, coordinate with the ribbon allocator to use its existing collapsed group trigger or an explicit labeled fallback. Never force a card larger than its allocated space.
- Retain a usable expand trigger and avoid clipping. Define behavior for no styles (explicit empty state), no enabled styles (disabled), and initial/unmeasured/hidden strip (do not confuse temporary zero width with no available styles).
- Observe the actual strip/container; handle resize of the sidebar, reveal, theme and font changes. Avoid observer feedback loops, unnecessary state updates and measurement clones remaining in the live DOM.
- Existing defaults, custom ribbon configurations, compact toolbar native select and simplified ribbon must remain supported.

Candidate pure result: { visibleSlots, cardWidth, presentation: 'full' | 'compact' | 'collapsed' }. Let the ribbon engine own group collapse; the component only reports/uses its allocated presentation.

## 4. Active style representation (P0)

Implement a pure visible-window resolver over the ordered quick style list. Maintain the canonical list and IDs; follow the active style in the inline window without mutating document styles or reordering the expanded gallery. With two slots and active Heading 3, show Heading 2 / Heading 3 rather than always Normal / Heading 1. With one slot, prefer the active style.

- Establish deterministic paragraph versus character precedence consistent with the existing compact select, including both active simultaneously.
- Distinguish no active ID, mixed selection, unknown ID, filtered-out/non-quick style, and no available styles. Do not invent an applied style for mixed selection.
- Generalize or reuse compactStyleFallback for known active non-quick styles; preserve the true type and formatting when available. Unknown IDs receive a safe explicit fallback, never a fictitious actionable style.
- Keep disabled per-family behavior, read-only state, command guards, selection preservation, undo/redo and editor focus unchanged.
- Recompute reactively when selection, document styles, width or locale changes; no command execution from passive updates.

## 5. Expanded gallery positioning (P1)

Use the existing Popover and usePopoverPosition primitives. Prefer a scoped or opt-in positioning extension so unrelated dropdowns remain unchanged.

- Choose panel width from style count, readable column sizes, anchor geometry, editor bounds and viewport. Prefer below the ribbon; clamp to available bounds with a documented viewport fallback when the host is smaller than a usable menu. Preserve the ability to extend left when necessary.
- Use responsive columns and bounded vertical scrolling. Keyboard navigation must use actual rendered columns; handle scroll, resize, fractional DPR, nested menus and short viewports.
- Measure after mount and on relevant size changes; prevent visible first-frame jumps, stale callbacks, detached anchors and leaking observers. Preserve portal theme inheritance and parent dismissal semantics.
- Verify that anchor and expanded panel do not unexpectedly overlap the ribbon, and that all interactive content is accessible even near viewport edges.
- Replace global test-ID selectors for style-gallery focus with instance-local refs; preserve Escape, focus return, read-only revocation and selection restoration. Test two editors with identical test IDs.

## 6. Localization (P1)

Use existing translation infrastructure for display labels of positively identified built-in styles: Normal, Heading 1–9 (Título 1–9), Caption (Legenda), Title (Título), Subtitle (Subtítulo), Strong (Forte), Emphasis (Ênfase), Quote (Citação). Validate the actual built-in inventory and terminology before adding keys.

Do not translate custom styles merely because their names resemble built-ins. Preserve style ID, OOXML name, metadata, qFormat, uiPriority, inheritance, and import/export representation. If provenance is ambiguous, preserve the original label. Apply translation consistently to cards, select options, accessible labels and tooltips; update on locale change.

## 7. Tests and evidence

Extend existing tests rather than introducing parallel infrastructure:

| Existing suite | Added coverage |
| --- | --- |
| tests/vitest/__tests__/ui/styleGallery.test.tsx | exact/fractional width boundaries, observer lifecycle, active window, no styles, disabled families, selection changes, duplicate instances |
| tests/vitest/__tests__/ui/styleGalleryFallback.test.ts | hidden/non-quick, unknown/mixed active styles, presentation fallback |
| tests/vitest/__tests__/core/ribbonResize.test.ts | chrome accounting, card-width boundaries, monotonic reduction, direct mount/resize parity, custom policies |
| tests/vitest/__tests__/import/styleGalleryMetadata.test.ts | imported names, built-in detection, metadata and round-trip invariants |
| tests/vitest/__tests__/ui/ribbonPanelPopups.test.tsx | nested positioning and dismissal, focus isolation |
| scripts/verify-ribbon-resize.mjs | sidebar + host-width regression, direct/resize parity, DPR/zoom and geometry |
| scripts/verify-ribbon-colors-styles.mjs | active inline representation, paragraph/character commands, read-only, selection, undo/redo and DOCX self-reimport |
| scripts/verify-ribbon-reference.mjs | visual parity and screenshot evidence |

Browser matrix: Chromium, Firefox, Playwright WebKit; real Safari on macOS when available (WebKit is not a guarantee of Safari equivalence). English and pt-BR, light/dark themes, full/compact/collapsed/simplified modes, compact native select, narrow embedded editor in wide viewport, sidebar transitions, multiple editors, viewport edges, zoom-equivalent 125/150/200%, DPR 1.25/1.5/2. Probe every card boundary with fractional widths. Test keyboard arrows, Home/End/Escape and focus on apply.

Run existing commands (inspect suite configuration for engine selection):
```sh
npm run typecheck
npm run lint
npm test
npm run test:ribbon:resize
npm run test:ribbon:colors-styles
npm run test:ribbon:browser
npm run test:ribbon:ci
npm run audit:ribbon
npm run build
```

Capture baseline/final screenshots and machine-readable geometry; record commit, browser, run commands and failures. Do not mark unexecuted tests as passing.

## 8. Delivery order

- test(ribbon): reproduce blank compact style gallery
- refactor(ribbon): centralize style gallery geometry
- fix(ribbon): preserve active style in compact layouts
- fix(ui): adapt style gallery popover positioning
- fix(i18n): localize built-in document style labels
- fix(ui): isolate style gallery focus across editors
- test(ribbon): cover responsive style gallery regressions
- docs(ribbon): document style gallery layout contract

Keep edits in editor UI and tests. No Canvas, CRDT, WASM, document engine or public API change is intended. Update ribbon layout contract, progress/parity documentation and changelog as appropriate. Publish the demo through the existing deployment workflow only after validation; verify the deployed demo separately.

## 9. Acceptance gates

- [ ] Baseline failure reproduced and fixed by a targeted regression.
- [ ] No enabled inline gallery with available styles renders a blank strip.
- [ ] Active style is represented in compact presentation; mixed/unknown styles have truthful fallback.
- [ ] No clipped cards, overflow or nonmonotonic resize; no idle measurement copies or observer loops.
- [ ] Expanded panel remains accessible and stable within documented bounds.
- [ ] Native/compact/simplified/collapsed modes remain usable.
- [ ] Native style labels follow locale; custom style names and DOCX metadata remain unchanged.
- [ ] Selection, command scope, read-only, history and DOCX round-trip behavior remain intact.
- [ ] Multiple editor instances maintain independent focus and state.
- [ ] Existing and new checks pass; screenshots and geometry evidence are attached.
- [ ] WebKit regression passes; real Safari verification is performed or explicitly recorded as outstanding.
- [ ] Published demo verified with sidebar open at the reported layout.

No implementation or test result is claimed by this plan.
