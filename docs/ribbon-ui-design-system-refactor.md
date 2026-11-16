# Ribbon UI Design System Refactor

Status: proposed; implementation and acceptance evidence pending.
Baseline inspected: bd2210f93573fae2d3fe3b51541c6365a8dc778c.
Scope: all classic and simplified ribbon tabs, contextual tabs, plugin contributions and collapsed/nested surfaces. Preserve the document command semantics. Internal presentation contracts may be redesigned without compatibility shims where justified; document any public contribution API changes and update adapters/examples atomically.

## 1. Motivation and evidence

User Safari screenshots (2026-11-15) revealed a blank style gallery, name-only compact preview, Review controls on different vertical bands, a fourth comment row overlapping its caption, misaligned Layout metric fields, and offset Home Font and Paragraph captions. Recent fixes established useful behavior but added group-specific selector overrides, increasing cascade and measurement fragility.

Home screenshot audit: History and Editing should share the two-row rhythm; Paste, Cut, Copy and Format Painter need consistent icon/split geometry; Font has heterogeneous controls and an offset caption; Paragraph has mismatched split widths and needs reserved launcher space; Styles now displays its preview but selection/chevron visual weight and width allocation need review. Disabled History/clipboard actions may be legitimate; inspect state rather than increasing contrast indiscriminately. These are visual observations, not measured browser results.

Read existing docs/ribbon-layout-contract.md, ribbon-office-execution-plan.md, ribbon-office-progress.md, review-ribbon-redesign-plan.md, layout-ribbon-alignment.md and style-gallery-responsive-fix-plan.md before altering the contracts. Inventory every selector, token, group variant and primitive. Preserve existing functional coverage and retire redundant local rules only after equivalent global behavior is tested.

Non-goals: change document formatting semantics, Canvas, CRDT, WASM, history, clipboard payloads, DOCX/PDF representations, or read-only/selection gating merely for visual polish. Existing semantic built-in style internationalization is not to be replaced by name heuristics.

## 2. Architecture and ownership

- Design tokens: one authoritative CSS geometry contract, consumed by all classic ribbon primitives. Export TS dimensions only where algorithms require them; generate or validate paired tokens rather than duplicate numbers.
- Primitives: Button, SplitButton, Menu, Select, MetricField, color splits, Gallery, chevrons, Separator and contextual/custom renderers. These own internal tracks, interaction states, and accessible names.
- Declarative composition: row count, size, column spans, alignment, label priorities and reserved launcher slot. Extend core/pluginUiTypes.ts and UI schema only where needed; model remains framework-independent. Do not place CSS selectors or DOM nodes in core contributions.
- Measurement: intrinsic geometry of all presentations, independent of actual mounted resize state.
- Responsive allocator: pure deterministic budget calculation; owns presentation selection, not semantic command availability.
- Renderer: applies presentation and stable structural attributes; local component/container geometry. No layout dependent on data-testid.
- Auditor: shared live-panel geometry, interaction and performance evidence, not screenshots alone.

Suggested modules under src/ui/components/Toolbar/ribbon/: ribbonGeometry.ts (only algorithmic token contract), ribbonComposition.ts if separation is useful, measureRibbonGroups.ts, ribbonModel.ts and existing RibbonGroup/RibbonRow/RibbonPanel. Split toolbar.css into logical ribbon tokens, structure, primitives and variants only after auditing import order and package build. Avoid unnecessary file proliferation.

## 3. Geometry specification

Initial values taken from current implementation; confirm exact values and revise together if optical testing requires it.

| Token | Target |
| --- | --- |
| Classic command body | 63 CSS px |
| Caption track | 12 px |
| Two-row control height | 30 px |
| Two-row gap | 3 px |
| Three-row control height | 19–20 px, choose a single value with gaps summing to body |
| Normal/small/large icon boxes | 18/16/24 px |
| Chevron slot | one shared token, verify current geometry |
| Inline control gaps | 2–4 px by composition |
| Radius | 3 px |
| Large caption line height | 11 px, maximum two lines |
| Simplified command body | existing 32 px baseline |
| Alignment tolerance | <=1 CSS px; documented rounding exceptions only |

Center every group caption in the available caption track. A max-width on a label does not center its grid item: establish alignment and reserve actual launcher width. Center captions in the usable region where a launcher exists; prevent caption/launcher collisions. Apply identical rules to live and inert measurement surfaces; simplified captions remain hidden as designed.

Use common large-action bands. Example 63 px: 24 icon, 22 caption, 12 chevron, 5 total padding/gap. Non-dropdown buttons reserve a corresponding empty chevron track; do not vertically recenter them simply because their caption has one line. Set icon and caption grid-row explicitly so icon-only variants never auto-place into the label band. Keep split-button main and arrow independently keyboard accessible and aligned. If a different large gallery/body height is required, declare a variant explicitly.

For row controls, distinguish equal height and visual center from equal width. Buttons, selectors, splits with differing intrinsic widths must not be blindly distributed into equal slots. Shared column tracks only for intentional paired actions. Metric groups use shared label/value/unit tracks. Use CSS Grid/subgrid with explicit spans and validated browser support; avoid percentage/intrinsic sizing cycles, implicit fourth rows, over-specific selectors and arbitrary fixed widths for translated labels. For heterogeneous rows preserve meaningful grouping rather than forcing unrelated buttons onto a false column grid.

Geometry applies to regular control states. Hover/pressed/disabled/focus/open may change colors and outlines but never intrinsic widths, heights or hitboxes. Use inset rings or reserved borders. Preserve stable SVG boxes, numerical alignment and text baselines.

## 4. Component refactor

Inventory and migrate:
- primitives/Button.tsx: explicit small/normal/large presentation, stable visual bands, one accessible name, button state derived from command.
- SplitButton.tsx: shared main/chevron sizing and independent action enablement. Main action and menu semantics remain distinct. Preserve clipboard, painter, underline and list behavior.
- Menu.tsx and Popover.tsx: labeled value variant, stable trigger DOM, scoped refs, nested ownership and focus return. Preserve radio/checkbox semantics, avoid hidden active copies.
- Select.tsx: shared heights/padding/chevrons; no accidental width changes when locale, fonts or selected values change.
- MetricField.tsx: reusable label/value/unit track contract, decimal separator and commit-on-blur/Enter unchanged; controls remain reachable in simplified/collapsed presentations.
- ColorPicker.tsx, ColorGrids.tsx and specialized color splits: align swatches and selected-color bars, split boundaries and arrows.
- StyleGallery.tsx and TableStyleGallery.tsx: preserve true style preview at narrow widths, active style and gallery accessibility; use shared selection ring and chevron tokens. Don't resurrect the blank/name-only compact regression.
- ToolbarItemRenderer.tsx / renderers.tsx: map declarative metadata to common primitives, remove duplicated per-control size logic. Custom controls define a documented geometry variant or adapter.

Do not hide a control merely to satisfy a width assertion. Simplified ribbon must expose every previously available action through an explicit menu or dialog, including numeric fields. Avoid changing native controls to fake labels if interaction is lost.

## 5. Composition and layout engine

Inspect RibbonGroup.tsx, RibbonRow.tsx, RibbonPanel.tsx, ribbonModel.ts, measureRibbonGroups.ts, schema/items.ts, defaultToolbar.ts and presets/defaultToolbar/ribbonPlacements.ts.

Propose a typed group layout model: body variant, primary actions, row count, optional column schema, item span, label priority and launcher policy. Verify actual contribution requirements before naming public properties. Keep default two-row layout and explicit three-row/compact arrangements. Use semantic layout roles rather than group ID-specific CSS; scope any unavoidable custom exception to its declared variant. Retain stable contribution IDs and action IDs.

Replace repeated composition lookups by group.id with a consistent resolved composition snapshot; reactive teardown must never expose undefined group or a group belonging to another tab. Validate focus migration and nested popup dismissal on tab changes. Avoid recreating mounted controls on mere width changes. Scope instance identity and portals correctly for multiple editors.

Measurement invariants:
1. Full, compact, collapsed widths are outer border-box values of the same composition and CSS context, including launcher/padding exactly once.
2. Inert clones contain all structural tracks, including the collapsed trigger, and do not mount interactive controllers, dispatch commands or appear in accessible queries. Remove IDs, test IDs and ID-linked references as appropriate. Remove clones synchronously even on exception.
3. Measure CSS intrinsic sizes, never inherit live allocation as a measurement constraint. Keep media/container, theme, locale, simplified/classic context and direct-child selector behavior equivalent. Do not include hidden or portalled content in intrinsic width.
4. Retain fractional sizes to a defined rounding boundary. Budget scroll buttons and padding once. No feedback loop involving previous resize state or dynamically hidden labels.
5. Invalidate on composition, localization, layout tokens, font completion and relevant container changes. Batch reads/writes; benchmark actual idle measurement counts and resize work. Compare against baseline.
6. Width measurements for identical inputs must match across full -> compact -> collapsed -> full, direct mount, different editor instances and mixed contextual tabs.

Keep existing canonical monotonic reduction ladder (compact before collapse, priorities, stable ties, zero-saving state skips), unless profiling proves a replacement is necessary. Preserve history availability and gallery rule that neighbor collapse cannot buy extra cards. Enforce explicit minimum usable width; overflow becomes intentional scrolling, not hidden controls. Use property tests across fractional budgets and varied compositions. Avoid "repair" loops that expand a group as budget decreases.

## 6. Migration by tab

### Home (first vertical slice)
History/Editing: shared two-row icon centering, sensible find/select-all icons; show labels when feasible rather than blanket hiding.
Clipboard: standard large Paste with separate arrow band; align Cut/Copy/Painter main icon centers and reserve Painter chevron without moving the icon.
Font: center caption; consistent heights for family/size and text formatting controls; baseline common icons, color/mark/shading bars and split arrows; reserve launcher.
Paragraph: intentional paired columns and split widths, launcher-safe caption, aligned list/indent/alignment controls. Preserve command discovery and enablement.
Styles: active typographic card remains readable; reduce overly heavy selected border and separate chevron without losing visibility/focus. Review width priorities with evidence, not arbitrary reallocation.

### Layout
Migrate previous metric subgrid to reusable shared track model; ensure values and units line up without fixed locale-specific label widths. Margins/Orientation share icon/caption/chevron bands. Preserve all four metric fields across simplified menu/collapsed state, page setup, section break semantics and units.

### Review
Migrate semantic icon family and previous alignment CSS into declarative three-column layout; comments uses exactly 2/2/3 secondary actions plus two primary actions. Reject implicit extra rows. Tracking display selector and filter share columns; Accept/Reject/bulk commands preserve independent entitlement and confirmation. Test working revisions and active/resolved comments, not only blank document.

### File, Insert, Design, References, View
Inventory every group before change; validate the same caption, icon bands, row height, chevrons, popovers, long labels, galleries and field contracts. Keep feature matrix and IDs current.
### Contextual tabs and plugin contributions
Inventory all active contexts (tables, images and custom/plugin tabs). Test context switches with open popovers/focused controls, invisible/disabled actions, unknown group names, separators, dynamic plugin addition, custom labels and mixed row/spans. Do not hardcode group names into new geometry engine.
### Simplified ribbon and other shells
Ensure 32 px single-row geometry, equivalent command reachability, and no leakage into inline/balloon/compact toolbar shells. Portalled full-size group popup must retain its intended presentation. Test embed with independent sidebar/container width.

## 7. Optical iconography and color

Keep original SVGs, not proprietary Office assets. Audit customIcons.tsx and icon registry, existing review icon family, glyph origin and repeated icons. Design on shared logical viewBox, inspect actual painted bounds at 16/18/24 px, normalize stroke and optical center, not just SVG bounding boxes. Semantic accents on meaningful icons only; disabled state follows command, theme and contrast. Preserve monochrome readability. No global opacity override that masks enablement bugs.
Validate light/dark, keyboard focus, active selection and high contrast/forced colors where available. Update icon inventory using supported audit scripts and parity manifest. Capture actual icon atlas at rendered sizes, with baseline comparison.

## 8. Global geometry auditor

Add one reusable script/module (e.g. scripts/lib/ribbon-geometry.mjs and scripts/verify-ribbon-geometry.mjs) to discover visible active tab groups through the real panel. Avoid global queries matching inert/hidden controls or popup duplicates. Collect component metadata, computed styles and rects, logical row/column assignments, owning group, actual clip ancestry and whether a command is reachable.

Assertions:
- group caption centered in usable track within 1 px, with launcher collision check;
- row/large-action band height, icon and caption center alignment; chevron track alignment;
- no implicit extra rows, no overlapping interactive siblings or caption overflow;
- no clipping in available inline presentation; distinguish intended panel scroll from unintended content clipping and expected text ellipsis;
- no disappearing commands: compare enabled/disabled and reachable command identities, including nested group menus;
- no duplicate actionable IDs or inaccessible controls; preserve accessible names, focus order and Escape behavior;
- measured/allocated/rendered width agreement within documented rounding tolerance;
- stable geometry over consecutive animation frames and across resize cycle, no idle observer churn;
- viewports independent of host width, correct popup bounds and scroll accessibility.

Explicitly declare legitimate exceptions (decorative overlays, disabled states, scroll containers and long-label ellipsis) with reason and test, not overly broad ignores. Fail on undefined elements or missing required coverage. Record actionable test ID/semantic ID, tab/group, engine, theme, locale, host size and expected/actual rect on failure. Capture screenshots on success and failure; artifacts + machine-readable JSON.

Use existing scripts/lib/ribbon-suite.mjs, verify-ribbon-reference/resize/contexts/icons/style-gallery/review-layout/layout-alignment and fixture infrastructure. Factor duplicated geometry checks and add a single orchestrated geometry suite, but do not replace functional assertions. New suite must cover all tabs from actual composition, including contextual fixtures, not just hardcoded Home.

Matrix: Chromium/Firefox/WebKit; real Safari separately. en/pt-BR, light/dark, classic/simplified, full/compact/collapsed, 1440/1280/1152/1040/960/800/640/480 CSS px; independently resize host at fixed viewport. Directed tests at fractional thresholds, DPR and zoom-equivalent 125/150/200%, late fonts, locale/theme change, multi-editor, plugin insertion/removal and open popup transitions. Use small PR smoke matrix + full matrix for main/nightly if runtime requires; acceptance requires full matrix, not only PR sample. Capture baseline and final screenshots in comparable fixtures with enabled and disabled actions. WebKit Linux does not certify real Safari.

## 9. Functional, performance and release gates

Preserve tests/vitest/__tests__/core/ribbonResize.test.ts, ribbonComposition.test.ts, ribbonCommandRegistrations.test.ts and UI defaultRibbonParity, ribbonPanelPopups, contextual transition, copy/read-only and object-selection tests. Add pure property tests for geometry model and measured-width invariance. Add integration tests for stable trigger/selection, independent split scope, keyboard access and adapter contracts. Retain existing style-gallery, clipboard, painter, formatting, review/comments, paragraph, references, file, view, editing, quickaccess and DOCX roundtrip checks.

Current repository commands:
    npm run typecheck
    npm run lint
    npm run check:imports
    npm run check:native-ui
    npm test
    npm run audit:ribbon
    npm run audit:ribbon:icons
    npm run test:ribbon:ci
    npm run build
    npm run test:smoke

Add a dedicated geometry command and cross-engine runner; use existing npm/Vite lifecycle, no parallel test server infrastructure. Integrate into required release gates, including demo and npm publication ordering. Do not publish a version that failed required new gates; document any current workflow policy change before implementation. Use staged atomic commits; no disabling audit or skipping failing engines to make deployment green. Report actual test results per commit and deployed Pages SHA. Compare measurement count, layout cost and resize responsiveness to baseline; do not claim performance gains until measured.

## 10. Delivery sequence

P0: inventory baseline; reproduce current visual defects and ensure current CI failures understood; add focused failing checks.
P1: central tokens, caption/launcher contract, stable panel composition and measurement tests.
P2: migrate button/menu/split/select/color primitives and Home vertical slice with screenshots.
P3: metric/gallery variants, Layout/Review cleanup; remove obsolete per-group fixes after verified equivalence.
P4: migrate remaining and contextual tabs, plugin contribution metadata and simplified shell.
P5: icon atlas, locale/accessibility/state verification, global auditor and performance comparison.
P6: integrate full cross-engine CI, inspect visual evidence, publish, verify Pages and real Safari.
Each stage must keep a reviewable diff and run appropriate checks before advancing.

## 11. Acceptance checklist

- [ ] All classic group captions centered with launcher clearance.
- [ ] Shared icon/label/chevron tracks for all large action variants.
- [ ] Shared metric columns; no missing numeric actions in simplified/collapsed.
- [ ] No misplaced fourth row, clipping, overlap or blank style previews.
- [ ] Every command reachable at supported sizes, with correct selection/read-only scope.
- [ ] Deterministic finite responsive allocation and stable intrinsic widths independent of state.
- [ ] No observer loops, hidden interactive copies, focus loss or duplicate accessible control identities.
- [ ] Plugin/custom controls can use shared composition metadata without custom geometry CSS.
- [ ] All tabs, locales, themes and presentations covered by geometry and functional suites.
- [ ] Chromium/Firefox/WebKit full matrix passes and screenshots inspected.
- [ ] Real Safari demo verified or clearly recorded as not yet certified.
- [ ] Docs, parity data, changelog and release/deploy evidence updated.

Decisions: preserve established command semantics and reduction invariants; reuse existing token values unless measured evidence warrants change; prefer declarative composition over CSS selectors keyed by group IDs. No code implementation or validation result is claimed by this document.
