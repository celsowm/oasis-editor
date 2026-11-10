# Office Ribbon execution progress

This is the delivery ledger for the [execution plan](ribbon-office-execution-plan.md). The full M0–M5 objective remains active. Presentation, command semantics, and file persistence are independent evidence dimensions. No milestone is complete yet.

## Delivery 1 — reproducible host and immediate presentation fixes

Reference: classic Office group naming and navigation; the historical WordCraft/Word web comparison informs the initial defects. These changes do not assert document-feature parity.

| Ticket | Status | Implemented / evidence | Remaining acceptance |
| --- | --- | --- | --- |
| B01 | partial | Corrected the stale 29-feature scope to the current 38-feature static slice. `scripts/ribbon-parity/references.json` triages all 21 historical categories with separate exposure/semantics/persistence fields. Historical SHAs remain historical. | Inspect current command paths and assign verified capability-specific statuses; do not promote features from registration alone. |
| B02 | partial | `tests/browser/ribbon/` mounts the actual editor without site/sidebar padding. `scripts/capture-ribbon-reference.mjs` rejects width mismatches and records SHA, dirty state, scenario, browser, theme, locale, DPR, fonts, measured width, group sizes and unresolved placeholders. 180 Chromium ribbons across nine tabs, five actual widths, two themes and two locales. | Contextual tabs, every popup, late fonts, scale/zoom and repeatable performance baselines. |
| B03 | partial | Synthetic HTML fixtures for styled text, links, lists, tables and an inline image; persistence and remote web fonts disabled in the reference host. | Section/review fixtures, deterministic selection/context setup, font fingerprint and fixture content hashing. Only the text fixture has been exercised by the automated capture matrix. |
| B04 | complete | All 53 historical scenes classified as equivalent command, related task, or no captured counterpart in `references.json`. All 53 explicitly require direct Word verification; no submenu is certified from its screenshot. | Actual Word submenu captures belong to subsequent evidence gathering. |
| V01 | partial | Built-in Header & Footer and Sort labels resolve in en/pt-BR. Contributions can supply `groupLabel`; unmapped groups use localized General rather than an internal identifier. Model tests cover both locales; browser checks exercise Insert. | Exercise all plugin/contextual presets and audit remaining labels. |
| V02 | partial | Reactive visible items feed Ribbon composition and tabs. Empty nested groups and orphan/duplicate row separators disappear; disabled actions remain. Five pure regression tests cover composition and labels. Insert's empty Accessibility group is absent in browser checks. | Exercise image/table selection transitions, dynamic plugins, separator changes and measurement invalidation under the new responsive planner. |
| V03 | partial | Separate typography samples and readable labels; only whole cards enter the strip; responsive expanded grid; theme tokens replace fixed light/dark chrome. Portal menus inherit the owning editor's theme tokens and host overrides. Browser checks cover strip bounds, expanded background, keyboard movement and Escape/focus restoration. | Long localized/custom style names, mixed selections, command application/undo, multiple editor instances, VoiceOver and visual review of all preview properties. |
| I01 | partial | `scripts/audit-ribbon-icons.mjs` generates `scripts/ribbon-parity/icons.json`: 125 literal names, 163 uses, 28 custom renderers and 11 dynamic expressions. No unresolved static literal names. Origin/license recorded. | Associate every command/size and inspect dynamic/plugin/direct renderer paths. |
| I02 / I07 | partial | Capture manifests record unresolved Lucide placeholders; none in the 180 text/caret ribbons. A static audit fails on invalid literal names or stale generated inventory. | Invisible/clipped/empty SVGs, all popup and contextual families, appearance baselines and dynamic plugin contributions. |
| A05 | partial | Arrow keys, Home and End now move focus to the selected tab. Active tabs scroll into view without forcing keyboard focus on context changes. Browser checks exercise arrows/End at 640 px. | Context transitions, extension removal, VoiceOver, touch and a reviewed overflow affordance. |

Relevant implementation areas: `ribbonModel.ts`, `Toolbar.tsx`, the toolbar schema/plugin adapter, `bindItem.ts`, `RibbonTabs.tsx`, `StyleGallery.tsx`, `Popover.tsx`, and scoped toolbar CSS.

### Reproduce

Start the existing Vite development server, then run:

```sh
node scripts/audit-ribbon-icons.mjs
node scripts/capture-ribbon-reference.mjs
node scripts/verify-ribbon-reference.mjs
RIBBON_BROWSER=firefox node scripts/verify-ribbon-reference.mjs
RIBBON_BROWSER=webkit node scripts/verify-ribbon-reference.mjs
```

The host is at `/tests/browser/ribbon/?theme=dark&locale=pt-BR&fixture=text`. Supported fixtures currently are `text`, `lists`, `table`, and `image`. Capturing currently uses only `text`; the fixture selector does not establish contextual coverage.

`RIBBON_BASE_URL`, `RIBBON_OUTPUT`, `RIBBON_BROWSER`, `RIBBON_WIDTHS`, `RIBBON_THEMES`, and `RIBBON_LOCALES` configure captures. Outputs remain gitignored under `debug_artifacts/`. Browser verification covers four theme/locale combinations per engine. WebKit automation is separate from Safari/VoiceOver validation.

### Validation recorded

- TypeScript: passed.
- Changed TypeScript/TSX files: ESLint passed.
- Non-UI Vitest: 249 files passed, one skipped; 1,456 tests passed, one skipped.
- Ribbon wiring audit: 38 mapped features, 313 built-ins, 138 scanned items; passed.
- Chromium, Firefox and WebKit: gallery/composition/keyboard checks passed in light/dark and en/pt-BR (12 combinations).
- Actual Safari 27.0.1: reference host ready; viewport and Ribbon both 1470 px; expanded gallery and Ribbon both `rgb(36, 36, 36)` in dark mode; no unresolved placeholders. This is a targeted DOM check, not a VoiceOver or full workflow pass.
- Existing global lint and TSX harness limitations remain separate from these scoped checks.

### Known remaining regressions

Delivery 1 established that Paragraph collapsed at 1200 px and returned at 960 px, while Editing could regain a less reduced state at narrower widths. Delivery 2 replaces that policy and measurement path; the regression is absent in its executed scenarios. Contextual selections, IME, zoom, late fonts and all professional/advanced workflows still require their own evidence.

## Delivery 2 — measured layouts and predictable reduction

Reference: classic Office action hierarchy, Word web's emphasis on direct formatting access, and explicit Oasis task priorities. This delivery changes presentation/navigation; it does not add document commands.

| Ticket | Status | Implemented / evidence | Remaining acceptance |
| --- | --- | --- | --- |
| A01/A02 | partial | Optional neutral `RibbonGroupLayout`, third-row placement, shared height/stack/icon tokens, compatible two-row defaults and split labels. A large Paste sits beside Cut/Copy/Painter; history has its own group. Core contract tests and the default preset guard cover adoption. | Review optical icon families, every contextual layout, custom gallery contributions, long labels and host customization. |
| A04 | partial | Collapsed groups retain large actions and their two/three-row arrangement. A logical popup ownership tree keeps portalled children inside their parent for outside-click handling. Escape closes the deepest open menu and restores its trigger focus. | Short viewport heights, inline flyouts, contextual transitions with menus open, matrix alignment controls and VoiceOver. |
| R01 | partial | Full/compact/collapsed DOM copies are inert, hidden, stripped of IDs/test IDs, measured in one batched write/read task and removed synchronously. No additional Solid controllers are mounted for measurement. Browser assertions compare rendered widths with planned outer widths. | Every contextual/custom-control family and dimensional override. |
| R02 | partial | Widths belong to the exact current group composition. Tab/group ID reuse cannot reuse measurements; item, language and extension changes rebuild the context. Font completion, owner theme/style changes and viewport changes schedule measurement. | Real late font loads, zoom/DPR transitions, nested selection changes and externally injected stylesheet changes. |
| R03 | partial | Fixed reduction ladder: compact states before collapse; lower priority first, then right-to-left for ties. No restorative pass. Home priorities preserve Font/Paragraph until secondary groups reduce. Only actual style galleries can receive whole-card slack from a budget assuming other groups full. | Review all tab priorities with task evidence, contextual selections and other group families. |
| R04 | partial | Groups never shrink beneath the measured state to silently absorb a deficit. Below their minimum, visible left/right buttons and a focusable horizontal scroll area expose all groups. Tested at 320 px; default supported capture widths remain 640–1440 px. | Full keyboard action walkthrough, touch, assistive technology and every oversized contextual popup. |
| R05 | partial | Coalesced animation-frame scheduling, stable mounted controls during width changes, focus handoff to a collapsed trigger, observer cleanup and no idle measurement loop in executed scenarios. | Continuous drag/late-font profiling and pointer/IME interactions across all browser/context combinations. |
| D01 | ui-only | Large labeled Paste plus small Cut/Copy/Painter stack; history separated. The existing shared clipboard and painter commands are reused. | Safari permissions/failure paths, rich/text/merge paste, selection/undo and one-shot/sticky painter workflow evidence remain as specified in the plan. |
| I02/I07 | partial | Icon observation now resolves new placeholders without recreating existing SVGs on unrelated DOM changes. Per-root subscription counts support shared editors; explicit icon-name changes retain accessibility attributes. Three DOM tests cover identity, naming and shared ownership. Static inventory: 125 names, 165 literal uses, 11 dynamic expressions. | All dynamic `ToolIcon` names, SVG clipping/visibility, custom families, icon review sheet and replacements. |

A pre-existing icon-observer behavior recreated every Lucide SVG on any DOM insertion. The new measuring copies exposed a feedback loop between icon replacement and Ribbon observation. The selective observer removes that loop; browser verification observes zero measuring-copy insertions during a settled idle interval.

The narrow-screen toolbar padding previously reduced the Ribbon's actual panel width; it now applies to compact mode. The isolated host also suppresses outer document scrolling. Safari exposed a second narrow-screen padding rule that consumed 16 px; both padding rules now apply only to compact mode.

### Reduction contract and reproduction

See [Ribbon layout and reduction contracts](ribbon-layout-contract.md). Run `npm run test:ribbon:resize` with the Vite reference host running. `RIBBON_BROWSER=firefox` or `webkit` selects another engine.

`npm run test:ribbon:ci` owns its Vite process and runs the Chromium gallery/resize guards without relying on an existing developer server. PR and push workflows run the icon inventory and these guards, and upload synthetic evidence from `test-results/ribbon/`.

The browser suite checks 68 shrinking/expanding layouts per engine across two themes/two locales, plus fresh loading at 960 px, actual/planned widths, below-minimum navigation, stable focused controls, collapsed focus handoff, nested popup dismissal, tab isolation, extension addition/removal, language changes, document/selection preservation and idle observation. This is 204 recorded layouts across the three engines, not a claim to cover every scenario in the execution plan.

### Validation recorded

- TypeScript and changed-file ESLint: passed.
- Non-UI Vitest: 250 passed files, one skipped; 1,464 passed tests, one skipped.
- Targeted DOM/registry/preset suites: 49 tests passed. The full local suite also executed successfully: 309 passed files, one skipped; 1,788 passed tests, one skipped.
- Ribbon wiring and icon inventories: passed.
- Chromium, Firefox and WebKit: resize scenarios passed; gallery/composition/keyboard checks also passed in all four theme/locale combinations per engine.
- Actual Safari 27.0.1: panel and viewport both measured at 1440, 1200, 960, 800 and 640 px; states retained in local evidence; Font/Paragraph do not reverse their reduction, and Escape dismisses the underline child while retaining the Font popup. This is targeted Safari DOM/event evidence, not a VoiceOver pass.
- Global lint retains pre-existing failures outside the changed files.

The first remote run exposed jsdom's missing `ResizeObserver` in the existing style gallery test. The test now supplies a controlled observer/strip width, checks whole-card thresholds during resize and verifies observer cleanup. Production browser behavior remains covered by the independent browser suite.

## Remaining execution queue

All requirements in the execution plan remain in scope. The next sequence is:

1. Finish B01–B03 and V01–V04 across synthetic contextual/review scenarios.
2. A01/A02 and I03/I04: component dimensions, declarative layout contracts, icon review sheet and Clipboard adoption.
3. A04/R01/R02: preserved popup layouts, every-state measurements and context-isolated invalidation.
4. R03–R05: documented priorities, monotonic reduction, explicit overflow, stable resize and profiling.
5. A03, D01–D09: action/split/launcher contracts and every everyday editing workflow, with command/undo/format evidence.
6. P01–P06: Review, References, View, File, search/QAT and interoperability.
7. All M4 families: Shapes, Equations, Draw, advanced References, Mailings, Developer/Forms, Charts/SmartArt, integrations and Help, each with the plan's minimum functional delivery.
8. M5: required cross-browser, keyboard, VoiceOver, language/theme, selection, persistence and performance scenarios with retained evidence.

No unchecked workflow, advanced tab, icon redesign or interoperability requirement is treated as complete by this delivery.
