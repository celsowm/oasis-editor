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

The host is at `/tests/browser/ribbon/?theme=dark&locale=pt-BR&fixture=text`. Delivery 1 used only `text`. Delivery 3 adds seven controlled fixtures and contextual evidence; see below for the current capture controls and limits.

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

## Delivery 3 — controlled contexts and first SVG family review

Date: 2026-11-10. References: existing Office/WordCraft task organization, current command contracts and the observed page-story/footnote defects. These deliveries preserve the full M0–M5 scope.

| Ticket | Status | Implemented / evidence | Remaining acceptance |
| --- | --- | --- | --- |
| B03 | partial | Seven synthetic fixtures: text, lists, styles, table, image, sections and review. Explicit caret/range/object targeting selects a list item, Caption, first table cell, image, landscape section and tracked/commented range. Canonical document/definition hashes and actual font metrics accompany captures. Cross-session/theme/locale checks prove stable fixture content. | Full real-Safari fixture workflow validation; additional stress cases accompany later task deliveries. |
| B02 | partial | Context verifier records 260 actual-width Ribbon screenshots per engine across seven fixtures, two themes, two locales and five widths. Capture CLI can traverse nested menu paths and include the complete visible popup; it rejects viewport escapes, undisposed popups, content/selection mutation, empty SVGs and unresolved placeholders. | Full scene coverage, short viewports, native dialogs, touch/zoom/late-font and performance baselines. |
| B01 | partial | Seven reference categories now record partial exposure evidence independently of unverified semantics and persistence. Selection/availability checks do not promote command or format parity. | Reconcile the rest of the feature catalog against command behavior, undo and formats. |
| I02/I07 | partial | `ToolIcon` owns actual Lucide SVG nodes, preventing stale artwork and orphan SVGs when names change among siblings. Invalid names retain placeholders and diagnostics. Lifecycle tests cover Lucide/custom/unknown transitions. | All dynamic plugin/icon paths and broader appearance regressions. |
| I03/I04/I06 | partial | Eight reviewed actions/menu glyphs: seven new page-story/numbering vectors and a refined font-independent footnote glyph. The review sheet shows before/current artwork in 16/20/24 px, two themes, three states and three surfaces; 48 scenes per engine. Decorative SVGs, names, path bounds, sizes and lifecycle are checked. | Remaining families, full focus/contrast/assistive-technology and real-Safari visual workflows. See [SVG review](ribbon-icon-review.md). |
| V04 | partial | Flat data-driven action menus size to content within viewport bounds and retain full captions. Header/Footer's Portuguese Close caption previously clipped (118 px available for 155 px text); the browser guard checks all seven captions. Galleries and nested contribution layouts retain their own geometry. | All labels, units, read-only/mixed states, long plugin/localized captions and other controls. |
| A05 | partial | Context exit now consistently prefers Home when available; the tab-strip fallback no longer races the toolbar and selects File after leaving a table. Context removal closes its popup and clears the empty Accessibility group without document mutation. | VoiceOver, other context combinations and complete keyboard workflows. |

### Fixtures, captures and CI evidence

- `text`: headings, ordinary/mixed inline text and a link; initial caret is explicit.
- `lists`: ordered/nested/bulleted content; initial caret targets an actual list item.
- `styles`: headings, Normal/Emphasis content and a Caption paragraph; Caption is selected by paragraph style.
- `table`: a synthetic table and an outside paragraph; the first cell activates table tools, and leaving it removes them.
- `image`: a single inline red-square bitmap selected as an object. Its PNG chunk checksum was repaired after Firefox rejected data that Chromium/WebKit tolerated; pixel bytes are unchanged.
- `sections`: portrait and landscape sections with synthetic headers/footers; the caret targets landscape.
- `review`: a tracked insertion, anchored comment, reply and unchanged comparison paragraph; a known revision range is selected.

These are seeded only in the isolated reference host. Persistence is disabled, history is cleared after setup, and the prepared document is clean. Fingerprint normalization removes generated identities while retaining content and anchor relationships; dedicated tests cover identity regeneration, meaningful text changes and asset references.

`npm run test:ribbon:contexts` records the current fixture/selection, SHA/dirty flag, width, DPR, document/definition hashes and current font fingerprint with every screenshot. `npm run test:ribbon:ci` runs the existing gallery/resize suites plus contexts and icon reviews, retaining separate artifacts under `test-results/ribbon/{reference,resize,contexts,icons}`.

The capture CLI additionally accepts `RIBBON_FIXTURES`, `RIBBON_TABS`, `RIBBON_MENUS=1`, `RIBBON_MENU_DEPTH`, `RIBBON_HEIGHT` and `RIBBON_DPR`. Text-only filenames remain compatible with the earlier viewer. Other fixtures have distinct prefixes. Menu traversal fails rather than silently skipping children beyond its depth/safety limit; native OS pickers and unannotated action/dialog launchers are outside this traversal. Captures mask document pixels while preserving geometry and include the Ribbon plus complete visible popup.

### Validation scope and limitations

Chromium, Firefox and WebKit each exercised 260 contextual layouts and 48 SVG review scenes, alongside the existing reference/resize suites. New pure and DOM tests cover fingerprints and SVG lifecycle. These counts describe scenarios, not completed features or parity percentages.

TypeScript, changed-source ESLint, both static audits and the full local Vitest suite passed: 311 files / 1,793 tests passed, with one file/test skipped. Global lint retains 347 errors and 20 warnings outside this delivery's changed source files.

The actual Safari editor page remained hidden and its fixture setup did not complete during this round. No real-Safari fixture workflow pass is counted. Safari 27.0.1 produced 48 SVG DOM-only records with nine correctly sized, font-independent current glyphs per record; hidden-page DOM checks do not establish visual/input/VoiceOver behavior. The earlier Delivery 2 Safari results remain historical evidence for that source version.

Comment/revision mutation, style application, clipboard permissions, DOCX/PDF round-trips and the professional/advanced workflows remain to be demonstrated as specified in the execution plan.

## Delivery 4 — atomic underline editing from Home

Date: 2026-11-10. D02 remains **partial**; this delivery closes a reproduced history defect, not the entire Font workflow.

Choosing Double underline previously dispatched a variant change and a separate toggle. One Undo removed the visible underline but left `underlineStyle: double` on the original selection, with another undo step still available. Choosing Single or Remove also depended on multiple independent commands.

The new core `applyUnderlineStyle` selection operation sets/removes the boolean and variant together. A separate wiring change adds the typed shared command and routes the split button and convenience double/word commands through one edit. Single underline clears a previous direct variant. At a caret, the style controller stores a pending override without modifying document content, including an explicit null variant to override the style under the caret. Main, expansion and menu actions reflect command availability in read-only mode.

Evidence:

- Core tests cover mixed direct underline variants, partial multirun ranges, unaffected outside characters, preserved emphasis/selection and collapsed-selection no-op.
- A controller test verifies pending Single/Remove overrides on a caret inside directly double-underlined text, without document mutation. Actual subsequent typing/IME still needs separate evidence.
- `npm run test:ribbon:editing` exercises eight workflows per engine: light/dark, en/pt-BR, actual 1440/640 px. Actions use the real Font and History controls, including collapsed groups. It asserts the original target, one-step apply/remove undo and redo, Single replacement, convenience command behavior, read-only controls, DOCX underline XML and reimported text/formatting.
- Chromium, Firefox and WebKit pass the exercised workflows. Synthetic DOCX files and checks remain in gitignored `debug_artifacts/ribbon-editing-{engine}/`; CI retains the Chromium set under `test-results/ribbon/editing/`.
- TypeScript, changed-source ESLint and both Ribbon audits pass. Full local Vitest: 313 files / 1,797 tests passed; one file/test skipped. The existing global lint failures remain outside the changed source files.

Limits: no real-Safari/VoiceOver claim; no Word-open/repair validation or PDF claim. Named-style inheritance, mixed-state presentation, all font/color controls, invalid input, subsequent typing/IME, other selection types and remaining D02 requirements stay open. This does not complete M2.

## Delivery 5 — Clipboard feedback, native recovery and safe Cut

Date: 2026-11-10. D01 and A03/A04 remain **partial**. This closes concrete failure/recovery gaps while preserving the full execution plan.

Ribbon and context-menu Clipboard actions now share one controller per editor. Failed reads/writes produce localized, dismissible, nonmodal feedback and return focus to the document for a keyboard attempt. Empty, unsupported and changed-document outcomes have distinct messages. Paste/Cut remain reachable when the programmatic browser API is unavailable, so the user can discover the keyboard path. The reference catalog's earlier “unsupported API disables Paste” note is superseded.

A refused text-only or merge paste preserves that choice for one native paste event. Dismissal, another Clipboard action or document replacement invalidates the choice. Older requests cannot replace a newer notice or mutate its target; editor disposal cancels pending mutations. Native Copy/Cut only proceed with writable event data, and Cut retains content if writing fails. Existing API reads still target the captured selection and reject changed documents.

A narrow Ribbon exposed an interaction defect: a portalled child action closed its immediate menu but left its collapsed ancestor over the new feedback. Generic command buttons and split-button primary actions now close their logical menu path after dispatch. Child triggers and Escape retain their separate navigation behavior; this does not certify every custom control's dismissal policy.

Evidence:

- Nine focused controller/adapter scenarios cover denied/empty/image-only reads, text/merge native recovery, expiry, superseded requests, disposal, per-editor isolation and safe Cut when event writes are absent/rejected. Existing Clipboard and read-only tests continue to pass.
- `npm run test:ribbon:clipboard`: 24 workflows per engine across three paste modes, two themes, two locales and 1440/640 px. Chromium, Firefox and WebKit exercise real Ribbon controls, original targets, failure without history/content changes, visible feedback, native-event recovery, success formatting and one-step undo. Eight additional Cut/Copy paths per engine verify Copy does not mutate and Cut is undoable only after a successful adapter write.
- The browser tests explicitly use deterministic Clipboard API adapters and synthetic paste events. They do not access the OS clipboard or validate trusted user gestures/permission dialogs. Firefox requires an explicitly supplied event-data property for this synthetic path; an untrusted `ClipboardEvent` does not expose its supplied data there.
- Feedback captures exclude document pixels and stay in gitignored `debug_artifacts/ribbon-clipboard-{engine}/`. The review checked the dark pt-BR/640 px message after ancestor menus were closed. The live region stays mounted, uses theme tokens and public text/icon-button primitives, and positions within the visible viewport without resizing the Ribbon.
- TypeScript and changed-source ESLint pass. Full local Vitest: 314 files / 1,806 tests passed; one file/test skipped. Global lint has 305 errors and 20 warnings outside changed source files. Static Ribbon/icon inventories pass after regeneration.
- The owned Chromium CI runner now includes the Clipboard suite and retains evidence under `test-results/ribbon/clipboard/`, alongside reference, resize, contexts, icons and editing.

Remaining D01 acceptance includes actual Safari/macOS and other native permission/gesture flows, VoiceOver, clipboard images, mixed/nested lists/tables, painter one-shot/sticky workflows and applicable DOCX/PDF evidence. The browser adapters and synthetic events are not substitutes for those checks. No milestone is completed by this delivery.

## Delivery 6 — Painter inheritance and selection-safe lifecycle

Date: 2026-11-10. D01 remains **partial**.

A new core regression demonstrated that a partial selection using inherited paragraph/character styles captured only its direct overrides: inherited font, color, bold and italic were absent. Painter now resolves the effective source appearance before creating its value snapshot. Direct overrides win, source hyperlinks/revision metadata are excluded, and destination hyperlinks remain intact. The core fix and its tests shipped separately from UI wiring.

A browser workflow then exposed a second defect: `client.selection.set` cloned the whole editor state before applying a selection-only update. The document version stayed unchanged, but its identity changed and invalidated Painter's source. The host now retains its immutable document and clones only the incoming selection positions; public snapshot getters remain detached. A dedicated host test checks identity, payload isolation, clean/version state and focus.

Painter now cancels when the editor becomes read-only, its document is replaced or its owner is disposed. Continuous-mode transactions batch the document update and source-identity refresh so the painter does not invalidate its own edit. Before the fix, a read-only editor still reported Painter active and retained its painter cursor.

Evidence:

- Named-style core capture/application test and client selection-identity regression pass, alongside the existing Painter core/controller suites.
- `npm run test:ribbon:painter` passes eight scenarios per engine in Chromium, Firefox and WebKit: two themes, two locales and 1440/640 px. Source/target positions are seeded through the public client; actual `Shift+End` keyboard selection finalizes each target through the editor input. Checks cover inherited font/size/color, destination links, one-shot disarm, one-step undo/redo, two consecutive continuous targets, Escape without mutation, read-only cancellation and document replacement.
- Results remain gitignored under `debug_artifacts/ribbon-painter-{engine}/`; CI retains Chromium records under `test-results/ribbon/painter/`. The owned CI runner now includes this seventh suite.
- TypeScript and changed-source ESLint pass. Full local Vitest: 315 files / 1,808 tests passed; one file/test skipped. Existing global lint failures are down to 249 errors and 19 warnings after formatting the changed files.

Limits: this is core and keyboard/model evidence, not a pixel comparison or a pointer/touch/VoiceOver/Safari/format round-trip certification. Actual pointer targeting, complex stories/tables/lists, full appearance properties and applicable DOCX/PDF workflows remain open with the rest of D01 and M0–M5.

## Remaining execution queue

All requirements in the execution plan remain in scope. The next sequence is:

1. Finish B01/B02 inventory and scene coverage, real-Safari fixture validation, and the remaining V01–V04 cases.
2. Complete the remaining I03/I04 icon families and A01/A02 contextual/custom layout acceptance.
3. A03/A04: action/menu/launcher semantics, short viewports, spatial matrices and contextual popup transitions.
4. R01–R05: close late-font, zoom, pointer/IME, invalidation and performance evidence across remaining contexts.
5. A03, D01–D09: action/split/launcher contracts and every everyday editing workflow, with command/undo/format evidence.
6. P01–P06: Review, References, View, File, search/QAT and interoperability.
7. All M4 families: Shapes, Equations, Draw, advanced References, Mailings, Developer/Forms, Charts/SmartArt, integrations and Help, each with the plan's minimum functional delivery.
8. M5: required cross-browser, keyboard, VoiceOver, language/theme, selection, persistence and performance scenarios with retained evidence.

No unchecked workflow, advanced tab, icon redesign or interoperability requirement is treated as complete by this delivery.
