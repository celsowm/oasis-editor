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

The current capture matrix still reproduces Paragraph collapsing at 1200 px and returning at 960 px in pt-BR. Editing can also regain a less reduced state at a narrower width. Widths are now verified, so these are genuine policy/measurement findings. `RibbonPanel` still measures only the full state and caches by group ID; R01–R05 are not complete.

Other open foundations: large Paste plus three-command stack, group arrangement in collapsed popups, nested popup dismissal, overflow below the minimum, complete icon review/replacements, and measured layout tokens.

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
