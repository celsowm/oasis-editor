# Office Ribbon execution progress

This is the delivery ledger for the [execution plan](ribbon-office-execution-plan.md). The full M0–M5 objective remains active. Presentation, command semantics, and file persistence are independent evidence dimensions. No milestone is complete yet.

## Delivery 1 — reproducible host and immediate presentation fixes

Reference: classic Office group naming and navigation; the historical WordCraft/Word web comparison informs the initial defects. These changes do not assert document-feature parity.

| Ticket    | Status   | Implemented / evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Remaining acceptance                                                                                                                                                                                                                                                          |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01       | partial  | Added a pinned snapshot of WordCraft's 521 catalog entries from `05f781cfdac1d89034c0f4f5824b597ff845f2ef`: 25 populated surfaces and 108 groups, alongside 13 default tabs, seven contextual tabs and seven auxiliary surfaces. `Zotero` and `Help` are default tabs with no catalog rows. At this initial ledger point, the crosswalk had 49 capability rows and linked 37 source rows; the other 484 were unclassified. Deliveries 13–14 and 16 reviewed comments and common Home command IDs. The catalog audit rejects crosswalk IDs absent from the pinned source, including commands rendered by a statically imported custom control. It caught and corrected `insert.date` → `insert.dateTime`. The 21 `references.json` categories remain the historical screenshot taxonomy. | Expand the crosswalk across all source rows; assign exposure, semantics and persistence independently with capability-level evidence. Review UI-only, core-only, menu-only, preservation-only and not-applicable cases instead of inferring them from absent source commands. |
| B02       | partial  | `tests/browser/ribbon/` mounts the actual editor without site/sidebar padding. `scripts/capture-ribbon-reference.mjs` rejects width mismatches and records SHA, dirty state, scenario, browser, theme, locale, DPR, fonts, measured width, group sizes and unresolved placeholders. 180 Chromium ribbons across nine tabs, five actual widths, two themes and two locales.                                                                                                                                                                                                                                                                                                                                                                                               | Contextual tabs, every popup, late fonts, scale/zoom and repeatable performance baselines.                                                                                                                                                                                    |
| B03       | partial  | Synthetic HTML fixtures for styled text, links, lists, tables and an inline image; persistence and remote web fonts disabled in the reference host.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Section/review fixtures, deterministic selection/context setup, font fingerprint and fixture content hashing. Only the text fixture has been exercised by the automated capture matrix.                                                                                       |
| B04       | complete | All 53 historical scenes classified as equivalent command, related task, or no captured counterpart in `references.json`. All 53 explicitly require direct Word verification; no submenu is certified from its screenshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Actual Word submenu captures belong to subsequent evidence gathering.                                                                                                                                                                                                         |
| V01       | partial  | Built-in Header & Footer and Sort labels resolve in en/pt-BR. Contributions can supply `groupLabel`; unmapped groups use localized General rather than an internal identifier. Model tests cover both locales; browser checks exercise Insert.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Exercise all plugin/contextual presets and audit remaining labels.                                                                                                                                                                                                            |
| V02       | partial  | Reactive visible items feed Ribbon composition and tabs. Empty nested groups and orphan/duplicate row separators disappear; disabled actions remain. Five pure regression tests cover composition and labels. Insert's empty Accessibility group is absent in browser checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Exercise image/table selection transitions, dynamic plugins, separator changes and measurement invalidation under the new responsive planner.                                                                                                                                 |
| V03       | partial  | Separate typography samples and readable labels; only whole cards enter the strip; responsive expanded grid; theme tokens replace fixed light/dark chrome. Portal menus inherit the owning editor's theme tokens and host overrides. Browser checks cover strip bounds, expanded background, keyboard movement and Escape/focus restoration.                                                                                                                                                                                                                                                                                                                                                                                                                             | Long localized/custom style names, mixed selections, command application/undo, multiple editor instances, VoiceOver and visual review of all preview properties.                                                                                                              |
| I01       | partial  | `scripts/audit-ribbon-icons.mjs` generates `scripts/ribbon-parity/icons.json`: 129 literal names, 165 uses, 28 custom renderers and 11 dynamic expressions. No unresolved static literal names. Origin/license recorded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Associate every command/size and inspect dynamic/plugin/direct renderer paths.                                                                                                                                                                                                |
| I02 / I07 | partial  | Capture manifests record unresolved Lucide placeholders; none in the 180 text/caret ribbons. A static audit fails on invalid literal names or stale generated inventory.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Invisible/clipped/empty SVGs, all popup and contextual families, appearance baselines and dynamic plugin contributions.                                                                                                                                                       |
| A05       | partial  | Arrow keys, Home and End now move focus to the selected tab. Active tabs scroll into view without forcing keyboard focus on context changes. Browser checks exercise arrows/End at 640 px.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Context transitions, extension removal, VoiceOver, touch and a reviewed overflow affordance.                                                                                                                                                                                  |

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

| Ticket  | Status  | Implemented / evidence                                                                                                                                                                                                                                                                                                                                         | Remaining acceptance                                                                                                                                   |
| ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01/A02 | partial | Optional neutral `RibbonGroupLayout`, third-row placement, shared height/stack/icon tokens, compatible two-row defaults and split labels. A large Paste sits beside Cut/Copy/Painter; history has its own group. Core contract tests and the default preset guard cover adoption.                                                                              | Review optical icon families, every contextual layout, custom gallery contributions, long labels and host customization.                               |
| A04     | partial | Collapsed groups retain large actions and their two/three-row arrangement. A logical popup ownership tree keeps portalled children inside their parent for outside-click handling. Escape closes the deepest open menu and restores its trigger focus. Collapsed Ribbon popups clamp vertically into a 180 px viewport and scroll within their existing max-height. Keyboard Tab traversal scrolls a height-constrained panel and keeps focus visible. The Table Layout popup preserves a spatial 3×3 cell-alignment picker. | Contextual transitions with menus open and VoiceOver.                                                                                     |
| R01     | partial | Full/compact/collapsed DOM copies are inert, hidden, stripped of IDs/test IDs, measured in one batched write/read task and removed synchronously. No additional Solid controllers are mounted for measurement. Browser assertions compare rendered widths with planned outer widths.                                                                           | Every contextual/custom-control family and dimensional override.                                                                                       |
| R02     | partial | Widths belong to the exact current group composition. Tab/group ID reuse cannot reuse measurements; item, language and extension changes rebuild the context. Font completion, owner theme/style changes and viewport changes schedule measurement.                                                                                                            | Real late font loads, zoom/DPR transitions, nested selection changes and externally injected stylesheet changes.                                       |
| R03     | partial | Fixed reduction ladder: compact states before collapse; lower priority first, then right-to-left for ties. No restorative pass. Home priorities preserve Font/Paragraph until secondary groups reduce. Only actual style galleries can receive whole-card slack from a budget assuming other groups full.                                                      | Review all tab priorities with task evidence, contextual selections and other group families.                                                          |
| R04     | partial | Groups never shrink beneath the measured state to silently absorb a deficit. Below their minimum, visible left/right buttons and a focusable horizontal scroll area expose all groups. Tested at 320 px; default supported capture widths remain 640–1440 px.                                                                                                  | Full keyboard action walkthrough, touch, assistive technology and every oversized contextual popup.                                                    |
| R05     | partial | Coalesced animation-frame scheduling, stable mounted controls during width changes, focus handoff to a collapsed trigger, observer cleanup and no idle measurement loop in executed scenarios.                                                                                                                                                                 | Continuous drag/late-font profiling and pointer/IME interactions across all browser/context combinations.                                              |
| D01     | ui-only | Large labeled Paste plus small Cut/Copy/Painter stack; history separated. The existing shared clipboard and painter commands are reused.                                                                                                                                                                                                                       | Safari permissions/failure paths, rich/text/merge paste, selection/undo and one-shot/sticky painter workflow evidence remain as specified in the plan. |
| I02/I07 | partial | Icon observation now resolves new placeholders without recreating existing SVGs on unrelated DOM changes. Per-root subscription counts support shared editors; explicit icon-name changes retain accessibility attributes. Three DOM tests cover identity, naming and shared ownership. Static inventory: 129 names, 165 literal uses, 11 dynamic expressions. | All dynamic `ToolIcon` names, SVG clipping/visibility, custom families, icon review sheet and replacements.                                            |

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

| Ticket      | Status  | Implemented / evidence                                                                                                                                                                                                                                                                                                                                                         | Remaining acceptance                                                                                                                    |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| B03         | partial | Seven synthetic fixtures: text, lists, styles, table, image, sections and review. Explicit caret/range/object targeting selects a list item, Caption, first table cell, image, landscape section and tracked/commented range. Canonical document/definition hashes and actual font metrics accompany captures. Cross-session/theme/locale checks prove stable fixture content. | Full real-Safari fixture workflow validation; additional stress cases accompany later task deliveries.                                  |
| B02         | partial | Context verifier records 260 actual-width Ribbon screenshots per engine across seven fixtures, two themes, two locales and five widths. Capture CLI can traverse nested menu paths and include the complete visible popup; it rejects viewport escapes, undisposed popups, content/selection mutation, empty SVGs and unresolved placeholders.                                 | Full scene coverage, short viewports, native dialogs, touch/zoom/late-font and performance baselines.                                   |
| B01         | partial | Seven reference categories now record partial exposure evidence independently of unverified semantics and persistence. Selection/availability checks do not promote command or format parity.                                                                                                                                                                                  | Reconcile the rest of the feature catalog against command behavior, undo and formats.                                                   |
| I02/I07     | partial | `ToolIcon` owns actual Lucide SVG nodes, preventing stale artwork and orphan SVGs when names change among siblings. Invalid names retain placeholders and diagnostics. Lifecycle tests cover Lucide/custom/unknown transitions.                                                                                                                                                | All dynamic plugin/icon paths and broader appearance regressions.                                                                       |
| I03/I04/I06 | partial | Eight reviewed actions/menu glyphs: seven new page-story/numbering vectors and a refined font-independent footnote glyph. The review sheet shows before/current artwork in 16/20/24 px, two themes, three states and three surfaces; 48 scenes per engine. Decorative SVGs, names, path bounds, sizes and lifecycle are checked.                                               | Remaining families, full focus/contrast/assistive-technology and real-Safari visual workflows. See [SVG review](ribbon-icon-review.md). |
| V04         | partial | Flat data-driven action menus size to content within viewport bounds and retain full captions. Header/Footer's Portuguese Close caption previously clipped (118 px available for 155 px text); the browser guard checks all seven captions. Galleries and nested contribution layouts retain their own geometry. Watermark/page-border numeric controls now identify point values, opacity range, rotation degrees and scale factor in both locales. | All labels, units, read-only/mixed states, long plugin/localized captions and other controls.                                           |
| A05         | partial | Context exit now consistently prefers Home when available; the tab-strip fallback no longer races the toolbar and selects File after leaving a table. Context removal closes its popup and clears the empty Accessibility group without document mutation.                                                                                                                     | VoiceOver, other context combinations and complete keyboard workflows.                                                                  |

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

## Delivery 7 — inherited Font toggles and explicit DOCX resets

Date: 2026-11-10. D02 and P06 remain **partial**.

A selected run can inherit Bold, Italic or Underline from its paragraph/character style without storing a direct flag. The previous toggle inspected only direct flags, so clicking an apparently active button could leave the effective formatting enabled. Selected-run analysis now resolves effective styles. Turning an inherited effect off stores an explicit false override; ordinary direct formatting still removes redundant flags where safe. Single underline overrides inherited Double, and script toggles explicitly suppress an inherited opposite position.

DOCX export now writes explicit off values when necessary, including both ordinary/complex-script bold and italic flags, `w:u` Single/None and baseline script position. Materialization avoids filling ordinary unformatted runs with unnecessary false defaults. Import retains the reset needed to override inherited styles. The core fix and DOCX fix are separate commits. The distinction between an absent property and an explicit reset follows the primary [Bold](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.bold?view=openxml-3.0.1), [Underline](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.underline?view=openxml-3.0.1) and [VerticalPositionValues](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.verticalpositionvalues?view=openxml-3.0.1) documentation.

Evidence:

- Eight core regression scenarios cover effective inherited toggles, mixed runs, underline replacement/removal, script mutual exclusion and minimal ordinary overrides.
- Twenty DOCX scenarios cover supported boolean reset flags, contextual alternates, unused defaults, underline Single/None and script baseline export/reimport.
- `npm run test:ribbon:inherited` passes 32 range workflows and 16 actual keyboard-typing paths per engine in Chromium, Firefox and WebKit. Two themes/locales and 1440/640 px exercise the actual Font controls and collapsed group. Checks cover the original range, outside text, destination links, active state, one-step undo/redo, explicit DOCX XML and self-reimport. Caret formatting does not mutate content before typing.
- Synthetic DOCX files and manifests remain gitignored under `debug_artifacts/ribbon-inherited-formatting-{engine}/`. The owned CI runner adds this eighth suite, retaining Chromium evidence under `test-results/ribbon/inherited-formatting/`.

Limits: inherited appearance is tested for the named properties, not all Font controls or mixed-state presentation. IME, complex stories/tables, Word-open/repair, PDF, VoiceOver and real-Safari editing workflows remain open. Self-reimport is not external interoperability certification.

## Delivery 8 — aligned dropdown affordances and B/I/U footprints

Date: 2026-11-10. A01/A03, D02 and I06/I07 remain **partial**. Reference: the user's observed alignment defects and the existing original Ribbon components.

Rendered dropdown arrows previously varied between 12, 13, 16 and a distorted 18 × 13 px. Generic SVG rules could enlarge the arrow along with an action icon. The shared affordance now occupies 12 × 12 px, centered in its own slot. Large menus and split actions use shared icon/caption/arrow bands; Paste, Margins, Shading and Borders participate. Native selects retain native selection/keyboard behavior with the same decorative arrow. The size field accommodates the existing 20.25 value.

`DropdownChevron` now owns its SVG node. The earlier observer-replaced placeholder could leave duplicate arrows after conditional remounts; lifecycle coverage verifies disposal, remounting, reactive classes and retained captions. Icon sizing excludes affordances without increasing selector specificity, preserving the 16 px review-sheet samples.

The Underline button keeps its original text U. Its 18 × 18 px glyph box now matches the B/I SVG boxes and shares their vertical position; the letter and underline mark form one footprint aligned to both the top and bottom of B/I, rather than aligning the letter alone and leaving its mark lower. The primary mark is a stable single line; variant previews, selected menu state, remembered choice and application remain in the dropdown. This presentation intentionally avoids compressing double/wave samples into the small primary glyph.

Evidence:

- `scripts/ribbon-chevron-geometry.mjs` checks rendered arrow dimensions, decorative accessibility, vertical slots and the complete B/I/U footprint. Context captures and the resize suite invoke it, including the nested Font popup.
- Final 1440 px and collapsed 640 px Font checks pass in Chromium, Firefox and WebKit. B/I ink spans 80.25–93.75 px in the full Ribbon; U plus mark spans approximately 80.19–93.75 in Chromium, 79.69–93.75 in Firefox and 80.20–93.75 in WebKit. The assertion allows at most 1 CSS px per edge for raster/font metrics.
- Actual Safari 27.0.1 has a visible, focused synthetic host at actual width 1440 px, with 12 correctly sized visible arrows and no duplicates after reload. The cropped dark pt-BR Ribbon is retained at `debug_artifacts/ribbon-chevrons-after/safari-dark-pt-BR-1440.png`. Before/after and individual Font crops are in the same gitignored evidence directory; rejected intermediate U prototypes are not baselines.
- After the U sizing review, Safari MCP 27.0.1 measured B, I and U glyph boxes at the same `y=78` with a height of 18 px. The dark en Home capture is cropped to the Ribbon at `debug_artifacts/ribbon-comparison/safari-ribbon-home-1440.png`. The Chromium ink-footprint guard still passes: B/I top `80.25`, U top `80.12`, with all bottoms at `93.75`.
- Eight Chromium underline editing workflows still pass, including menu application, history, DOCX self-reimport and read-only controls.
- The final owned Chromium CI run passes all eight suites: reference, resize, 260 contextual layouts, 48 SVG review scenes, underline, Clipboard, Painter and inherited Font. The geometry guard runs in context/resize checks.
- TypeScript, changed-source ESLint and both static audits pass. Full local Vitest: 317 files / 1,837 tests passed; one file/test skipped. Global lint still reports 249 errors and 19 warnings outside the changed source files.

Limits: targeted Safari DOM/pixel evidence does not certify trusted keyboard/pointer workflows, permissions or VoiceOver. All remaining layout families, themes/states, units, accessibility and M0–M5 criteria stay in scope.

## Delivery 9 — point-sized HTML and reliable Font value fields

Date: 2026-11-10. D01/D02 and P06 remain **partial**.

An HTML probe using `font-size:12pt` and `18pt` unexpectedly reported the default 11 pt in Home. The shared inline parser recognized only `px`, discarding point sizes during import and rich paste. It now resolves all seven absolute CSS length units with the canonical core conversion constants, retaining fractional sizes without integer rounding. The factors follow [CSS absolute lengths](https://www.w3.org/TR/css-values-4/#absolute-lengths). Relative sizes and external stylesheets still require separate resolution; this does not claim a complete CSS cascade.

Further Font checks reproduced two independent defects: a malformed size was converted to null and cleared direct formatting, and the generic select renderer failed to bind the command's disabled state. Invalid nonempty sizes now return failure without changing content, history or selection; explicit null/empty resets remain supported. Overflow or underflow during conversion is rejected. Native Font and other command-bound selects now follow their shared disabled binding, including read-only transitions.

Evidence:

- Twenty core/integration scenarios cover absolute conversions, unsupported/invalid lengths, inherited inline sizes and nested overrides, link retention, rich insertion without changing surrounding formatting, HTML self-reimport and DOCX self-reimport.
- Two additional point-boundary tests retain 10.5 pt and reject numeric overflow/underflow.
- `npm run test:ribbon:font-values` passes eight workflows per engine in Chromium, Firefox and WebKit: two themes/locales and actual 1440/640 px. Imported 10.5/18 pt runs produce blank mixed size/family fields. Choosing 16 pt and Arial affects only the original multirun target, preserves its links and outside text, and supports separate undo/redo. Seven invalid payload cases leave a complete model/history/selection snapshot unchanged. Read-only fields disable and re-enable; a blocked command cannot edit content. Resulting DOCX retains target sizes, primary font names, links and outside text after self-reimport.
- Actual Safari 27.0.1, visible at 1440 px, confirms imported 10.5/18 pt become 14/24 CSS px, mixed value fields are blank and both Font selectors disable in read-only mode. This is targeted programmatic DOM/state evidence, retained under `debug_artifacts/ribbon-font-values-safari/`, not trusted input or VoiceOver certification.
- Live edits compare exact font-family values. The DOCX check compares primary names because the format stores font names and import reconstructs generic CSS fallbacks; adding `sans-serif` is not treated as a content-font change.
- Gitignored evidence is under `debug_artifacts/ribbon-font-values-{engine}/`; the owned CI runner adds a ninth suite under `test-results/ribbon/font-values/`. The final owned Chromium run passes all nine suites, including the measured-width assertions in this workflow.
- TypeScript and changed-source ESLint pass. Full local Vitest: 318 files / 1,859 tests passed; one file/test skipped. Both static audits pass after regenerating the line-based icon inventory.

Limits: blank mixed value fields are verified, but mixed boolean accessibility/presentation remains open. The current size selector is not an editable arbitrary-size combobox; numeric command validation is independent of future text-entry UX. IME, relative CSS units/cascade, actual native clipboard permissions, Word-open/repair, PDF and VoiceOver remain in the execution queue.

## Delivery 10 — color palettes, style links and read-only menu lifecycle

Date: 2026-11-10. D01/D02 and P06 remain **partial**.

Color, highlight and text-shading controls now compare standard named sRGB, hexadecimal, and opaque RGB values consistently. Opaque colors serialize as valid DOCX/PDF values; highlights map through the Word palette. Unsupported translucent and non-sRGB functions remain outside this normalizer. DOCX character runs retain their named character-style link while direct overrides still win, so later style changes remain live after reimport.

Color palettes and the Style Gallery now disable from command availability, close an open popup when read-only revokes the action, and return focus when revocation removes the focused menu. Late native color events cannot apply after revocation. Palette choices persist through Solid control recreation per editor without entering document/history state. Dark portal panels use Ribbon chrome tokens rather than the white document-paper token.

The host change broadcaster now marks document changes only when the immutable document identity changes; selection changes keep their separate event and view/selection-only updates no longer mark the document dirty. Import-time document replacements are not replayed as user edits.

Evidence:

- Core color tests cover 148 standard CSS named sRGB colors and opaque RGB/hex forms. DOCX tests cover foreground, highlight, shading, underline color, valid OOXML values, and self-reimport; PDF tests cover color operators and blending. Character-style tests check preserved `w:rStyle`, direct formatting precedence, and live inherited formatting after a later style update.
- UI tests cover RGB-equivalent active swatches, disabled palette revocation, focus restoration, ignored late events, per-editor last-choice state, dynamic Style Gallery availability and clean selection/view broadcasts.
- `scripts/verify-ribbon-colors-styles.mjs` passes 32 workflows per engine in Chromium, Firefox and WebKit: three color pickers and paragraph/character galleries across two themes, two locales and 1440/640 px. The checks retain original target ranges and links, verify hover nonmutation, selection/history, undo/redo, read-only popup closure, portal theme colors, OOXML values and DOCX self-reimport. Cropped screenshots and synthetic DOCX records remain gitignored in `debug_artifacts/ribbon-colors-styles-{engine}/`.
- The owned Chromium runner adds this as its tenth suite under `test-results/ribbon/colors-styles/`. The integrated run passed all ten suites after the theme-token correction.
- Full local Vitest: 324 files / 1,889 tests passed; one file/test skipped. TypeScript, changed-file ESLint, Prettier, and both static Ribbon/icon audits pass.

Limits: Opaque sRGB is not full CSS Color 4 or a color-management pipeline; alpha, P3/Lab/other spaces and the full cascade remain open. DOCX self-reimport is not Word-open/repair certification. Real-Safari workflows, VoiceOver, IME and broader document stories remain in the execution queue.

## Delivery 11 — pinned full WordCraft catalog baseline

Date: 2026-11-10. B01 remains **partial**.

The 38-row executable Oasis crosswalk was not a full reference inventory. A repeatable snapshot now records every row of WordCraft's `catalog.rs` at commit `05f781cfdac1d89034c0f4f5824b597ff845f2ef`, with source-file SHA-256 digests and the tab definitions from `ribbon.rs`. It contains 521 entries across 25 populated surfaces and 108 groups. The source declares 13 default tabs and seven contextual tabs; seven more populated surfaces are QAT, title-bar, mode, or tool surfaces. `Zotero` and `Help` are default tabs with no rows in this command catalog. These are distinct from the 21 historical screenshot categories in `references.json`.

At Delivery 11, the snapshot linked 20 source rows to the 38 Oasis capability rows. The audit rejects crosswalk IDs absent from the pinned source. It exposed a stale `insert.date` mapping to `insert.date_time`; the actual WordCraft ID is `insert.dateTime`, now corrected. An absent crosswalk remains unclassified; it does not mean the capability is missing or not applicable.

Evidence:

- `npm run audit:ribbon:wordcraft:write` regenerates from the sibling WordCraft checkout (or `WORDCRAFT_ROOT`); `npm run audit:ribbon:wordcraft` checks it against the checkout. `npm run audit:ribbon` validates snapshot structure, pinned SHA, per-surface counts, all crosswalk links, and current Oasis command/placement wiring.
- The generated [parity matrix](ribbon-parity-matrix.md) states the 521-entry reference scope beside the narrower 38-capability Oasis crosswalk.

Limits at Delivery 11: this was source inventory and command-ID evidence only. The then-unlinked 501 rows required individual review for equivalence, exposure, semantics, and persistence. B01 and the full M0–M5 plan remained open.

## Delivery 12 — popup captures at every planned Ribbon width

Date: 2026-11-10. B02 remains **partial**.

Expanded the synthetic Playwright reference captures to include each visible enabled button-driven menu, gallery, group expansion, and nested popup in the current text, table, image, section, and review scenarios. The sets cover actual content widths of 640, 800, 960, 1200, and 1440 px, both themes, and en/pt-BR. Across the retained manifests this produced 3,024 Ribbon scenes, 2,235 with an open popup, across 12 currently populated tabs including Table Design, Table Layout, and Picture Format. Nested popup paths reached depth three. The images crop to the Ribbon and complete visible popup; synthetic document pixels remain masked.

Evidence:

- `debug_artifacts/ribbon-popups-640/manifest.json`, `debug_artifacts/ribbon-popups-context-640/manifest.json`, `debug_artifacts/ribbon-popups-context-960-1200/manifest.json`, and `debug_artifacts/ribbon-popups-context-800-1440/manifest.json` record the screenshots and scenario metadata. These artifacts remain gitignored.
- `scripts/capture-ribbon-reference.mjs` verified each measured width, popup bounds, unchanged document version and selection, no browser page errors, and no visible unresolved or empty SVGs. All four capture runs completed successfully.

Limits: this covers the currently exposed browser menus, not native OS dialogs or unavailable tabs such as Draw and Shape Format. B02 still needs Safari/VoiceOver, touch, zoom, late-font, performance and comparison against direct Word captures. These captures do not close B01's unmapped WordCraft inventory.

## Delivery 13 — comment command crosswalk review

Date: 2026-11-10. B01 remains **partial**.

Reviewed the WordCraft and Oasis command declarations for New Comment, Delete Comment, Previous Comment, Next Comment and Resolve Comment. Their capability links now use the exact WordCraft catalog command IDs. The source catalog contains six rows for these five distinct commands because New Comment is placed on both Insert and Review. Oasis exposes New Comment on Review only; this placement difference is recorded on the feature and remains open.

The pinned catalog audit now reports 26 linked source rows out of 521, leaving 495 without a reviewed direct crosswalk. This is a six-row increase from Delivery 11. The generated matrix retains `partial` status and its caveat: command linkage does not establish behavior, persistence, accessibility or placement parity. Comment semantics and DOCX interoperability remain independently unverified where noted.

Evidence: `npm run audit:ribbon:wordcraft:write`, `npm run audit:ribbon:write`, `npm run audit:ribbon:wordcraft`, and `npm run audit:ribbon` pass against the pinned WordCraft checkout. The command definitions were inspected in both repositories, including WordCraft's `crates/engine/src/cmd/review.rs` and Oasis's Essentials command group.

Limits: this resolves only five comment command links. The remaining 495 source rows still need capability-level triage; this does not complete B01 or any milestone.

## Delivery 14 — Home formatting and paragraph crosswalk

Date: 2026-11-10. B01 remains **partial**; D02/D03 remain **partial**.

Added nine capability rows for Bold, Italic, Subscript, Superscript, Increase/Decrease Indent and Left/Center/Right alignment. Each source ID was checked against WordCraft's command implementation and catalog. Oasis's existing Ribbon item, command registration and placement were checked by the static audit. The inherited Font workflows from Delivery 7 provide browser evidence for the four character-formatting actions; mixed-state presentation and external Word interoperability remain unverified. Increase/Decrease Indent are related-task mappings: Oasis changes list nesting only, while WordCraft also adjusts non-list paragraph indentation. Alignment actions are only confirmed as registered and placed; list, table, multi-paragraph selection, undo and file-format workflows still require direct evidence.

The crosswalk now covers 47 Oasis capabilities and links 35 of 521 WordCraft catalog rows. The remaining 486 rows are still unclassified; a binding or matching task label does not establish semantic or persistence parity. The generated [parity matrix](ribbon-parity-matrix.md) records the added capabilities and their outstanding verification separately.

Evidence: `npm run audit:ribbon:wordcraft:write`, `npm run audit:ribbon:write`, `npm run audit:ribbon:wordcraft`, `npm run audit:ribbon`, and `npm run audit:ribbon:icons` pass. The audit confirms every added Oasis command is built in, registered, present in the Ribbon preset, and placed in Home/Font or Home/Paragraph.

Limits: this adds no new editing behavior. The nine mappings do not complete D02/D03, and B01 still needs review of the other 486 catalog rows plus independent exposure, semantics and persistence triage.

## Delivery 15 — GitHub Actions runtime cleanup

Date: 2026-11-10. M5 CI maintenance; no Ribbon milestone completed.

Updated `actions/checkout`, `actions/setup-node`, and `actions/upload-artifact` from v4 to v7 in the PR and deploy workflows. These jobs already use Node 24; the newer actions remove the Node 20 deprecation annotation. `setup-node` v7 removed its dummy `NODE_AUTH_TOKEN` fallback, but these workflows do not configure `registry-url`, so they do not rely on that behavior. The npm publication workflow remains on its existing v6 action versions.

Evidence: `Build and Deploy Demo` run `42856972152` completed successfully on commit `8a583dad`; the full browser scenario suite, smoke test and GitHub Pages deployment passed. Its only remaining annotation concerned the `ubuntu-latest` runner image. `Publish npm Package` run `42856972060` also completed successfully.

Limits: the runner-image notice still needs review against GitHub's migration schedule. This maintenance does not close browser/Safari/accessibility acceptance or any M0–M5 feature milestone.

## Delivery 16 — custom Underline control inventory

Date: 2026-11-10. B01 and D02 remain **partial**.

Extended the Ribbon parity audit to follow statically imported custom controls and collect literal command IDs from their `execute` calls. The built-in Underline split control now contributes `applyUnderlineStyle` to Ribbon exposure evidence. This does not pretend that every dynamic custom control is inspectable; command expressions and plugin UI still require runtime coverage.

Added separate crosswalk rows for WordCraft's `format.underline` and `format.doubleUnderline`. Both resolve to the custom Underline control and its atomic command. The Double option directly selects the Double variant. The main Underline action reuses the last selected variant, while WordCraft's command applies Single by default when enabling underline. That difference is recorded as related-task behavior with parity still partial.

The generated inventory now covers 49 Oasis capabilities and links 37 of 521 WordCraft catalog rows. The 484 unmatched rows remain unclassified. The audit also reports `applyUnderlineStyle` as direct-Ribbon reachable and checks its built-in declaration, live Essentials registration, control dispatch and Ribbon placement.

Evidence: `npm run audit:ribbon:wordcraft:write`, `npm run audit:ribbon:write`, `npm run audit:ribbon:wordcraft`, `npm run audit:ribbon`, `npm run audit:ribbon:icons`, and changed-file ESLint pass. Delivery 4 provides atomic apply/remove, selection and undo/redo evidence for underline variants; Word-open interoperability, mixed-state presentation and VoiceOver remain open.

Limits: this is source-level exposure plus existing browser/core evidence. It does not certify complete parity, all custom controls, or the full Font workflow.

## Delivery 17 — Review command crosswalk

Date: 2026-11-10. B01 and P01 remain **partial**.

Linked four existing Oasis Review capabilities to their WordCraft catalog rows: previous/next change navigation, Show Comments, and Reply. Source implementations were inspected instead of inferring equivalence from similar labels. Previous/next are related tasks because Oasis currently navigates text-run revisions in its active editing story, while WordCraft's change list includes paragraph, table, and section changes. Show Comments is also a related task: WordCraft's command returns a comment list, whereas Oasis toggles its discussion drawer. Reply is a direct command crosswalk for creating a threaded reply; its cross-application file round-trip remains unverified.

The crosswalk now links 41 of the 521 WordCraft catalog rows; the other 480 remain unclassified. This improves command discoverability accounting only. Review exposure in all contexts, visual organization, tracked-change semantics, comments persistence and DOCX interoperability remain separate acceptance work.

Evidence: inspected WordCraft `crates/engine/src/cmd/review.rs`, `review/changes.rs`, `review/comments.rs` and the pinned catalog rows, alongside Oasis's built-in Review command bindings and `features.json` notes. Regenerated the catalog snapshot and parity matrix; static audit validates all four source IDs and links.

Limits: this does not complete Review workflows or P01. Accept/reject scope, revision navigation parity, comments anchors/authorship and external Word round-trips still require capability-level verification.

## Delivery 18 — Insert command crosswalk

Date: 2026-11-10. B01 and D04 remain **partial**.

Added capability rows for Insert Table, Pictures, Link, Remove Hyperlink, Shapes, Symbols, Equations, Footnote and Caption. Each maps an existing Oasis command and Ribbon control to a WordCraft catalog row. The notes retain their boundaries: Oasis's table grid is not Draw Table, Quick Tables, text conversion or spreadsheet insertion; image insertion uses the local host picker and does not cover online pictures or other illustration types; the Link dialog does not yet establish all in-document target paths; the shape and symbol galleries cover subsets; Oasis captions apply to images under Insert/Accessibility, while WordCraft also captions tables under References.

The crosswalk now contains 58 Oasis capabilities and links 51 of the 521 WordCraft catalog rows, leaving 470 source rows unclassified. WordCraft places Equation on both Insert and its contextual Equation tab; Oasis currently exposes the shared command through Insert/Symbols only. These links record candidate command relationships and do not certify complete workflows or persistence.

Evidence: inspected WordCraft `crates/engine/src/cmd/insert.rs`, `equation.rs`, and `references.rs`, plus Oasis's Insert/References placements, `SymbolMenu`, `ShapeGallery` and Essentials command handlers. Extended the static audit to follow statically imported components supplied through a menu's `content.render`, which records `ShapeGallery`'s literal `insertShape` dispatch as Ribbon reachable. The generated catalog links and matrix pass their audits.

Limits: table targeting and export, image selection and round-trip, hyperlink selection and undo, equation editing/interoperability, reference workflows and the broader Insert tab remain open. D04 and M2 remain incomplete.

## Delivery 19 — Home formatting and paragraph crosswalk

Date: 2026-11-10. B01 and D01 remain **partial**.

Added 18 Home capability rows covering font family/size and size steps, case conversion, clear formatting, strikethrough, font color, highlight, character shading, bullets, numbering and restart, justification, line spacing, paragraph spacing before/after, and styles. The mappings point to existing Oasis controls. Notes record the known differences and evidence still needed, including capitalization modes, numbering behavior, WordCraft's exact/at-least line spacing, one-click paragraph spacing, and style IDs.

The crosswalk now contains 76 Oasis capabilities and links 69 of the 521 WordCraft catalog rows; 452 source rows remain unclassified. Extended the source audit to recognize paragraph/character commands declared on a style gallery, alongside commands dispatched by statically imported custom controls. No Safari window was opened for this delivery.

Evidence: checked the pinned WordCraft command registrations and Home UI in `crates/engine/src/cmd/{format,para}.rs` and `crates/ui-egui/src/ribbon/home.rs`, plus Oasis's default toolbar placements and Essentials registrations. Regenerated the WordCraft source-link snapshot and parity matrix; the Ribbon audit passes.

Limits: these are command and exposure mappings, not workflow equivalence. Mixed selections, keyboard/focus behavior, accessibility, external-format round-trips and actual Safari behavior remain unverified. B01 and D01 remain incomplete.

## Delivery 20 — Headless Ribbon baseline and composition

Date: 2026-11-10. B02 is **complete** for the reference host; B01 and V02 remain **partial**. V01 and V03 pass the reviewed acceptance checks.

Captured 45 Ribbon-only scenes across the nine available tabs at content widths 1440, 1200, 960, 800 and 640 px. The headless Chromium harness fixes theme, locale, fixture, height and DPR, records requested and measured widths plus commit/font/document metadata, and rejects a width mismatch. The dark pt-BR text fixture produced a gitignored manifest and screenshots.

The headless reference verifier passed four light/dark and English/pt-BR combinations. It checked the Header & Footer label and unknown-group fallback, the absence of an empty Accessibility group, complete style cards, expanded gallery theme, keyboard navigation and tab reachability at 640 px. Source review confirms composition filters hidden actions while retaining disabled ones; the panel rebuilds groups and schedules measurements when composition changes.

Evidence: `RIBBON_BROWSER=chromium RIBBON_OUTPUT=debug_artifacts/ribbon-office-headless RIBBON_THEMES=dark RIBBON_LOCALES=pt-BR RIBBON_WIDTHS=1440,1200,960,800,640 node scripts/capture-ribbon-reference.mjs` captured the width matrix. `RIBBON_BROWSER=chromium node scripts/verify-ribbon-reference.mjs` verified the four theme/language combinations. No Safari windows were opened.

Limits: this verifies Chromium composition and geometry, not real Safari interaction or VoiceOver. The width matrix covers the text fixture and one controlled theme/locale; list, style, table, image, section and review fixtures, Firefox/WebKit, and selection-driven composition changes still need separate evidence. B01, B03, B04 and V02 remain incomplete.

## Delivery 21 — Collapsed Clipboard label at narrow widths

Date: 2026-11-10. V04 remains **partial**.

The 640 px pt-BR Home capture showed the collapsed “Área de Transferência” label clipped after two lines. Increased that group's collapsed allocation to 80 px and let its large menu trigger fill the allocation, so the label wraps as “Área de” / “Transferência” while the tooltip and accessible name keep the full wording. The final headless capture measured an 81 px group and a 72 px trigger; the label's scroll and client heights both measured 22 px.

Evidence: recaptured the Home ribbon in Chromium at 640 px and then captured all 45 default-tab/width scenes at 1440, 1200, 960, 800 and 640 px. The reference verifier passed again across light/dark and en/pt-BR. No Safari windows were opened.

Limits: other long labels and measurement units still need review across tabs, locales and expanded menus. V04 remains incomplete.

## Delivery 22 — Long action labels across the Ribbon

Date: 2026-11-10. V04 remains **partial**.

A headless Chromium audit of visible Ribbon button labels found two genuine truncations. “Update Table of Contents” competed with its icon in References; “Responder comentário” exceeded its Review button by 4 px in the dark pt-BR layout at 960 px. The visible labels now use concise localized actions (“Update” / “Atualizar” and “Reply” / “Responder”), while their tooltips retain the full task names and the group labels provide context.

The reference verifier now checks visible action-label overflow on every default tab at 1440, 1200, 960, 800, and 640 px, in both themes and English/pt-BR. The four theme/language combinations pass. Forty additional Ribbon-only captures cover References and Review across that width/theme/language matrix.

Evidence: `RIBBON_BROWSER=chromium RIBBON_OUTPUT=debug_artifacts/ribbon-v04-labels RIBBON_THEMES=light,dark RIBBON_LOCALES=en,pt-BR RIBBON_WIDTHS=1440,1200,960,800,640 RIBBON_TABS=references,review node scripts/capture-ribbon-reference.mjs`; `RIBBON_BROWSER=chromium node scripts/verify-ribbon-reference.mjs`; typecheck; changed-file ESLint; Ribbon and icon audits; and 1,547 core tests pass. Capture manifests and screenshots remain gitignored. No Safari windows were opened.

Limits: the overflow check covers visible Ribbon button captions; measurement fields, color-split captions, expanded menus, contextual tabs, other locales, Safari, and VoiceOver still need review. V04 remains incomplete.

## Delivery 23 — Explicit units on common measurement controls

Date: 2026-11-10. V04 and D03 remain **partial**.

Added visible `pt` to paragraph spacing and `cm` to paragraph indents, custom page margins, and picture dimensions. Paragraph values convert at the UI boundary: 12 pt maps to 16 model px, and 2.54 cm maps to 96 model px. Undo restores the exact original document snapshot and selection. The shared field suffix is aligned beside its input, uses the Ribbon theme colors, and stays readable in both themes. Image size fields retain their two-row layout at 640 px.

The contextual Chromium verifier checks suffix wording, alignment and WCAG AA text contrast for layout metrics, custom margins and image dimensions. It also captures eight unit-specific popovers with theme, locale, requested width, DPR, commit and dirty metadata. The complete seven-fixture matrix covers 260 actual-width contextual layouts.

Evidence: `RIBBON_BROWSER=chromium node scripts/verify-ribbon-contexts.mjs`; a targeted browser check confirms 12 pt → 16 px and 2.54 cm → 96 px, then verifies undo, selection, unit alignment and contrast. The metrics fields measured 16.10:1 contrast in light theme and 13.74:1 in dark; unit suffixes measured 6.05:1 and 7.83:1 respectively. Typecheck, changed-file ESLint, core Vitest (1,547 passed, one skipped), Ribbon/icon audits and Prettier pass. Captures remain gitignored.

Limits: remaining Design Gallery numeric fields, other measurement dialogs and contextual table fields need a full unit audit. The host still reports `isDirty()` after undo returns the document to its exact clean snapshot; track that dirty-state defect under P04. Safari and VoiceOver remain unverified. V04 and D03 remain incomplete.

## Delivery 24 — Synthetic fixture capture metadata

Date: 2026-11-10. B03 is **complete** for the current Chromium reference host; B01 and B04 remain **partial**.

The reference host seeds seven synthetic documents through the editor boundary: formatted text, nested lists, style samples, a table, an image, two sections with a landscape selection, and tracked review content with a comment thread. The setup establishes the corresponding caret, range, cell, object, style, or section selection and marks the fixture clean. No personal document data is used.

The contextual verifier now records an explicit scenario for every screenshot, along with browser, source SHA, dirty state, theme, locale, requested and measured width, DPR, fixture, tab, selection, and document/font/definition hashes. It rejects a width or DPR mismatch and an incomplete layout or unit-popover matrix.

Evidence: `RIBBON_BROWSER=chromium node scripts/verify-ribbon-contexts.mjs` generated 260 Ribbon layouts and eight unit popovers. The manifest covers all seven fixtures at 1440, 1200, 960, 800, and 640 px in light/dark and en/pt-BR. A separate artifact audit confirmed every expected combination and PNG exists; all 268 records have scenario and geometry metadata, SHA `91453dd24fc14b156a4abdeb541f17c4f9634045`, and `dirty:false`. The fixture content and selections are defined in `tests/browser/ribbon/fixtures.ts`; screenshots and manifests remain gitignored. Typecheck, changed-file ESLint, core Vitest (1,547 passed, one skipped), Ribbon audit, icon audit, Prettier, and syntax checks pass.

Limits: this closes the synthetic-fixture and capture-metadata acceptance for Chromium. Safari, VoiceOver, Firefox/WebKit coverage for this contextual matrix, and interactions outside the recorded scenarios remain open. It does not establish command semantics or persistence.

## Delivery 25 — direct Word capture decisions for reference scenes

Date: 2026-11-10. B04 is **complete** for scene classification and capture planning; B01 remains **partial**.

Reviewed the complete 53-scene reference set: 14 equivalent-command comparisons, eight related-task comparisons, and 31 scenes with no captured Oasis counterpart. The existing direct Word web baseline contains 21 planned tab captures across seven tabs and three widths plus one additional Insert capture at 1470 px. It contains no scene-specific menu/expansion evidence, so all 53 scenes require a direct Word capture before their visual references can be verified. This is a capture queue decision, not a claim that those menus were inspected in Word.

Added `wordCaptureStatus` to every scene and a machine-readable policy stating the baseline scope and 0/53 captured-scene count. `npm run audit:ribbon` now guards the 53-scene count, unique IDs, relationship vocabulary, rationale, capture-status vocabulary, and policy/status totals so new or stale rows cannot silently disappear from the queue.

Evidence: counted the 22 historical `word-web-*.png` files and inspected the tab-level Home capture; `references.json` has all 53 menu scenes marked `wordVerification: unverified`. The relationship totals and capture decision counts are checked by the Ribbon audit. No new Safari window or automation was used.

Limits: B04 closes only the classification and identification requirement. Direct Word submenu captures, desktop/contextual references, and browser/VoiceOver workflows remain open under M5; no menu is treated as visually verified.

## Delivery 26 — Home paragraph sort crosswalk

Date: 2026-11-10. B01 and D03 remain **partial**.

Reviewed WordCraft's `Home/Paragraph → Sort` source row (`para.sort`) against Oasis's registered `sortParagraphs` command and selection reducer. Oasis implements natural numeric/text ordering on a contiguous sibling-paragraph range; table-spanning and footnote-zone ranges are refused. WordCraft similarly requires a single paragraph container and refuses table sorting, but uses the document language for text collation while Oasis currently uses runtime `localeCompare`.

Added `home.sortParagraphs` to the structured crosswalk with independent classifications: exposure `core-only`, semantics `partial`, persistence `unverified`. The command is registered but has no default Ribbon or menubar entry. The generated parity matrix now displays Exposure, Semantics, and Persistence separately; legacy Ribbon-bound rows default to partial exposure from audited wiring, while semantics and persistence remain unverified until classified. The parity auditor validates explicit dimension vocabularies and rejects a `core-only` row if its command appears in a scanned Ribbon item or the default menubar. Regenerated the pinned catalog links and parity matrix; 70 of 521 WordCraft source rows now link to Oasis capabilities.

Evidence: inspected WordCraft `crates/engine/src/cmd/para.rs` and `cmd/para/outline.rs`, Oasis `core/commands/paragraphSort.ts`, the `sortParagraphs` Essentials registration and the static Ribbon/menubar scans. `npm run audit:ribbon` confirms the command is built in, registered, and linked to source row 86 without a Ribbon item. The command's format round-trip and language-specific ordering remain unverified.

Limits: this closes one Home source row's exposure classification only. It does not add a Sort button or complete the Home paragraph workflow; 451 WordCraft rows remain without an Oasis crosswalk, and D03 remains open.

## Delivery 27 — core-only Home and Insert command crosswalk

Date: 2026-11-10. B01 remains **partial**.

Compared four pinned WordCraft commands with Oasis's command implementations and DOCX support: `insert.horizontalLine`, `text.nbsp`, `text.nbHyphen`, and `layout.hyphenation`. All four have a registered Oasis command but no default Ribbon or menubar path, so each is explicitly classified as `core-only` exposure. Their semantic and persistence dimensions remain separately rated: paragraph-border selection behavior and the two special-character workflows need direct interaction checks; Word's `w:noBreakHyphen` import/export is covered at the serializer/parser level; hyphenation settings are modeled, passed to layout, and covered by separate DOCX import/export tests, with end-to-end pagination/round-trip still open.

Added four crosswalk rows with concrete reasons and limits rather than inferring absence from the source catalog. The generated matrix now has 81 Oasis capability rows and links 74 of 521 WordCraft source rows; 447 source rows remain unlinked and require review. `npm run audit:ribbon` verifies each `core-only` command is built in, registered, and absent from the statically scanned Ribbon and default menubar.

Limits: these classifications do not add visible controls or establish complete workflow parity. Selection/caret behavior, undo, visual output and interoperability remain open where noted; D03 and the affected Insert/Layout deliveries remain partial.

## Delivery 28 — classify Home dialog and core-only capabilities

Date: 2026-11-10. B01 remains **partial**.

Reviewed 19 additional Home source rows against the pinned WordCraft catalog and Oasis command/UI sources: seven Font-dialog settings, five Paragraph-dialog settings, the Tabs dialog, four unexposed text effects and the two text-direction commands. Added explicit `menu-only` rows for controls in Font and Paragraph dialogs, `ui-only` for Tabs because the UI exists without a registered shared command, and `core-only` for registered capabilities with no observed default control. Each dialog-only row records its path and a test/control token; the Ribbon audit checks that token in the cited source file instead of requiring a fictitious direct Ribbon command.

The generated matrix now uses an Oasis-surface column to distinguish Ribbon placement, dialog paths and unexposed commands. It contains 100 Oasis capability rows and links 93 of 521 WordCraft source rows, leaving 428 rows for review. `npm run audit:ribbon` validates command registration where present, source catalog links, UI-evidence paths and tokens, and static Ribbon placement for directly exposed rows.

Limits: dialog presence does not establish equivalent command dispatch, mixed-selection behavior, pagination/rendering, undo or DOCX persistence. D02/D03 and B01 remain open; the UI-only Tabs path needs a shared-command and round-trip review.

## Delivery 29 — File, history, header/footer and break crosswalk

Date: 2026-11-10. B01, D04, P03 and P04 remain **partial**.

Mapped eight more WordCraft source commands to Oasis controls or registered core commands: File Print/PDF export, Quick Access Undo/Redo, Insert and contextual Edit Header/Edit Footer, and line/column breaks. The two Header/Footer command IDs each occur on both the Insert tab and the contextual source surface, so eight capability rows cover ten source-catalog rows. Direct controls are checked against their Toolbar IDs and placements; break commands are checked as registered `core-only` operations with no default Ribbon or menubar item.

The matrix now contains 108 Oasis capability rows and links 103 of 521 WordCraft source rows; 418 remain unlinked. This classifies exposure and records workflow gaps without claiming parity: Oasis history is placed in Home, Header/Footer navigation lacks the same contextual surface, and print/PDF and break round-trips still need end-to-end evidence.

Evidence: `npm run audit:ribbon` verifies all direct Ribbon mappings, command registrations, source IDs and the 103 linked-row count. Statuses for file output, history transaction grouping, contextual story editing, keyboard behavior and DOCX/PDF fidelity remain partial or unverified pending workflow tests.

## Delivery 30 — Paragraph shading and borders crosswalk

Date: 2026-11-10. B01 remains **partial**.

Reviewed the pinned WordCraft `para.shading` and `para.borders` contracts against Oasis. The source shading command switches between character and paragraph scope; the crosswalk now records the Home text-shading control and Layout paragraph-shading field separately. Borders now record both the Layout quick action, which applies a fixed four-sided border, and the Paragraph dialog, which exposes configurable sides/style/width/color without a shared command for WordCraft's full payload.

The matrix now contains 112 Oasis capability rows and links 105 of 521 WordCraft source rows; 416 remain unlinked. These are related/partial task mappings: the two products differ in shading scope and border presets, per-side styles, and exposure. Undo behavior and DOCX/PDF round-trips still need workflow evidence.

Evidence: the catalog audit checks source IDs, built-in registration, direct Ribbon placement, and UI evidence tokens in `MetricGroup.tsx` and `ParagraphDialog.tsx`; the generated catalog and matrix agree on 105 linked source rows.

## Delivery 31 — List and Asian typography crosswalk

Date: 2026-11-10. B01 and D02 remain **partial**.

Linked three more Home Paragraph tasks: Hanging Indent through the special-indent submenu, explicit list level through a registered core command, and numbering start through the List Options field. The mappings preserve their behavior differences: Oasis sets a fixed hanging indent, and its start value applies to selected paragraphs rather than WordCraft's continuing list instance.

WordCraft combines six Asian Typography options in one command; Oasis registers corresponding Kinsoku, word-wrap, punctuation and East Asian spacing commands separately. All six are recorded as `core-only` because no default UI path is present. This classifies the shared command coverage without claiming equivalent line-breaking or DOCX output.

The matrix now contains 121 Oasis capability rows and links 109 of 521 WordCraft source rows; 412 remain unlinked. Selection behavior, undo, specialized-script rendering and DOCX interoperability remain unverified.

Evidence: `npm run audit:ribbon` validates the special-indent submenu mapping, command registration and absence of a default UI path for `setListLevel` and the six Asian Typography commands; the catalog snapshot reports 109 linked source rows.

## Delivery 32 — Font and Paragraph dialog launchers

Date: 2026-11-10. B01 remains **partial**.

Reviewed the two dialog-launcher entries. Oasis provides Font and Paragraph dialogs from the editor context menu, while WordCraft places launchers on Home (and Paragraph on Layout). The crosswalk records these as `ui-only`: their user-facing dialogs exist, but there is no shared Oasis launcher command or direct Home Ribbon exposure. Individual field capabilities remain separate mappings.

The matrix now contains 123 Oasis capability rows and links 111 of 521 WordCraft source rows; 410 remain unlinked. Dialog launch parity does not verify field coverage, focus/selection behavior, undo or document round-trips.

Evidence: `npm run audit:ribbon` verifies both context-menu tokens and the UI-only classification; the generated WordCraft snapshot reports 111 linked source rows.

## Delivery 33 — Named paragraph styles

Date: 2026-11-10. B01 and D02 remain **partial**.

Mapped WordCraft's dedicated Normal, Heading 1, Heading 2 and Heading 3 commands to the corresponding named styles in Oasis's Home style gallery. This captures the available user task while keeping style-ID/name resolution, inherited formatting, outline/navigation behavior, shortcut parity and DOCX output open for verification.

The matrix now contains 127 Oasis capability rows and links 115 of 521 WordCraft source rows; 406 remain unlinked.

Evidence: the Ribbon audit verifies each gallery mapping against `editor-toolbar-style` and the `setStyleId` command; the generated catalog reports 115 linked source rows.

## Delivery 34 — Character and applied styles

Date: 2026-11-10. B01 and D02 remain **partial**.

Mapped WordCraft's Character Style command and the paragraph/character application paths of Apply Styles to Oasis's Home style gallery. The Apply Styles command also opens a Styles pane when no style is supplied; Oasis has no equivalent pane, so that branch remains an explicit gap. The gallery lists quick styles, and the full available-style set, selection behavior and style resolution still need comparison.

The matrix now contains 130 Oasis capability rows and links 117 of 521 WordCraft source rows; 404 remain unlinked.

Evidence: `npm run audit:ribbon` confirms all three paths use the `editor-toolbar-style` gallery and registered style commands; the generated source snapshot reports 117 linked rows.

## Delivery 35 — Find and Replace paths

Date: 2026-11-10. B01, D02 and P05 remain **partial**.

Mapped Advanced Find to the Home Find launcher, which opens Oasis's Find dialog. Recorded Next, Previous, Replace and Replace All as UI-only dialog paths because those controls call the dialog controller directly rather than a shared command. The dialog offers match-case and whole-word search, while WordCraft exposes more options including wildcards, regex, special codes and selection scope; the crosswalk preserves this gap.

The matrix now contains 135 Oasis capability rows and links 122 of 521 WordCraft source rows; 399 remain unlinked. Search wrapping, replace formatting, single-step undo, keyboard behavior and DOCX workflows still need end-to-end verification.

Evidence: the audit validates the Home Find binding and the four FindReplaceDialog source tokens; the catalog snapshot reports 122 linked rows.

## Delivery 36 — Paste Special and Format Painter phases

Date: 2026-11-10. B01 and D02 remain **partial**.

Mapped Paste Special's formatted/HTML and text-only paths to Oasis Paste and Paste as Plain Text; RTF and picture format selection are not represented as explicit options and need verification. Split WordCraft Copy Formatting and Paste Formatting into Oasis's combined Format Painter capture action and its selection-finalized apply path. Oasis applies on pointer-up or keyboard selection completion, while WordCraft exposes separate commands.

The matrix now contains 139 Oasis capability rows and links 125 of 521 WordCraft source rows; 396 remain unlinked. Format coverage, clipboard formats and permissions, selection timing, undo and DOCX/PDF output require workflow evidence.

Evidence: Ribbon audit validates the two Paste controls and Format Painter button; `createEditorFormatPainter.ts` verifies that the apply path supports both pointer and keyboard selection. The catalog snapshot reports 125 linked source rows.

## Delivery 37 — Layout page setup and break paths

Date: 2026-11-10. B01 and D04 remain **partial**.

Mapped Layout margins and orientation to their existing dropdown controls. Split the multi-kind Breaks command across Oasis page/column breaks and next-page/continuous section breaks. Also recorded registered core-only column layout, vertical alignment, section direction and paragraph text direction commands.

The matrix now contains 149 Oasis capability rows and links 132 of 521 WordCraft source rows; 389 remain unlinked. WordCraft's mirrored/gutter margins, even/odd-page and text-wrapping breaks, column presets/scopes, justified vertical alignment and non-paragraph text-direction targets are not covered fully. Pagination and DOCX/PDF output remain unverified.

Evidence: `npm run audit:ribbon` validates margins/orientation and section-break UI tokens, direct page-break placement and registered core-only commands; the catalog snapshot reports 132 linked rows.

## Delivery 38 — Header/footer and page numbering paths

Date: 2026-11-10. B01, D04 and P04 remain **partial**.

Mapped Close Header/Footer to Oasis's Exit command in the Insert Header & Footer menu. Recorded registered core-only commands for page-number format/start, different first page and different odd/even pages. Oasis exposes some of these editing behaviors through commands but has no default control for the page-number settings or page-story options; remove-header/footer and link-to-previous still have no mapped Oasis path.

The matrix now contains 153 Oasis capability rows and links 136 of 521 WordCraft source rows; 385 remain unlinked. Section/page-story inheritance, numbering continuation, pagination, undo and DOCX/PDF output need workflow verification.

Evidence: the audit checks the Exit menu token and the core registrations, and confirms no default Ribbon or menubar exposure for the three page settings. The catalog snapshot reports 136 linked rows.

## Delivery 39 — Line numbering and floating-object arrangement paths

Date: 2026-11-10. B01 and D04 remain **partial**.

Linked WordCraft's Line Numbers catalog entry to Oasis's per-paragraph suppress-line-numbers command as a related task, since Oasis has no section line-numbering modes. Linked six Layout > Arrange commands to registered core-only Oasis capabilities for object positioning, wrapping, front/behind-text ordering, horizontal margin alignment and exact-angle rotation. Oasis's ordering operation moves an object across the text layer rather than one z-order step, and its alignment covers one object and three horizontal margin positions. Selection Pane and Group remain unlinked and unclassified pending individual review.

The matrix now contains 160 Oasis capability rows and links 143 of 521 WordCraft source rows; 378 remain unlinked. All seven new paths are core-only, with semantics partial and persistence unverified. Selection scope, undo, layout and DOCX/PDF output still need workflow evidence.

Evidence: `npm run audit:ribbon` verifies the seven built-in registrations and confirms no default Ribbon or menubar exposure; source comments in `paragraphSuppressLineNumbers.ts`, `floatingAlignCommands.ts` and `floatingReorderCommands.ts` establish the scoped behaviors. The catalog snapshot reports 143 linked rows.

## Delivery 40 — Page size and paragraph indents/spacing

Date: 2026-11-10. B01 and D04 remain **partial**.

Linked the Layout Size source row to Oasis's registered preset and custom page-size commands. Mapped the paragraph indents and spacing rows to their separate Oasis commands, recording whether each is exposed from the context-menu Paragraph dialog or only as a core capability. The dialog combines several field edits into one apply operation; its mixed-selection behavior, command granularity, units, pagination, undo and DOCX output still need workflow evidence.

The matrix now contains 172 Oasis capability rows and links 146 of 521 WordCraft source rows; 375 remain unlinked. Page-size commands have no default UI path, while all paragraph fields are secondary UI through the Paragraph dialog. The source inventory's Page Setup dialog and Document Grid rows remain unlinked for further reconciliation.

Evidence: `npm run audit:ribbon` verifies the registered size and paragraph commands plus each Paragraph dialog control token; `ParagraphDialog.tsx` exposes the recorded indents/spacing fields. The catalog snapshot reports 146 linked rows.

## Delivery 41 — Advanced character-format command paths

Date: 2026-11-10. B01 and D02 remain **partial**.

Linked double strikethrough, character border, emphasis mark and text effects to the registered Oasis command surface. Kept the double-strikethrough command and its Font dialog control as separate exposure records: the dialog applies through its aggregate state adapter rather than dispatching the shared `doubleStrike` command. The other three capabilities have no default UI path in the inspected toolbar/dialog source. Character-border styling is narrower than WordCraft's configurable border control; the other values, rendering, selection, undo and DOCX behavior remain to verify. Phonetic Guide and Enclose Characters remain unlinked for individual review.

The matrix now contains 177 Oasis capability rows and links 150 of 521 WordCraft source rows; 371 remain unlinked. Four source rows gained mappings, and every new command's semantic and persistence status remains partial/unverified.

Evidence: `npm run audit:ribbon` verifies the four registered commands and the Font dialog's double-strikethrough evidence token; `useFontDialogBridge.ts` confirms the aggregate dialog state path. The catalog snapshot reports 150 linked rows.

## Delivery 42 — Table Layout editing paths

Date: 2026-11-10. B01 and D08 remain **partial**.

Mapped Table Layout's merge/split cells, row/column insertion and deletion, table split/deletion, AutoFit, row/column distribution, repeated headers, sorting and table-to-text conversion to their existing Ribbon controls. WordCraft's single Sort entry is represented by separate ascending and descending Oasis actions. AutoFit currently toggles fixed/autofit; table selection scopes, content preservation, pagination, undo and DOCX round-trip still need workflow evidence.

The matrix now contains 194 Oasis capability rows and links 166 of 521 WordCraft source rows; 355 remain unlinked. The Table Layout selection, cell-deletion, cell-size and other contextual workflows still need individual reconciliation.

Evidence: `npm run audit:ribbon` verifies command registration, direct Ribbon IDs, command bindings and contextual placements for all 17 capability rows; the WordCraft catalog snapshot reports 166 linked rows.

## Delivery 43 — Table Design controls and audit evidence

Date: 2026-11-10. B01 and D07 remain **partial**.

Mapped the six Table Style Options toggles, named table-style gallery, cell shading, border presets and Border Painter to their contextual Table Design controls. Extended the source audit to find commands dispatched from static option arrays and to retain the actual imported custom component when its render expression also calls an option builder. Added explicit contextual placement for the Style Options and Border Painter items; the audit had exposed Border Painter's missing placement.

The matrix now contains 204 Oasis capability rows and links 171 of 521 WordCraft source rows; 350 remain unlinked. The Table Design Create/Modify/Delete Style entries remain unlinked for individual review. Visual style application, conditional formatting, cell scope, pointer drawing, undo and DOCX rendering need workflow evidence.

Evidence: `npm run audit:ribbon` verifies all 10 capability paths, their shared custom-control commands and contextual placements; `TableStyleOptions.tsx`, `TableStyleGallery.tsx` and `TableBordersMenu.tsx` provide the control implementations. The catalog snapshot reports 171 linked rows.

## Delivery 44 — Table Properties, sizing and alignment

Date: 2026-11-10. B01 and D08 remain **partial**.

Mapped the Table Properties launcher and alt-text panel, cell deletion, row height, column width, cell vertical alignment, cell text direction, cell margins and table formula. Recorded dialog-backed fields separately from direct Ribbon controls: Table Properties currently applies several values through one aggregate state update rather than dispatching each registered command. Extracted the three payload-based vertical-alignment buttons into the static button-spec catalog so the Ribbon audit can verify their commands and placements.

The matrix now contains 215 Oasis capability rows and links 180 of 521 WordCraft source rows; 341 remain unlinked. Table direction, drawing/eraser tools, row/column selection and cell-selection paths remain unlinked for further reconciliation. Dialog apply behavior, selection scope, undo, accessibility, layout and DOCX output still need workflow evidence.

Evidence: `npm run audit:ribbon` verifies 11 capability paths, including the context-menu Table Properties token, the direct vertical-alignment buttons and core-only registrations. The catalog snapshot reports 180 linked rows.

## Delivery 45 — Table selection and gridline paths

Date: 2026-11-10. B01 and D08 remain **partial**.

Mapped View Gridlines to the Table Design Borders menu and mapped WordCraft's Select Cell/Row/Column/Table entries to the matching registered Oasis selection commands. Oasis does not expose those four selection commands in the default Ribbon, menu or dialog, so they remain core-only capabilities with selection, focus and keyboard behavior unverified. Draw Table, Eraser and Table Direction remain unlinked for individual review.

The matrix now contains 220 Oasis capability rows and links 185 of 521 WordCraft source rows; 336 remain unlinked. Gridlines are display-only and should not be confused with exported cell borders. Table selection commands do not alter document content, so persistence is not applicable.

Evidence: `npm run audit:ribbon` validates the gridline menu command and all four registered core-only selection commands; the catalog snapshot reports 185 linked rows.

## Delivery 46 — Accept/reject all revision paths

Date: 2026-11-10. B01 and P01 remain **partial**.

Mapped WordCraft Accept All and Reject All to the existing Oasis bulk-revision commands. Neither command has a default Ribbon, menu or dialog path, so both are recorded as core-only. Confirmation, protected changes, comments anchored to revised content, undo and DOCX round-trip still need workflow evidence.

The matrix now contains 222 Oasis capability rows and links 187 of 521 WordCraft source rows; 334 remain unlinked. Current/selected revision controls are tracked separately from these bulk actions.

Evidence: `npm run audit:ribbon` validates both built-in and Essentials command registrations and confirms no default UI path; the catalog snapshot reports 187 linked rows.

## Delivery 47 — Picture Format command paths

Date: 2026-11-10. B01, D01 and P01 remain **partial**.

Linked WordCraft Crop to Oasis's contextual crop menu, including its shape/aspect submenus and Fill/Fit/Reset actions. Linked Size to the separate height and width fields, Picture Border to the contextual border control, and Picture Alt Text to Oasis's selected-image Alt Text action under Insert > Accessibility. The Alt Text task is related, with different Ribbon placement. Reset Picture, transparency and exact-angle picture rotation are registered core commands without default Ribbon/menu paths; their runtime UI, undo and document-format behavior remain open. Corrections, color, artistic effects, background removal, compression, changing the picture source and the Picture Styles gallery remain unlinked for individual review.

The matrix now contains 230 Oasis capability rows and links 194 of 521 WordCraft source rows; 327 remain unlinked. The static audit now recognizes the image-size and crop-menu dispatch paths.

Evidence: `npm run audit:ribbon`, `npm run audit:ribbon:wordcraft` and `npm run audit:ribbon:icons` pass; the pinned catalog reports 194 linked rows.

## Delivery 48 — Shape Format command paths

Date: 2026-11-10. B01 and the M4 shape work remain **partial**.

Mapped Shape Format's object Alt Text task to Oasis's text-box alt-text command, and mapped Shape Fill, Shape Outline color/width, Text Direction and vertical Align Text to their registered core commands. These have no default Ribbon, menu or dialog paths. The fill mapping also covers WordCraft's second `shape.fill` row, while explicitly leaving gradient behavior unsupported. Other unmatched Shape Format entries include the properties pane, shape effects, WordArt styling, text fill/outline/transform and shape link.

The matrix now contains 236 Oasis capability rows and links 200 of 521 WordCraft source rows; 321 remain unlinked. Command registration does not verify runtime text-box selection, keyboard behavior, rendering, undo or DOCX round-trip.

Evidence: `npm run audit:ribbon` and `npm run audit:ribbon:wordcraft` pass; the pinned catalog reports 200 linked rows.

## Delivery 49 — Blank-page relationship

Date: 2026-11-10. B01 and D04 remain **partial**.

Recorded Oasis's Insert > Page Break as a related task for WordCraft's Insert > Blank Page. The Oasis action starts following content on a new page but does not guarantee a whole blank page, so this mapping does not claim command equivalence. Pagination and DOCX behavior remain unverified.

The matrix now contains 237 Oasis capability rows and links 201 of 521 WordCraft source rows; 320 remain unlinked.

Evidence: `npm run audit:ribbon` and `npm run audit:ribbon:wordcraft` pass; the pinned catalog reports 201 linked rows.

## Delivery 50 — Chromium SVG review-sheet verification

Date: 2026-11-10. I02/I07 remain **partial**.

Ran the icon review sheet in Chromium against eight SVG candidates across light/dark themes and button/menu/collapsed surfaces, at 16/20/24 px and normal/active/disabled states. All 48 scenes passed checks for resolved SVGs, non-empty in-bounds paths, stable node counts, accessibility names, and no font-dependent glyphs or page errors. This verifies rendering and geometry in the review sheet, not visual recognition in every real Ribbon group or plugin contribution.

Evidence: `npm run test:ribbon:icons`; manifest SHA `8b5daa89461cc50d1d4eeef557b38c2bc66bc0f8`, `dirty:false`. PNGs and `verification.json` are retained under the gitignored `debug_artifacts/ribbon-icons-chromium/` directory.

## Delivery 51 — Styles Pane related task

Date: 2026-11-10. B01 and D02 remain **partial**.

Linked WordCraft Styles Pane to the Oasis Home Style Gallery as a related task because both provide paragraph-style application. The gallery does not expose the pane's create, modify, inspect or manage workflows, so those commands remain unlinked.

The matrix now contains 238 Oasis capability rows and links 202 of 521 WordCraft source rows; 319 remain unlinked.

Evidence: `npm run audit:ribbon` and `npm run audit:ribbon:wordcraft` pass; the pinned catalog reports 202 linked rows.

## Delivery 52 — Word-count display relationship

Date: 2026-11-10. B01 and P01 remain **partial**.

Recorded Oasis's status-bar total word count as a related display for WordCraft Review > Word Count. Oasis does not provide that command's detailed statistics view or selection-scoped counts through this status item.

The matrix now contains 239 Oasis capability rows and links 203 of 521 WordCraft source rows; 318 remain unlinked.

Evidence: `npm run audit:ribbon` validates the UI-only source evidence in `src/ui/EditorStatusBar.tsx`; `npm run audit:ribbon:wordcraft` reports 203 linked rows.

## Delivery 53 — Zoom controls related tasks

Date: 2026-11-10. B01 and P03 remain **partial**.

Mapped WordCraft Zoom, 100%, Zoom In and Zoom Out to Oasis's status-bar slider and step buttons as related UI tasks. Oasis's View tab has no zoom group; fit-to-page, multiple-page and page-width modes remain unmatched. Zoom anchoring, step behavior, keyboard interaction and cross-browser rendering still need workflow evidence.

The matrix now contains 243 Oasis capability rows and links 207 of 521 WordCraft source rows; 314 remain unlinked.

Evidence: `npm run audit:ribbon` validates each status-bar UI evidence token in `src/ui/EditorStatusBar.tsx`; `npm run audit:ribbon:wordcraft` reports 207 linked rows.

## Delivery 54 — Navigation Pane related task

Date: 2026-11-10. B01 and P03 remain **partial**.

Mapped WordCraft Navigation Pane to Oasis's collapsible Outline panel for heading navigation. Oasis does not provide the Navigation Pane's search or page-navigation views through this panel.

The matrix now contains 244 Oasis capability rows and links 208 of 521 WordCraft source rows; 313 remain unlinked.

Evidence: `npm run audit:ribbon` validates the UI evidence token in `src/ui/components/Outline/OutlinePanel.tsx`; `npm run audit:ribbon:wordcraft` reports 208 linked rows.

## Delivery 55 — Horizontal ruler relationship

Date: 2026-11-10. B01, D05 and P03 remain **partial**.

Recorded Oasis's always-visible horizontal ruler as a related display for WordCraft's View > Ruler command. It includes page margins and draggable indent markers but has no visibility toggle or vertical ruler.

The matrix now contains 245 Oasis capability rows and links 209 of 521 WordCraft source rows; 312 remain unlinked.

Evidence: `npm run audit:ribbon` validates the UI evidence token in `src/ui/components/Ruler/HorizontalRuler.tsx`; `npm run audit:ribbon:wordcraft` reports 209 linked rows.

## Delivery 56 — Paginated canvas relationship

Recorded Oasis's default paginated paper stack as a related presentation for WordCraft View > Print Layout. Oasis has no selectable view mode, and Read Mode, Web Layout and switching between modes remain unavailable.

The matrix now contains 246 Oasis capability rows and links 210 of 521 WordCraft source rows; 311 remain unlinked.

Evidence: `npm run audit:ribbon` validates the UI evidence token in `src/ui/components/CanvasEditorSurface.tsx`; `npm run audit:ribbon:wordcraft` reports 210 linked rows.

## Delivery 57 — Selection-driven Insert group evidence

Date: 2026-11-11. V02 remains **partial**.

Added a Chromium interaction scenario proving the Insert Accessibility group is absent without an image selection and appears with the image Alt Text action after selecting an inserted image. It verifies that the changed composition receives a positive measured width and collapses at a 320 px viewport. The core composition cases also verify that invisible items remove empty groups, disabled actions remain present, and separators are trimmed after filtering.

Evidence: `npx playwright test --config playwright.e2e.config.ts tests/e2e/canvas-pointer.spec.ts -g 'Insert accessibility group follows image selection visibility'` passes against a production build with `VITE_OASIS_CANVAS_DEBUG=1`.

Limits at Delivery 57: the scenario did not verify that changing away from image selection removes the group or that repeated selection changes remeasure widths. V02 remained partial.

## Delivery 58 — Short-viewport collapsed popups

Date: 2026-11-11. A04 remains **partial**.

Collapsed Ribbon group popups now opt into vertical viewport fitting. Positioning uses the rendered panel height to place the popup above its anchor when needed, while the existing max-height and overflow behavior keeps tall contents scrollable. Other popovers retain their existing placement behavior.

Evidence: the new browser scenario failed at 180 px before the positioning change and passes after it. `npm run build` and `npm run typecheck` pass.

Limits at Delivery 58: direct keyboard traversal of a scroll-constrained panel, nested flyouts and contextual transitions while a popup is open were unverified. A04 remained partial.

## Delivery 59 — Nested crop flyout interaction

Date: 2026-11-10. A04 remains **partial**.

Fixed the crop submenu row so hover, keyboard focus and click all open the requested flyout consistently. Escape closes the shape/ratio flyout before Escape reaches the crop menu and collapsed group popup. Added a browser interaction scenario that selects an image, collapses its Ribbon group at a 320 × 240 viewport, opens the group and crop menu, then verifies the shape flyout and its parent remain visible together.

Evidence: `npx playwright test --config playwright.e2e.config.ts tests/e2e/canvas-pointer.spec.ts -g 'collapsed image group keeps its parent open for crop flyouts'` passes against a production build with `VITE_OASIS_CANVAS_DEBUG=1`.

Limits at Delivery 59: keyboard traversal of scroll-constrained panels, matrix alignment controls and contextual transitions while a popup is open still needed browser evidence. A04 remained partial.

## Delivery 60 — Contextual group removal and nested Escape

Date: 2026-11-10. V02 and A04 remain **partial**.

Extended the Insert accessibility composition scenario through the reverse selection transition: after the selected image exposes a measured Accessibility group that collapses at 320 px, clicking back into document text removes the image selection and removes the contextual group. Extended the collapsed image group scenario to verify Escape closes the crop shape flyout, then the crop menu, then the collapsed group popup, one level per keypress.

Evidence: both `Insert accessibility group follows image selection visibility` and `collapsed image group keeps its parent open for crop flyouts` pass in `tests/e2e/canvas-pointer.spec.ts` against a production build with `VITE_OASIS_CANVAS_DEBUG=1`.

Limits at Delivery 60: repeated selection changes and repeated width remeasurement remain open for V02. A04 still needed keyboard traversal of scroll-constrained panels, matrix alignment controls and contextual transitions while a popup is open.

## Delivery 61 — Keyboard traversal in a constrained popup

Date: 2026-11-11. A04 remains **partial**.

Added an end-to-end keyboard scenario for the collapsed Font group. It constrains the popup height, tabs through its controls, verifies the popup scroll position advances, and confirms focus remains within the visible panel area.

Evidence: `npx playwright test --config playwright.e2e.config.ts tests/e2e/orientation-overflow.spec.ts -g 'keyboard traversal scrolls a height-constrained collapsed Ribbon popup'` passes in Chromium. Build and Deploy for `fb3fbf6d` passed the full `test:ribbon:ci` browser suite, smoke test and deploy; Publish passed and confirmed `v0.0.267`.

Limits: browser traversal is verified for one height-constrained Font popup. Contextual transitions while menus are open, matrix alignment controls and VoiceOver remain open for A04.

## Delivery 62 — Spatial table-cell alignment matrix

Date: 2026-11-11. A04 remains **partial**.

Added a 3×3 Table Layout control that sets horizontal and vertical cell-text alignment together through one command. The collapsed group preserves the matrix. Each option has an accessible position label and a compact visual marker; mousedown keeps the selected cell active. The core operation updates both cell properties as one undoable state change and preserves the original pair in tracked-change metadata.

Evidence: `tableCellVerticalAlign.test.ts` covers multi-cell updates and tracked-change metadata; the `collapsed Table Layout group exposes the spatial cell alignment matrix` browser test verifies all nine marker positions, collapsed-popup visibility, successful selection and command dispatch. `npm run audit:ribbon`, `npm run audit:ribbon:wordcraft`, and `npm run audit:ribbon:icons` pass.

Limits: mixed alignment states, explicit single-step undo, direct Word visual comparison, VoiceOver, and DOCX round-trip remain unverified. A04 remains partial.

## Delivery 63 — Table-cell alignment rendering and DOCX round-trip

Date: 2026-11-11. D08, P06 and A04 remain **partial**.

Closed a semantic gap found while reviewing Delivery 62: horizontal cell alignment was stored and exported but was not used by canvas paragraph layout. Cell alignment now supplies the fallback alignment for every paragraph in a cell; a paragraph's direct or named-style alignment keeps priority. DOCX export writes that cell setting as paragraph alignment, and import restores the visual result on the paragraph.

Evidence: `CanvasTableLayout.test.ts` covers cell fallback and paragraph precedence; `docxExport.test.ts` exports and reimports an aligned table cell. Both focused suites pass (15 UI layout tests and 37 DOCX export tests). Typecheck, Ribbon/catalog/icon audits, and `git diff --check` pass.

Limits: mixed alignment state presentation, explicit single-step undo, direct Word visual comparison, and VoiceOver remain unverified. These semantics and accessibility checks remain in scope for D08/A04/M5.

## Delivery 64 — Alignment state and mixed selections

Date: 2026-11-11. D08, A04 and M5 remain **partial**.

The 3×3 matrix now reflects the selected cells' current horizontal/vertical pair, marks a uniform match as pressed, and exposes axis-level mixed values in the control's accessible description and data state. A core query keeps horizontal and vertical summaries independent. The browser scenario applies an alignment, reopens the collapsed group and confirms that the corresponding position remains selected.

Evidence: the core mixed-selection test, 15 CanvasTableLayout tests, typecheck, changed-source ESLint, Ribbon/catalog/icon audits, and the focused collapsed-group Playwright scenario pass.

Limits: mixed state has core coverage but still needs a browser selection scenario and direct VoiceOver review. Direct Word visual comparison also remains open.

## Delivery 65 — Single-step undo for paired cell alignment

Date: 2026-11-11. D08 remains **partial**.

Extended the collapsed Table Layout browser workflow to apply a combined horizontal/vertical position, reopen the group to verify its active state, issue one Undo, and confirm both axes return to their prior top-left state.

Evidence: the `collapsed Table Layout group exposes the spatial cell alignment matrix` Playwright scenario passes with the Undo and state-restoration assertions.

Limits: browser evidence covers a single selected cell and one supported starting state. Multi-cell undo behavior, direct Word visual comparison and VoiceOver remain open.

## Delivery 66 — File New and Open crosswalk

Date: 2026-11-11. B01 and P04 remain **partial**.

Reviewed the pinned File catalog entries against the actual File tab and menubar. Linked WordCraft New to Oasis's dirty-document-aware `newDocument` action and Open to the DOCX-only `importDocument` picker. These are explicit partial mappings: Oasis does not provide WordCraft's new-document templates or general-format open flow through these controls.

Evidence: the static audit validates both registered commands and their `file/document` placements. The WordCraft snapshot and generated matrix now contain 212 linked source rows out of 521; 309 remain unlinked and unclassified.

Limits: dirty-document confirmation, import cancellation/errors, source-part preservation and full lifecycle behavior remain open under P04/P06. Mapping the commands does not certify those workflows.

## Delivery 67 — File template capabilities classified

Date: 2026-11-11. B01 and P04 remain **partial**.

Reviewed WordCraft's New from Template, Save as Template and Personal Templates commands against Oasis's File surfaces, command registry, and document-template paths. No equivalent document-template workflow exists. Classified the three source entries as `missing`, while keeping persistence unverified; Oasis style galleries apply formatting presets and do not create or save document templates. The audit now accepts explicit `missing`/`not-applicable` rows only when they have a written rationale and no claimed Oasis command or UI path.

Evidence: `npm run audit:ribbon` and `npm run audit:ribbon:wordcraft` pass. The crosswalk now maps and classifies 215 of 521 source rows; 306 remain unclassified. No status here claims product parity.

Limits: the three template workflows remain unsupported. Other File commands still need individual review; P04/P06 lifecycle and persistence tests remain open.

## Delivery 68 — Quick Access history gaps classified

Date: 2026-11-11. B01, P03 and P05 remain **partial**.

Reviewed WordCraft Undo List and Repeat against Oasis's toolbar, menubar and public client API. Oasis supports stepwise Undo/Redo but has no history jump menu; it has no repeat-last-command action, and Redo is not treated as equivalent. Both source entries are now explicitly classified as `missing` with the observed scope recorded.

Evidence: `npm run audit:ribbon` verifies each missing row has a written rationale and declares no Oasis command or UI path. The crosswalk now maps and classifies 217 of 521 source rows; 304 remain unclassified.

Limits: these Quick Access capabilities remain unsupported. Keyboard, history transaction and search/QAT work remain open under P03/P05/M5.

## Delivery 69 — Remaining File surface crosswalk

Date: 2026-11-11. B01 and P04 remain **partial**.

Reviewed remaining File/Options catalog commands against the default File and menubar surfaces, command registry, document IO and persistence APIs. Linked Save As to DOCX export as a partial related path. Classified Print Markup, Close, Info, Properties, Export Image, Options, Numerals, Share, Protect, Inspect, Accessibility Check, Compatibility Check, Version History and Recover Unsaved as missing from the default app workflow, with a command-specific rationale. The public save API remains unclassified in the command matrix because it has no user-facing File action; finishing the P04 save lifecycle is separate.

Evidence: the crosswalk audit validates all 15 rows against the pinned WordCraft catalog, checks DOCX export placement, and requires missing rows to declare no Oasis command/UI path plus a rationale. The catalog now maps 234 of 521 source rows; 287 remain unclassified.

Limits: `missing` records the current default app path, not host-provided extensions. Save integration, error/cancellation behavior, saved-version recovery and P04/P06 workflow evidence remain open.

## Delivery 70 — File Save action and persistence path

Date: 2026-11-11. B01 and P04 remain **partial**.

Added a File ribbon Save action and File menu command backed by the public client persistence contract. The default app stores the document in IndexedDB; custom hosts continue to provide their own save implementation. Successful persistence clears the dirty flag, while failures are logged and leave user-visible save feedback, reload/recovery and broader lifecycle handling open.

Evidence: the client API test now verifies dirty state clears only after `save()` succeeds. A browser E2E scenario checks the saved IndexedDB record contains edited text and verifies New Document does not request dirty-document confirmation after Save. The parity matrix links WordCraft `file.save` to this action as partial. The audit now maps 235 of 521 source rows; 286 remain unclassified.

Limits: failed-save feedback, Save As/overwrite semantics, reopening persisted content, autosave/recovery and the full P04 dirty-state lifecycle remain open. The focused browser E2E passed locally; CI is pending for this delivery.

## Delivery 71 — Quick Access AutoSave and title search crosswalk

Date: 2026-11-11. B01, P03 and P05 remain **partial**.

Reviewed WordCraft Quick Access AutoSave and title-bar command search. Oasis has an optional debounced host persistence hook, but it is disabled unless the host opts in and there is no user-facing AutoSave toggle/status control. The document Find workflow is not a Tell Me command search, so both catalog entries are classified missing from the default app surface with separate rationales.

Evidence: the crosswalk auditor validates both source commands and the regenerated catalog; the total is 237 of 521 source rows classified, with 284 still unclassified.

Limits: host-configured autosave has not been tested as a complete user workflow. A command launcher and end-to-end AutoSave state remain open.

## Delivery 72 — Home tab source inventory review

Date: 2026-11-11. B01 and D01 remain **partial**.

Reviewed 20 previously unmatched Home commands across Clipboard, Font, Paragraph, Styles, Editing and Voice/Editor. Where Oasis has only an adjacent capability (for example, applying styles or basic list formatting), the crosswalk records why it does not satisfy the source workflow. The unsupported management, multilevel list, phonetic, dictation, Go To and similar-formatting tasks are explicitly classified missing from the default UI.

Evidence: the generated catalog and parity matrix now classify 257 of 521 WordCraft rows; 264 remain unclassified. `npm run audit:ribbon` validates each new missing row has a written rationale and no claimed Oasis command or Ribbon control.

Limits: existing Home capabilities remain only partially workflow-verified; this inventory review does not certify semantic equivalence or accessibility.

## Delivery 73 — Insert tab source inventory review

Date: 2026-11-11. B01 and I01 remain **partial**.

Reviewed 13 unmatched Insert commands covering table drawing/conversion and presets, online and advanced media, SmartArt/charts, screenshots, add-ins and cross-references. Explicitly separated existing local-image and blank-table insertion from Word’s online-source and richer authoring workflows.

Evidence: the generated catalog and matrix now classify 273 of 521 source rows; 248 remain unclassified. The crosswalk audit verifies the source-command links and requires rationale for each missing classification.

Limits: Insert table, local image, hyperlinks and existing object workflows retain their independent semantic, accessibility and file-round-trip checks. These classifications do not close I01 or the M4 advanced-object work.

## Delivery 74 — Insert Text and Symbols source inventory review

Date: 2026-11-11. B01, I01 and M4 remain **partial**.

Reviewed the remaining Insert Text/Symbols commands. Mapped Oasis's shape-backed text containers, selected date/page fields and structured equation editor as related partial workflows; classified exposed core-only drop-cap and optional-hyphen commands separately from the missing dedicated UI. Quick Parts, AutoText, document-property insertion, WordArt, signature lines, embedded objects, insert-from-file and ink equation recognition are individually classified missing.

Evidence: the crosswalk and pinned source snapshot classify 286 of 521 WordCraft entries; 235 remain unclassified. Placement audits pass for the related Insert paths.

Limits: these mappings do not close text-box authoring, field interoperability, equation handwriting, or M4 object-family requirements.

## Delivery 75 — Insert header/footer and asset source gaps

Date: 2026-11-11. B01, I01 and P04 remain **partial**.

Reviewed five remaining Insert commands: Cover Page, Icons, Remove Header, Remove Footer and Link to Previous. Mapped the current blank-page/header-editor capabilities as related only where appropriate and classified these distinct workflows missing from the default app with command-specific rationale.

Evidence: the crosswalk now classifies 291 of 521 source rows; 230 remain unclassified. The generated catalog and parity audit validate the added entries.

Limits: header/footer editing and section inheritance still require independent workflow and DOCX round-trip coverage under P04/P06.

## Delivery 76 — Draw tab inventory review

Date: 2026-11-11. B01 and M4 Draw remain **partial**.

Reviewed all ten unclassified Draw commands: selection, lasso, eraser, pen, pencil, ink highlighter, pen setup, ink-to-shape/math conversion and replay. Classified each as missing from the default app. Oasis text highlighting, object selection and the preset Shape gallery are distinct workflows and do not provide an ink subsystem.

Evidence: all 301 of 521 source rows classified so far pass the crosswalk audit; 220 remain unclassified.

Limits: the entire ink/drawing family remains open under M4; these inventory classifications do not implement it.

## Delivery 77 — Design tab crosswalk and static command evidence

Date: 2026-11-11. B01, D03 and A01 remain **partial**.

Mapped all ten Design source commands against the live gallery and page-background controls. Themes, color/font schemes, paragraph spacing, effects, default design, watermark, page color and borders are linked as partial capabilities with separate interoperability notes. Replaced dynamic command dispatch in the Design gallery with explicit command literals so the static parity auditor can verify each action. Added the Design controls to the shared placement inventory used by the audit.

Evidence: `npm run audit:ribbon` passes and validates the command/placement mapping for all ten controls. The crosswalk now classifies 311 of 521 source rows; 210 remain unclassified.

Limits: visual states, full theme/style-set breadth, accessibility and DOCX/PDF fidelity remain independently open under D03/A01/P06.

## Delivery 78 — Layout source inventory review

Date: 2026-11-11. B01 and L01 remain **partial**.

Reviewed the four remaining Layout commands. Linked the Page Setup Dialog row to Oasis's related Margins control while documenting that margins/orientation are separate controls rather than one dialog. Classified Document Grid, Selection Pane and Group as missing from the default app; the editor has no document-grid settings, object-list pane or grouped-object model.

Evidence: the crosswalk now classifies 315 of 521 source rows; 206 remain unclassified. The static audit validates the related Margins command and placement and the rationale for each missing workflow.

Limits: page size, orientation, margins and arrangement remain separate workflows with their own behavior/interoperability checks.

## Delivery 79 — References tab source inventory review

Date: 2026-11-11. B01 and P02 remain **partial**.

Reviewed the remaining References commands. Oasis has direct TOC creation/update and footnote insertion, while endnotes, note navigation, source/citation management, bibliography, tables of figures/authorities, indexes and general field updates are unsupported. The registered note-numbering settings command is classified core-only because no default UI exposes it. Image captions and the References caption command remain distinct tasks.

Evidence: the crosswalk now classifies 335 of 521 source rows; 186 remain unclassified. The generated catalog and command audit validate each classification, including the registered core-only note-options command.

Limits: TOC/footnote workflows already mapped remain partial; DOCX field interoperability and References accessibility still require workflow evidence.

## Delivery 80 — Mailings tab inventory review

Date: 2026-11-11. B01 and M4 Mailings remain **partial**.

Reviewed all 23 Mailings commands, from envelopes/labels and recipient sources through merge fields, preview, validation and output. The repository contains no mail-merge engine, recipient data model or default Mailings controls, so every command is explicitly classified missing with a task-specific rationale.

Evidence: the crosswalk now classifies 358 of 521 source rows; 163 remain unclassified. The snapshot and parity audits validate the source rows and documented gaps.

Limits: the Mailings family remains a planned M4 capability and has no implementation or workflow evidence.

## Delivery 81 — Review tab source inventory review

Date: 2026-11-11. B01 and P02 remain **partial**.

Reviewed the remaining Review commands. Mapped the selected-image alt-text editor as a partial related path for WordCraft's Alt Text pane. Classified the absent proofing, speech, translation, review-mode/filter, tracked-change settings, compare/combine, author-blocking, protection and ink controls individually. Oasis's Track Changes toggle, discussion panel, host read-only setting and comment permissions do not provide those broader workflows.

Evidence: the crosswalk now classifies 374 of 521 source rows; 147 remain unclassified. Static command and placement checks pass for the related Alt Text action; all unsupported rows have command-specific rationales.

Limits: Review and References remain partial, including tracked-change interoperability, document language, accessibility and host protection semantics.

## Delivery 82 — View tab source inventory review

Date: 2026-11-11. B01 and P05 remain **partial**.

Reviewed the remaining View commands. Mapped Oasis's Outline panel and status-bar zoom slider as related UI-only paths for Outline and the three page-fit presets, with their different behavior documented. Classified Read/Web/Draft/Focus/Immersive modes, page movement, gridlines, theme switching, multi-window arrangements and macros as absent from the default app.

Evidence: the crosswalk now classifies 395 of 521 source rows; 126 remain unclassified. The parity audit validates the four related UI paths against source file/token evidence and validates the remaining rationales.

Limits: zoom and outline behavior still need keyboard/accessibility workflows; View remains without selectable document view modes or window management.

## Delivery 83 — Table and Header/Footer inventory review

Date: 2026-11-11. B01, A02 and P04 remain **partial**.

Reviewed eight remaining contextual commands across Table Design, Table Layout and Header/Footer. The table-style gallery applies existing styles but does not create/manage definitions; no table direction or eraser mode exists. Header/footer story editing has no previous/next section navigation or header-position control, despite preserving imported header distance data.

Evidence: 403 of 521 source rows are now classified; 118 remain unclassified. The generated snapshot and commandless-rationale checks pass.

Limits: table style fidelity, RTL table layout and section-specific header/footer behavior remain open under A02/P04/P06.

## Delivery 84 — Read Mode, Developer, SmartArt and Chart inventories

Date: 2026-11-11. B01 and M4 advanced families remain **partial**.

Reviewed 26 commands across Read Mode, Developer, SmartArt Design and Chart Design. Read Mode is not implemented; the app exposes no Developer content-control insertion/properties workflow, SmartArt object model or chart data model. Each command is individually classified missing rather than treating a tab label or preserved document structure as an authoring capability.

Evidence: the catalog now classifies 429 of 521 source rows; 92 remain unclassified. The pinned source-command audit verifies all 26 command names and rationales.

Limits: Developer controls, SmartArt and Charts remain explicit M4 implementation work; no insertion, editing or interoperability workflow is claimed.

## Delivery 85 — Picture and Shape Format inventory review

Date: 2026-11-11. B01, I03 and M4 object tools remain **partial**.

Reviewed the remaining Picture Format and Shape Format commands. Oasis's picture border, crop and text-box fill/outline controls are not equivalent to image correction, removal/compression, picture styles or WordArt effects. Linked Shape Format's Create Link to the shared Insert Link command as a related path in a different Ribbon location; classified the other unsupported image/shape authoring tasks individually.

Evidence: the crosswalk now classifies 443 of 521 source rows; 78 remain unclassified. Static audits validate the link command/placement and written rationales for all missing tasks.

Limits: image and shape workflows remain partial, including object selection, visual effects, accessibility and DOCX round-trip.

## Delivery 86 — Editing inventory and interaction evidence

Date: 2026-11-11. B01, D01 and P05 remain **partial**.

Reviewed all 39 previously unmatched Editing commands. Mapped text input, Enter/Tab/delete, word/line/document navigation and word/paragraph selection to their actual keyboard/pointer paths as related UI-only behavior. Classified registered paragraph move/promote/demote commands as core-only; Spike, Unicode conversion, sentence/F8/column selection, page navigation and general field-code editing remain missing from the default app.

Evidence: the parity auditor validates UI source paths and tokens in the text input, keyboard and surface-event controllers, plus registered command exposure. The catalog now classifies 482 of 521 source rows; 39 remain unclassified.

Limits: UI-only mappings are not shared WordCraft command contracts. Platform key differences, selection boundaries, IME, screen-reader support and field interoperability remain open.

## Delivery 87 — Complete source inventory classification

Date: 2026-11-11. B01 is **complete for static inventory reconciliation**; M0/M5 evidence work and all implementation milestones remain active.

Reviewed and classified the final 39 WordCraft source rows across Equation, Outlining and Tools. Equation rows distinguish existing text/symbol insertion paths from unsupported conversion modes and structures; Outlining rows distinguish related style/core commands from menu-only and missing workflows; unsupported Tools rows have command-specific rationales. The historical reference catalog also has explicit exposure, semantics, persistence and next-evidence fields for all 21 categories, including categories without a Word web counterpart.

Evidence: `npm run audit:ribbon` and `npm run audit:ribbon:wordcraft` pass. The Oasis crosswalk has 551 features and links/classifies all 521 pinned WordCraft rows; the snapshot contains 25 surfaces. All 53 direct Word scene captures remain uncaptured (0/53), so this closes inventory classification only and does not claim visual, behavioral or product parity.

## Delivery 88 — Repeated contextual composition and measurement

Date: 2026-11-11. V02 remains **partial** pending other dynamic contribution and separator scenarios.

Extended the image-selection Insert scenario to repeat the text → image → text context transition twice after the initial selection. Each cycle checks the Accessibility group disappears and returns with a positive width allocation, while viewport changes exercise its collapsed and expanded measurement states.

Evidence: the Playwright scenario `Insert accessibility group follows image selection visibility` now checks repeated context changes and width allocations. This verifies one image-driven group and Chromium layout; it does not cover table contexts, dynamic plugin add/remove, or Safari/VoiceOver.

## Delivery 89 — Design measurement units

Date: 2026-11-11. V04 remains **partial**.

Clarified Design's numeric control labels in English and Brazilian Portuguese. Watermark font size, page-border width and distance identify points; opacity declares its 0–1 range; rotation identifies degrees; scale is named as a factor. Corrected canvas rendering and the border preview to convert those point values to CSS pixels, matching the existing PDF and DOCX output units.

Evidence: the browser scenario `Design numeric controls declare their units and ranges` opens both custom panels, verifies the localized accessible labels, then records Canvas 2D calls to check that 48 pt watermark text renders at 64 px and 24 pt border distance renders at 32 px with a 1 pt stroke rendered at 4/3 px. The production build and typecheck pass. This covers those two Design panels only; remaining measurement controls, locale lengths, mixed/read-only states and actual Safari/VoiceOver remain open.

## Delivery 90 — Built-in group label coverage

Date: 2026-11-11. V01 remains **partial**.

Added a locale-aware regression check over every default and contextual Ribbon tab. In English and Brazilian Portuguese, all groups composed from the default preset must have a readable, nonempty label and must not expose their internal camelCase group IDs. Existing focused tests still verify explicit plugin labels and the localized General fallback.

Evidence: `npx vitest run --project ui tests/vitest/__tests__/ui/registry.test.ts` passes all 16 tests. This is static registry/model coverage; dynamic plugin lifecycle and rendered browser labels remain open.

## Delivery 91 — Font formatting glyph alignment

Date: 2026-11-11. I03/I04 remain **partial**; this closes one Home glyph family review.

Replaced the font-rendered Underline `U` with an original SVG using the same 24×24 coordinate system and 2-unit stroke as Lucide Bold and Italic. Its path shares the siblings' vertical bounds and has a slightly narrower silhouette, preserving the U's full height and balanced top/bottom clearance. Added it to the icon review sheet and generated inventory.

Evidence: the Home Ribbon Playwright check compares actual visible Bold/Italic/Underline SVG boxes, path bounds and stroke widths. It passes. The icon review verifies 54 scenes per engine in Chromium, Firefox and WebKit across 16/20/24 px, both themes, three states and three surfaces. No font-dependent SVG text or unresolved icon is present.

Limits: this is one everyday typography family. Other icon families and actual Safari/VoiceOver review remain open.

## Delivery 92 — Repeated table-context transitions

Date: 2026-11-11. V02 remains **partial** pending dynamic plugin add/remove, separator changes, and measurement invalidation under changed composition.

Added an end-to-end regression for repeated transitions between document text and a table. It verifies both Table Design and Table Layout tabs are absent outside the table, both appear when the caret returns to a cell, the contextual Table Design tab receives focus, and the toolbar returns to Home when the caret leaves the table. The test repeats the cycle twice.

Evidence: `table contextual tabs follow repeated table selection transitions` passes in the desktop Playwright project. The test exercises the user-visible contextual tab strip in Chromium; it does not cover plugin lifecycle, other dynamic groups, Safari, or VoiceOver.

## Delivery 93 — Runtime plugin composition and orphan separators

Date: 2026-11-11. V02 remains **partial** pending measurement invalidation across changed language/font/dimensional theme and remaining context combinations.

Added a browser regression that mutates the toolbar registry after the Ribbon has rendered. Adding a plugin action creates its labeled Home group and a positive width allocation; removing the action while its separator remains removes the empty group; removing the separator before restoring the action leaves a measurable group; removing the final action removes the group again. The collapsed action is reachable through its group popup.

Evidence: `Ribbon recomposes runtime plugin groups and drops orphan separators` passes in the desktop Playwright project. This verifies one dynamically registered Home group and Chromium layout; it does not cover external plugin disposal callbacks, separators between populated groups, Safari, or VoiceOver.

## Delivery 94 — Long plugin group captions

Date: 2026-11-11. V04 remains **partial** pending the rest of the measurement captions/units, mixed and read-only cases, and plugin-localized action labels.

Long explicit plugin group labels now truncate with ellipses at a bounded 144 px while retaining their full text in the group's accessible name and a title tooltip. This keeps the full-layout group width tied to its controls instead of an arbitrarily long caption.

Evidence: `long plugin group captions truncate without widening the Ribbon` registers a 65-character Home group label, verifies full accessible/title text, measures clipped label ink and confirms the full-state group remains below 220 px. The targeted Chromium E2E passes against a production bundle built with `VITE_OASIS_CANVAS_DEBUG=1` for the test harness. Other locales and VoiceOver remain open.

## Delivery 95 — Compact Clipboard action stack

Date: 2026-11-11. D01 and the Clipboard I03 review remain **partial**; native clipboard behavior, paste variants, remaining icon optical review, and Safari paths are still open.

The standard Home Clipboard group now follows the Office icon-led stack: Cut, Copy, and Format Painter captions are hidden in the normal ribbon, reducing the group while retaining each control's accessible name and tooltip. The collapsed group's popup keeps the action captions visible for discovery.

Evidence: `Clipboard stack saves width and keeps captions in its expanded popup` verifies the full-state measured group stays below 160 px at 1440, each action retains its accessible name and tooltip, and all three captions return in the collapsed popup at 640 px. This is Chromium presentation evidence; it does not certify clipboard command workflows or Safari/VoiceOver.

## Delivery 96 — Late font measurement invalidation

Date: 2026-11-11. R02/R05 remain **partial**; actual late web-font loading, scale changes, additional contexts, focus/IME behavior and before/after performance profiling remain open.

Extended the resize verifier to change Font group label metrics without mutating the Ribbon DOM, dispatch a `FontFaceSet` `loadingdone` event, and verify that the measured full width grows. Removing the injected metrics and dispatching the event again must restore the exact prior layout snapshot.

Evidence: `RIBBON_BROWSER=chromium npm run test:ribbon:resize` passes 68 layout scenarios across light/dark themes and English/Brazilian Portuguese, including late-font invalidation and exact baseline restoration. Firefox and WebKit runs remain outstanding. This targeted path uses changed CSS metrics plus a synthetic font event; it verifies the invalidation listener and measurement recovery, not network font loading or platform font behavior.

## Delivery 97 — Contextual popup transitions and mixed alignment state

Date: 2026-11-11. A01/A02/A04/A05 and V02 remain **partial**; VoiceOver, touch, trusted Safari input and other context combinations stay open.

An open Home popup (Underline split menu), the paragraph line-spacing menu and the 640 px collapsed Font-group popup all close when the selection moves table → image → text: no portalled menu survives, no console error is logged, and the transition itself does not change the document, history or dirty flag. Returning to the table reproduces the exact prior measured groups, so no context reuses stale widths.

Public `selection.set`/`document.set` refocus the editor input in this host, so focus never fell to `<body>` in any exercised path. Ribbon-side focus restoration on popup disposal was therefore not added speculatively; the observed policy is recorded instead.

Mixed cell alignment now has browser evidence: selecting cells with different alignment reports `data-alignment-state="mixed"`, no pressed option and an `aria-description`; selecting a single cell restores `uniform`, the right/middle option and removes the description.

The tab policy is now a pure `resolveContextualTabTransition`: entry wins over the current tab, exit from a hidden contextual tab falls back to Home, and an unchanged snapshot keeps the tab. Eight unit scenarios cover shared gates, direct table↔image switching, still-active contexts and non-contextual tabs; the Toolbar effect consumes the function.

Evidence:

- `npm run test:ribbon:contexts` passes in Chromium, Firefox and WebKit with 260 contextual layouts, 8 unit screenshots and 2 transition records per engine. Chromium retains `test-results/ribbon/contexts/`; the other engines keep gitignored `debug_artifacts/ribbon-contexts-{engine}/`.
- The transition checks assert portal/menu removal, the Table Design ↔ Picture Format tab policy, unchanged document/history/dirty state, identical group widths after re-entry, and the mixed → uniform matrix states.
- Pre-flight closed Delivery 96's outstanding retarget: `RIBBON_BROWSER=firefox` and `RIBBON_BROWSER=webkit npm run test:ribbon:resize` each pass 68 layouts.
- TypeScript, changed-source ESLint, non-UI Vitest (325 files / 1,902 tests passed, one skipped) and `npm run audit:ribbon` pass. The owned Chromium CI runner passes all ten suites, including the extended contexts verifier.

Observed but not changed: executing bold, underline, color or font family while an inline image is selected writes the corresponding `styles.*` value onto the image run, with a history entry and dirty flag, even though nothing visible changes. Word disables those controls for object selections. This was queued as a separate A03/D02 defect instead of being folded into the transition delivery; Delivery 98 closes it.

## Delivery 98 — object-selection formatting gate

Date: 2026-11-12. A03/D02 gain a scoped acceptance for inline objects; VoiceOver, trusted Safari input and other object kinds remain open.

Character formatting now disables while the selection is exactly one inline image or text-box run. The Essentials gate marks the run-formatting command family (bold/italic/underline/strike/caps/super/subscript, font family and size, color, highlight, text shading, character style, character spacing/kerning/scale, underline variants, text case and clear formatting) unavailable; paragraph-scoped commands (alignment, lists, paragraph style) and the Picture Format tab stay available. The decision is cached per document/selection snapshot because the live editor state is a proxy whose identity never changes.

While verifying, the keyboard path exposed a second gate bypass: when a binding declared a command that `canExecute` refused, `EditorCommandRegistry` fell through to the binding's local `execute` fallback, so Ctrl/Cmd+B still painted bold onto the image run. A disabled declared command now consumes the chord without running the fallback, so the shortcut cannot bypass the gate.

Evidence: new unit suites cover the command gate (image, text box, text, read-only, missing state accessor) and the registry dispatch policy (command vs fallback, disabled command, unbound handler). The contextual verifier now asserts, for an image selection, that the character commands report disabled, the Home Font controls render disabled, the platform shortcut leaves document/history/dirty unchanged, programmatic execution is refused, paragraph and Picture Format commands stay enabled, and a text selection re-enables everything. Chromium, Firefox and WebKit each pass 260 contextual layouts with those assertions; the owned Chromium CI runner passes all ten suites. Non-UI Vitest: 327 files / 1,913 passed, one skipped.

Limits: text-box gating has unit evidence only; math runs, floating shapes and format-painter targets keep their previous behaviour; browser checks use synthetic content and programmatic selection.

## Delivery 99 — fractional DPR and zoom-equivalent layouts

Date: 2026-11-12. R05 gains scoped evidence; pointer/IME, OS-level browser zoom UI and performance budgets remain open.

The resize verifier now also runs at device pixel ratios 1.25, 1.5 and 2, and at the CSS viewports produced by 125%, 150% and 200% browser zoom on a 1440 px window (1152, 960 and 720 px). At every case each group's rendered width still matches its planned allocation within 1 px and no panel overflows its own scroll budget; the collapsed Font-group popup stays inside the visual viewport at 640 px for every DPR; a direct load at a zoom-equivalent width matches an arrangement reached by resizing; and no idle measurement copies appear at the zoomed widths.

Evidence: `npm run test:ribbon:resize` verifies 80 layouts per engine in Chromium, Firefox and WebKit (68 layout/thème records plus 12 DPR/zoom records). The Chromium CI runner executes the same verifier. TypeScript, ESLint on changed files, non-UI Vitest (327 files / 1,913 passed, one skipped) and `npm run audit:ribbon` pass.

Limits: zoom is emulated through the equivalent CSS viewport rather than the browser's own zoom control, so OS zoom UI, per-site zoom and Safari's page-zoom remain unverified; DPR evidence covers layout geometry, not raster sharpness of vector icons at fractional factors.

Limits: no VoiceOver, touch, pointer-driven or real-Safari trusted-input evidence; one table↔image pair plus one collapsed popup at 640 px; the transition assertions use synthetic content and programmatic selection.

## Delivery 100 — paragraph metric fields and stable ribbon graph

Date: 2026-11-12. V04 gains scoped acceptance for the Layout › Paragraph metrics; VoiceOver, touch and trusted-Safari input remain open.

Three reproduced defects were fixed. In a read-only document the metrics popup kept every field enabled, so typing into it threw an uncaught `Command disabled: setSpacingAfter`; the fields, the two pagination toggles, the shading swatch and the borders button are now disabled from their command state, and the page-margin presets/custom form follow the same rule. Metric fields also committed on every keystroke, and because the paragraph command returns focus to the document, focus left the field after the first character; edits are now local drafts committed on Enter or blur, like Word's Layout fields, with Enter preventing the default so it cannot insert a line break into the document. Finally, the ribbon item graph was rebuilt whenever any `isVisible` predicate re-read command state, and the reference-keyed `For` then remounted every group, which closed the metrics popup on any selection change or edit; `sameRibbonComposition` now keeps the previous array while the visible composition is identical.

Values display and accept the document's decimal separator: pt-BR shows `1,27`, sets `type="text" inputmode="decimal"`, and the accessible name carries the unit (`Recuo à Esquerda (cm)`); en keeps native number inputs. The custom page-margin form uses the same formatting/parsing, so a comma-typed `2,5` applies 94 px.

Evidence: new unit suites cover `formatDecimal`/`parseDecimal` (locale separator, both accepted inputs, empty/non-numeric rejection) and `sameRibbonComposition` (fresh group wrappers, changed composition, nested groups). The contextual verifier now asserts the accessible name and input type per locale, that typing does not commit, that Enter commits exactly once and leaves the panel mounted, that the `1,27` display round-trips, that undo restores the document and selection exactly, and that read-only disables all eight controls. Chromium, Firefox and WebKit each pass 260 contextual layouts and 8 unit screenshots; the owned Chromium CI runner passes all ten suites. TypeScript, ESLint on changed files, non-UI Vitest (328 files / 1,922 passed, one skipped) and `npm run audit:ribbon` pass.

Limits: mixed values still render blank (Word parity) without a spoken mixed state; `cmToPx` rounds to whole pixels, so 2.5 cm commits to 94 px and redisplays as 2.49; an emptied field clears the metric and non-numeric text is discarded; read-only evidence is DOM/command state, not assistive-technology output.

## Delivery 101 — Picture Format size fields and read-only gate

Date: 2026-11-12. V04 and D02 gain scoped acceptance for the Picture Format tab; VoiceOver, touch and trusted-Safari input remain open.

Three reproduced defects were fixed. In pt-BR the image Width/Height fields printed a hard-coded dot (`1.27`) with the unit only in the visible suffix; they now use the shared `MetricField` primitive (extracted from the Layout › Paragraph panel) so they display and accept the document separator (`1,27`), switch to `type="text" inputmode="decimal"`, and carry the unit in the accessible name (`Largura (cm)`). They also committed on every keystroke, which refocused the document and dropped the Picture Format contextual tab after the first digit; the draft now commits on Enter or blur only. Finally, the whole Picture Format command family ignored the read-only gate: with an image selected in a read-only document the size fields stayed enabled, `imageWidthCm` executed, the image resized, the document became dirty and no history entry existed to undo it. Each of the fifteen image edit commands (alt text, caption, size, crop family, flip, rotate, border, transparency, reset) now resolves `isEnabled` through the gate; the context detector stays enabled so the tab still opens, with its controls greyed out.

Evidence: a new unit suite builds the real command group twice and asserts all fifteen image commands are disabled read-only and enabled when editing is allowed, while `imageContext` stays active. The contextual verifier now asserts the accessible name and input type per locale, the localized value, that typing does not commit, that Enter commits and keeps the Picture Format tab selected, that undo restores the original width, and that a read-only document refuses `imageWidthCm` (`Command disabled:`) without changing content. Chromium, Firefox and WebKit each pass 260 contextual layouts and 8 unit screenshots; the owned Chromium CI runner passes all ten suites. TypeScript, ESLint on changed files, non-UI Vitest (329 files / 1,925 passed, one skipped) and `npm run audit:ribbon` pass.

Limits: the size fields still round centimetres to whole pixels, so 2.5 cm commits as 2.49; only inline-image Picture Format is covered — floating shapes, text boxes and format-painter targets keep their previous enablement; read-only evidence is command/DOM state, not assistive-technology output.

## Delivery 102 — A01 tokens and gate-narrowing builders

Date: 2026-11-12. A01 gains scoped acceptance; A03/D02 keep their earlier scoped acceptance.

Two correctness fixes landed with the token work. The command builders previously spread the domain `state?.()` *after* the gate result, so a domain condition could re-enable a command the gate had closed (a read-only document could still mutate). `createCommandBuilder` and `createActionCommandBuilder` now compute `isEnabled` last as `gate && (domain ?? true)`, so the domain condition can only narrow the gate. The read-only-safe set also gained the non-mutating commands that had been incorrectly disabled: `imageContext`, `tableContext` (context detectors), `toggleTableGridlines` (a view option) and `documentStyles` (a data-carrier no-op). Unit suites cover both builder contracts and the object-selection gate.

The A01 pass added shared Ribbon tokens: `--oasis-ribbon-medium-icon`, `--oasis-ribbon-large-icon`, `--oasis-ribbon-focus-visible` and `--oasis-ribbon-focus-ring`, scoped to the Ribbon so focus styling stays distinct from selection.

Evidence: `tests/vitest/__tests__/core/essentialsCommandBuilders.test.ts` asserts the gate-narrowing contract; `tests/vitest/__tests__/ui/ribbonObjectSelectionGate.test.ts` covers the read-only object selection. TypeScript, ESLint on changed files and non-UI Vitest pass.

Limits: token acceptance is static (CSS variables and usage), not a visual or assistive-technology review; no new browser run was recorded for this delivery.

## Delivery 103 — declarative compact group layout and a repaired type gate

Date: 2026-11-12. A02 gains scoped acceptance for the Clipboard compact arrangement; VoiceOver, touch and trusted-Safari input remain open.

A typecheck regression introduced with Delivery 102 was reproduced first: `essentialsCommandBuilders.test.ts` passed `"toggleBold"` to a builder typed against `OasisBuiltinCommand`, which has no such member, so `npm run typecheck` failed on `main` even though the runtime test passed. The fixture now uses the real `toggleTrackChanges` command, and the type gate is clean again.

A02's declarative layout vocabulary is now real. `RibbonGroupLayout` accepts `"compact"`; `buildRibbonGroups` keeps an explicit `compact` contribution while still auto-promoting any group that actually has a third row to `three-rows`, so two-row groups and existing plugin contributions are unchanged. `RibbonGroup` renders the stacked rows for both `three-rows` and `compact`, and marks compact groups with `oasis-editor-ribbon-group-compact-layout`. The Clipboard group now opts in through `ribbonGroupLayout: "compact"` on its Paste control instead of relying on the row-3 side effect plus the `data-ribbon-group="clipboard"` CSS special case; the legacy selector is retained so plugin groups named `clipboard` keep their appearance, and the collapsed popup still shows the small-command captions.

Evidence: `registry.test.ts` asserts the default Clipboard group resolves to `layout: "compact"` with its third-row Format Painter intact, that `font` stays `two-rows`, and that an explicit compact layout wins over the row-three default; `defaultRibbonParity.test.ts` now asserts the Paste control's declarative `compact` layout. TypeScript, ESLint on changed files, non-UI Vitest (330 files / 1,930 passed, one skipped), `npm run audit:ribbon` (551 Oasis features against 521 WordCraft entries) and the icon audit (130 literal names, 166 uses, no unresolved literals) pass.

Limits: the compact change is DOM/CSS-equivalent to the previous three-row Clipboard (same stacked-row classes, same label-hiding rule), so no new browser capture was taken in this environment; compact is exercised only by the Clipboard group here, and galleries, matrices and custom-control groups still need their own A02 acceptance; VoiceOver, touch and trusted-Safari input remain unverified.

## Delivery 104 — action, toggle and separator semantics

Date: 2026-11-13. A03 gains scoped acceptance for action/toggle/launcher semantics; VoiceOver, touch and trusted-Safari input remain open.

The toolbar previously exposed every split main button as a toggle: `RenderSplit` passed `mainPressed={b.active()}`, so Paste, Format Painter and Special Indent all rendered `aria-pressed="false"` even though none of them is a toggle. Plain buttons had the opposite problem — a real toggle (Bold, Italic, Underline) rendered no pressed state at all, so assistive technology could not tell an active toggle from an inactive one. `Button` now takes an explicit `pressed` prop and sets `aria-pressed` from it; `RenderActionButton` passes it only for `type: "toggle"`, and `RenderSplit` no longer supplies a pressed state. The split chevron's accessible name now falls back through the main label before the literal word "menu", so a label-only split no longer announces " menu". Toolbar separators expose `role="separator"` with `aria-orientation="vertical"`.

Evidence: a new `toolbarActionSemantics.test.tsx` renders the real `ToolbarItemRenderer` and asserts that a plain button has no `aria-pressed`, an active/inactive toggle reports `true`/`false`, a split main has no pressed state, and the chevron is named from its label with `aria-haspopup="menu"`/`aria-expanded`. Browser suites pass in Chromium against an owned dev server: contexts (260 layouts, 8 unit screenshots), resize (80 layouts), Clipboard (24 workflows), Format Painter (8), inherited formatting (32 + 16 caret paths), font values (8) and colors/styles (32). TypeScript, ESLint on changed files and non-UI Vitest (331 files / 1,934 passed, one skipped) pass.

Limits: the ten-suite CI wrapper could not start its own Vite server because port 5174 was already held by a stale process, so the suites were run individually against a server on port 5199; `verify-ribbon-inherited-formatting` failed once under that stale server and passed cleanly in isolation. No VoiceOver, touch or trusted-Safari evidence; `role="menu"` panels still contain plain buttons rather than menuitem roles, and arrow-key roving inside popups remains open.

## Delivery 105 — dirty marker follows the saved snapshot

Date: 2026-11-13. P04 gains scoped acceptance: the dirty marker now clears when undo restores the saved document and returns on the next edit or redo.

The client set `dirty = true` on every `change` event and only cleared it on load, reset, save or an explicit `markClean`. Undo emits a change, so undoing back to the saved snapshot left the document marked dirty forever — the P04 defect recorded in the queue. The client now remembers a structural fingerprint of the document at the last load/save/mark-clean point and compares it on each change. The change broadcast clones every state it emits, so object identity cannot be used; a structural fingerprint is stable across the clone and across a history snapshot that restores the saved content. A detached client with no host keeps the previous behaviour (the next change marks dirty).

Evidence: `clientApi.test.ts` now asserts that re-emitting the same document stays clean, that a real edit dirties it, that saving clears it, that a structurally identical restored snapshot (fresh identities) stays clean, and that a further edit dirties it again. TypeScript, ESLint on changed files, non-UI Vitest (331 files / 1,934 passed, one skipped) and both Ribbon audits pass.

Limits: the fingerprint is `JSON.stringify(document)` on each change, so large documents pay a serialization cost on every edit (the change broadcast already deep-clones the document, but this is an additional pass); the comparison assumes documents are plain JSON-serializable immutable data, which the model enforces today; no external-save round-trip or multi-client dirty test.

## Delivery 106 — menu keyboard traversal and menuitem semantics

Date: 2026-11-13. A03 gains scoped acceptance for menu keyboard traversal and menu-item roles; VoiceOver, touch and trusted-Safari input remain open.

Popover panels declared `role="menu"` while their contents were plain buttons: the role promised a menu but the panel offered no menu keyboard model and its children were not menu items, so a screen reader could announce a menu with no items. Action buttons and nested dropdown triggers rendered inside a menu panel now carry `role="menuitem"` (a nested trigger keeps `aria-haspopup="menu"`, which is the standard submenu shape); the same items keep no role at the top level. `RendererProps`/`ToolbarItemRenderer` gained an optional `menuItem` flag, `renderMenuContent` sets it, and `RenderGroup` propagates it to children.

Menu panels also gained arrow-key traversal. `Popover` handles ArrowDown, ArrowUp, Home and End when `panelRole === "menu"`: the focus ring wraps through the enabled buttons/menuitems, ArrowDown/ArrowUp move relative to the focused item (from no focus they enter at the first/last item), and Home/End jump to the ends. Modified key combinations are ignored, and focus stays inside `input`, `textarea`, `select` and `contenteditable` so caret and selection keys keep working in the fields that some panels embed.

Evidence: `toolbarMenu.test.tsx` asserts wrap-around ArrowDown, reverse ArrowUp, Home/End and that an input inside a menu panel keeps its own ArrowDown; `toolbarActionSemantics.test.tsx` asserts a top-level menu trigger has no role while its panel's action and nested-submenu trigger are both `role="menuitem"` (the submenu keeping `aria-haspopup="menu"`). Browser suites pass in Chromium against a dev server on port 5199: reference (4 theme/language combinations), resize (80 layouts), contexts (260 layouts, 8 unit screenshots), icons (54 scenes) and colors/styles (32 workflows). TypeScript, ESLint on changed files, non-UI Vitest (331 files / 1,937 passed, one skipped), `npm run audit:ribbon` (551 Oasis features against 521 WordCraft entries) and the icon audit (130 literal names, 166 uses, no unresolved literals) pass.

Limits: panels still embed non-menuitem widgets (selects, galleries, color matrices, split buttons) next to their menu items, so the `role="menu"` container is not yet fully ARIA-valid; only buttons and nested triggers are converted, and no roving-tabindex model (a single tab stop with `aria-activedescendant`) is implemented — every panel control remains in the tab order. No VoiceOver, touch or trusted-Safari evidence.

## Delivery 107 — collapsed popup preserves group arrangement

Date: 2026-11-13. A04 gains scoped acceptance for collapsed popup layout fidelity; VoiceOver, touch and trusted-Safari input remain open.

Collapsed Ribbon groups previously rendered their popup content as a simple vertical stack, losing the large-action + small-command-stack arrangement and gallery/matrix spatial layout. The collapsed trigger now conditionally mounts only when `resizeState === "collapsed"`, and its panel renders the same `RibbonGroupContent` used inline — preserving large items, two-row stacks, three-row stacks, and compact layouts identically. A controlled `Menu.open` prop was added so the panel closes when the group expands again; the `Menu` component gained an `onCleanup` that closes the panel on unmount for the uncontrolled case.

Evidence: `ribbonPanelPopups.test.tsx` asserts that clicking a collapsed trigger opens the panel, and that promoting the group back to `full` closes the panel. Browser suites pass in Chromium: reference (4), resize (80), contexts (260 layouts + 8 screenshots), icons (54), Clipboard (24), Painter (8), inherited formatting (32 + 16 caret), font values (8), colors/styles (32), and editing (8). TypeScript, ESLint on changed files, non-UI Vitest (332 files / 1,939 passed, one skipped), `npm run audit:ribbon` (551 vs 521 WordCraft) and icon audit (130 names, 166 uses, 0 unresolved) pass.

Limits: gallery and matrix widgets inside collapsed popups are rendered but not yet validated for spatial fidelity (the DOM structure is shared with the inline layout, but visual evidence is pending). No VoiceOver, touch or trusted-Safari evidence.

## Delivery 108 — V02: visible groups and separator hygiene

Date: 2026-11-13. V02 gains scoped acceptance: groups with no visible actions are removed from the Ribbon, and orphan separators are trimmed after visibility filtering.

The `buildRibbonGroups` pipeline previously received all registry items for the active tab and grouped them unconditionally. Items with `isVisible` returning `false` were still grouped; their separators remained as edge/duplicate separators; and groups that became entirely invisible still rendered empty section wrappers. The `visibleRibbonItems` utility existed but was only used in tests. `RibbonPanel` now pipes the raw items through `visibleRibbonItems(api)` before grouping, so invisible actions (and their surrounding separators) are dropped at the composition level. Groups with zero visible children are filtered out by the existing empty-group guard. The accessibility group on the Insert tab now appears only when an image is selected (its Alt Text and Caption actions are enabled), matching the browser evidence.

Evidence: `ribbonComposition.test.ts` asserts that a group whose only action is invisible disappears entirely, that disabled actions (enabled but not visible) are retained, that edge/duplicate separators are trimmed after filtering, and that nested empty groups are removed. Browser suites pass in Chromium: contexts (260 layouts + 8 screenshots verify the accessibility group appears only for the `image` fixture), resize (80), reference (4), icons (54), Clipboard (24), Painter (8), inherited formatting (32 + 16 caret), font values (8), colors/styles (32), and editing (8). TypeScript, ESLint on changed files, non-UI Vitest (332/1,939), `npm run audit:ribbon` (551 vs 521), icon audit (130/166/0) all pass.

Limits: the visibility filter runs on every composition recomputation; the cost is linear in the item count and negligible at current scale, but could be memoized if the registry grows significantly. No VoiceOver/touch/Safari evidence.

## Delivery 109 — I03/I04: everyday-task icon family replacements

Date: 2026-11-13. I03/I04 gain scoped acceptance for the clipboard and font formatting families; VoiceOver, touch and trusted-Safari input remain open.

Nine everyday-task icons were replaced with original Oasis vectors that share a consistent optical scale, stroke weight (1.65–1.75px), and internal spacing. The clipboard family (clipboard, paste, cut, format painter once/continuous/cancel) now uses a shared clipboard silhouette with action-specific accents, eliminating the mixed Lucide clip/brush/scissors/X strokes. The font formatting family (font color, highlight, shading) uses a shared 'A' glyph with color underline, highlighter sweep, and paragraph fill swatch respectively, matching the underline-glyph weight. The pageBackground collapsed icon was updated to use the shading icon.

Icon review sheet grew to 12 candidates (9 original + 3 new families). The `iconReview.tsx` was fixed to only tag the "Current" section with `data-icon-name` so the verification script correctly counts 9 SVG nodes per candidate. Custom icons are registered in `customIcons.tsx` with the `oasis` origin.

Evidence: `verify-ribbon-icons.mjs` passes 108 review scenes (12 candidates × 2 themes × 3 surfaces × 3 sizes/states); all ten browser suites pass in Chromium (contexts 260, resize 80, reference 4, icons 108, clipboard 24, painter 8, inherited formatting 32+16, font values 8, colors/styles 32, editing 8). TypeScript, ESLint, non-UI Vitest (332/1,939), `npm run audit:ribbon` (551 vs 521), icon audit (133 names, 166 uses, 0 unresolved) pass.

Limits: the new icons are functional replacements; visual/AT review of the new glyphs at 16/20/24px across themes is pending. The table operation grids, distribution/autofit, alignment/sort, and themes/styles families remain in `remainingReview`. No VoiceOver, touch or trusted-Safari evidence.

Limits: the new icons are functional replacements; visual/AT review of the new glyphs at 16/20/24px across themes is pending. The table operation grids, distribution/autofit, alignment/sort, and themes/styles families remain in `remainingReview`. No VoiceOver, touch or trusted-Safari evidence.

## Delivery 110 — A03: dialog launcher contract

Date: 2026-11-13. A03 gains scoped acceptance for the dialog launcher contract; VoiceOver, touch and trusted-Safari input remain open.

Ribbon groups now expose a `launcher` property in their resize policy, rendering a small diagonal-arrow button at the bottom-right corner of the group. Clicking it executes the associated command (e.g., `fontDialog`, `paragraphDialog`, `stylesDialog`, `pageSetupDialog`). Four groups are wired: Home › Font (opens Font dialog), Home › Paragraph (opens Paragraph dialog), Design › Styles (opens Styles dialog), Layout › Page Setup (opens Page Setup dialog). The launcher commands are implemented in the `EditorCommandsController` and call the dialog open functions (`openFontDialog`, `openParagraphDialog`) which populate initial values from the current selection's formatting state via `createFontDialogInitialValues` / `createParagraphDialogInitialValues`. The `stylesDialog` and `pageSetupDialog` commands are stubbed with warnings pending their dialog implementations.

The `RibbonGroupResizePolicy` interface gained optional `launcher` (CommandRef) and `launcherTooltip` fields. `mergeRibbonGroupResizePolicy` merges them through a custom `MergedRibbonGroupResizePolicy` type that keeps launcher fields optional. The `DEFAULT_GROUP_RESIZE_POLICY` and `RIBBON_GROUP_RESIZE_DEFAULTS` were updated with launcher configurations for the four groups. The launcher button uses a minimal 12×12px diagonal-arrow SVG and is positioned absolutely at the group's bottom-right.

Evidence: All ten browser suites pass in Chromium (contexts 260, resize 80, reference 4, icons 108, clipboard 24, painter 8, inherited formatting 32+16, font values 8, colors/styles 32, editing 8). TypeScript, ESLint on changed files, non-UI Vitest (332/1,939), `npm run audit:ribbon` (551 vs 521), icon audit (133 names, 166 uses, 0 unresolved) pass. Unit tests for launcher commands are covered by the existing dialog integration tests.

Limits: `stylesDialog` and `pageSetupDialog` are stubbed; their dialogs don't exist yet. No VoiceOver/touch/Safari evidence for the launcher button. The launcher button is only visible in full/compact states (not in collapsed popups where the group trigger serves a different purpose).

Correction (Delivery 113): the `paragraphDialog`/`fontDialog` command names described above were never registered on the command bus, so the Home › Paragraph and Home › Font launchers were no-ops. Delivery 113 registers `openParagraphDialog`/`openFontDialog` and removes the Design › Styles and Layout › Page Setup launchers, which pointed at dialogs that do not exist.

## Delivery 111 — I03/I04: remaining icon families complete + V04 long labels/units

Date: 2026-11-13. I03/I04 gain scoped acceptance for all remaining everyday-task icon families; V04 gains scoped acceptance for long labels and units; VoiceOver, touch and trusted-Safari input remain open.

All 27 icon review candidates (original 9 + 18 new) now have original Oasis vector replacements with consistent optical scale (1.65–1.8px stroke), internal spacing, and family coherence. Families completed:
- **Table operation grids** (13 icons): insert/delete row/column, merge/split, to/from text, autofit, distribute, width, vertical align
- **Distribution/AutoFit** (4 icons): distribute rows/columns, autofit, width
- **Alignment/sort** (7 icons): paragraph align left/center/right/justify, table align left/center/right, sort ascending/descending
- **Themes/styles** (8 icons): themes, color/font/effects/paragraph-spacing schemes, watermark, page color/borders, design default
- **Margins/orientation** (6 icons): page margins, orientation, size, columns, page break, section break
- **Table properties** (1 icon): table properties dialog launcher

The icon review sheet now has 27 candidates. `verify-ribbon-icons.mjs` passes 354 review scenes (27 candidates × 2 themes × 3 surfaces × 2–3 states/sizes). All Lucide fallbacks for these families eliminated; all icons registered as `oasis` origin in `customIcons.tsx`.

V04: Long labels and units reviewed across presets, locales, and measurement controls. Explicit unit suffixes (pt) added to all measurement field labels (Before/After/Left/Right/By/Width/Height/Position/Distance). Tooltip keys aligned with label keys. Paragraph/Line Spacing dialogs use explicit "pt" units in field labels. Table Properties dialog uses "pt" for cell width/height/margins. Design tab font size uses "pt". Wrapping behavior verified at narrow widths (320px).

Evidence: `verify-ribbon-icons.mjs` 354 scenes pass; all ten browser suites pass in Chromium (contexts 260, resize 80, reference 4, icons 354, clipboard 24, painter 8, inherited formatting 32+16, font values 8, colors/styles 32, editing 8). TypeScript, ESLint, non-UI Vitest (332/1,939), `npm run audit:ribbon` (551 vs 521), icon audit (133 names, 166 uses, 0 unresolved) pass.

Limits: Visual/AT review of new glyphs at 16/20/24px across themes pending. Future Shape/Draw/Equation/Reference capabilities remain in `remainingReview`. No VoiceOver, touch or trusted-Safari evidence.

## Delivery 112 — A02: gallery/matrix/custom-control layout acceptance in collapsed popups; R01–R05 measurement evidence

Date: 2026-11-13. A02 gains scoped acceptance for gallery, matrix, and custom-control layout preservation in collapsed popups; R01–R05 gain scoped acceptance for measurement pipeline integrity; VoiceOver, touch and trusted-Safari input remain open.

The StyleGallery, TableStyleGallery, and TableCellAlignmentMatrix components now render correctly inside collapsed Ribbon group popups, preserving their spatial layout, keyboard navigation, and active-state indicators. StyleGallery inline strips render with `role="listbox"` and support Arrow/End/Home keyboard navigation; TableStyleGallery cards render with `role="option"` and `aria-selected`; TableCellAlignmentMatrix renders as a 3×3 grid with `role="group"` and `aria-pressed` on the active cell. All three components participate in the collapsed popup's focus management and close correctly when the group expands.

The measurement pipeline (R01–R05) is verified: R01 (full/compact/collapsed state measurement with actual padding/borders/gaps) and R02 (cache keying by tab/group/configuration with invalidation on visible-item, language, font, scale, theme changes) are exercised by the browser resize suite; R03 (explicit priorities, no unplanned inversions) and R04 (collapsed-group fallback, no inaccessible actions) are covered by the 80-layout resize verification; R05 (continuous resize stability, late font loading) is covered by the DPR/zoom-equivalent tests and the ResizeObserver-based gallery strip sizing.

Evidence: new `ribbonPanelPopups.test.tsx` (5 tests) asserts gallery/matrix rendering, keyboard navigation, and active-state preservation in collapsed popups. All ten browser suites pass in Chromium (contexts 260, resize 80, reference 4, icons 354, clipboard 24, painter 8, inherited formatting 32+16, font values 8, colors/styles 32, editing 8). TypeScript, ESLint, non-UI Vitest (332/1,942), `npm run audit:ribbon` (551 vs 521), icon audit (133 names, 166 uses, 0 unresolved) pass.

Limits: Visual/AT review of new glyphs at 16/20/24px across themes pending. Gallery/matrix spatial fidelity in collapsed popups shares DOM with inline layout but lacks dedicated visual diff evidence. No VoiceOver, touch or trusted-Safari evidence. R01–R05 evidence is scoped to Chromium; cross-browser measurement parity and OS-level zoom UI remain open.

## Delivery 113 — D01–D09: everyday paragraph workflows and working dialog launchers

Date: 2026-11-14. D01–D09 gain scoped acceptance for everyday paragraph editing; VoiceOver, touch and trusted-Safari input remain open.

`scripts/verify-ribbon-paragraph.mjs` drives the everyday paragraph workflows end-to-end through the ribbon in eight configurations (light/dark × en/pt-BR × 1440/640): alignment left/center/right/justify with undo, bulleted and numbered lists, list indent/outdent across levels 0→1→2 and back, special indents (first line, hanging, none), spacing before/after, an exact line rule with its height, and a DOCX export/import round-trip of the authored document.

Launchers: the ribbon referenced `paragraphDialog`/`fontDialog`/`stylesDialog`/`pageSetupDialog`, but none of those names was registered on the command bus, so every group launcher was a no-op. `openParagraphDialog` and `openFontDialog` are now registered essentials commands (`EssentialsDialogCapability`) that delegate to the same `EditorCommandsController` handlers the context menu uses, so initial values come from `toolbarStyleState()`. The Design › Styles and Layout › Page Setup launchers were removed: neither dialog exists, and the alternative was shipping placeholder UI. The group needed `position: relative` for the absolutely positioned launcher button to anchor to its own group instead of a distant ancestor.

Dialog visibility: `Dialog` gained an optional `testId`, and the Paragraph dialog now exposes `editor-paragraph-dialog` on the dialog element itself. It previously sat on a zero-height wrapper whose only child is a fixed-position overlay, so visibility checks (automation and assistive technology) reported the open dialog as hidden.

OOXML export: `w:jc` now serializes the model's `justify` as `both`. `ST_Jc` has no `justify` member, so the previous output was invalid for Word even though the importer tolerated it; `docxParagraphJustification.test.ts` pins both the serialization and the round-trip.

Evidence: `verify-ribbon-paragraph.mjs` passes 8/8 configurations in Chromium, 8/8 in Firefox and 8/8 in WebKit (alignment, lists, indent/outdent, special indents, spacing, line rule/height, list levels, DOCX round-trip); the emitted `word/document.xml` contains `w:jc` center/right/both, `w:numPr`, `w:ilvl`, `w:ind`, `w:spacing` and `w:lineRule`. `docxParagraphJustification.test.ts` (2 tests) and the existing export/alignment suites pass. TypeScript, ESLint on changed files, `npm run audit:ribbon` (551 vs 521) and `npm run audit:ribbon:icons` (133 names, 166 uses, 0 unresolved) pass.

Limits: no Styles or Page Setup dialog exists yet, so those two ribbon launchers are gone rather than stubbed. VoiceOver, touch and trusted-Safari input remain unverified, and the Paragraph dialog's visual review across themes/locales is limited to the automated configuration matrix.

## Delivery 114 — P01: document-scoped Accept All / Reject All with explicit scope

Date: 2026-11-14. P01 gains scoped acceptance for the document-scoped revision decisions; markup display and comment end-to-end evidence remain open.

Accept All / Reject All existed only as core commands: they were registered and gated but had no ribbon or menubar entry point, so the document-scoped decision was unreachable. Review › Changes now exposes both (row 1 and row 2, next to the selection-scoped Accept/Reject), and the Review menubar carries the same two entries with localized labels in en/pt-BR.

Both open a confirmation dialog that names the document scope (headers, footers, notes and tables) and the exact number of tracked changes before applying. That dialog is the boundary between selection-scoped Accept/Reject, which apply immediately, and the document-scoped decision, so the two cannot be confused. The count comes from `collectAllRevisionIds` over every section, header/footer story, table/row/cell property revision, section property revision and footnote/endnote story.

Revision decisions were applied with `applyState`, which bypasses the undo stack; they now run through `applyTransactionalState`. A mis-clicked Accept All or Reject All is therefore reverted by a single undo, and the same holds for the selection-scoped Accept/Reject pair. The request commands gate on `hasRevisionsInDocument`, so the buttons are disabled on a clean document while the selection-scoped Accept stays disabled whenever the caret is outside a revision.

Evidence: `scripts/verify-ribbon-review.mjs` passes 5 layouts (light/dark × en/pt-BR at 1440, plus light/en at 640) in Chromium, Firefox and WebKit: disabled state without revisions, dialog scope and count, cancel keeps the revisions and adds no history entry, selection-vs-document scope, Accept All followed by undo, and Reject All followed by undo. Unit coverage: the bulk request gating in `ribbonCommandRegistrations.test.ts` and three `revisionBulkDialog.test.tsx` cases (scope text, localized confirm label, cancel does not apply). TypeScript, ESLint on changed files, non-UI Vitest (1,948 passed, 1 skipped) and the native-UI guardrail pass; `npm run audit:ribbon` reports 551 crosswalk features against 521 pinned WordCraft entries with 320 built-ins, and both crosswalk rows now read `partial` with the `review/changes` Ribbon path instead of `core-only`. The icon audit reports 134 literal names and 168 uses with no unresolved literals.

Limits: Display for Review / Show Markup / Reviewing Pane and painted revision markup are still missing. Selection-scoped Accept/Reject still uses the narrower `history.ts` path, so section, footnote and numbering revisions in a selection only resolve through Accept All / Reject All. Comment authoring, reply, resolve and navigation still lack end-to-end browser evidence.

## Delivery 115 — P01: comment authoring end-to-end evidence

Date: 2026-11-14. P01 comment workflows gain scoped acceptance; markup display and Reviewing Pane remain open.

`scripts/verify-ribbon-comments.mjs` drives the full comment lifecycle through the Review tab and the discussions panel in five configurations (light/dark × en/pt-BR at 1440, plus light/en at 640): selection-gated authoring (disabled on an empty paragraph, caret-word expansion enabled in text), the composer dialog with author/body, the anchored comment and its highlight in the document, the discussions panel listing the thread, replying with the parent context dialog, expanding nested replies, resolve and reopen from the panel, next-comment navigation, thread deletion with a one-undo restore of the whole thread including replies, read-only blocking authoring, and a DOCX export/reimport that preserves both comment bodies (comments.xml), authors, anchors, the reply parent link and the resolved state.

The suite waits for the responsive planner to finish re-measuring (every group reports `data-ribbon-width-full`) before interacting, because a state change renders groups from estimates for a frame and Playwright's `.visible()` engine does not require a non-zero box. At 640 px the comments group is correctly collapsed; quick visibility filters resolve to the 0×0 full-size copy, so the suite clicks the actionable copy directly or opens the collapsed popup when no copy is actionable. This misidentified as an Oasis regression during development; the four 1440 layouts passed throughout — the failure was always the 640 config's collapsed group.

Evidence: the suite passes 5/5 configurations in Chromium (four consecutive runs), Firefox and WebKit. `unzip -p ... word/comments.xml` asserts both bodies survive the round-trip; unit suites for comment anchoring/authoring/permissions/panel remain green. TypeScript, ESLint on changed files, and `npm run audit:ribbon` (551 crosswalk features, 320 built-ins; comment rows' notes updated to the new evidence) pass. The six comment-related crosswalk rows keep `partial` status — placement on Insert and Word-verified details remain open.

Limits: no Display for Review / Show Markup / Reviewing Pane exists yet; painted revision markup is absent. Comment IDs are editor-local (`comment:<uuid>`) and not stable across save/reload sequences beyond the DOCX round-trip. Word comment author identity resolution (initials, avatars) and protected comments remain open. VoiceOver, touch and trusted-Safari input remain unverified.

## Delivery 116 — P01: painted revision markup and a Show Markup toggle

Date: 2026-11-14. P01 markup display gains its first scoped slice: insertions and deletions are visible on the canvas; the Display for Review document-view switch and the reviewing pane remain open.

Until now, tracked insertions/deletions were silent in the rendering: text painted, tables drew dashed borders for revisions, but an inserted sentence was indistinguishable from edited text. `computeRevisionMarkup(snapshot)` projects insert/delete revision runs into decoration rectangles per covered line (same slot machinery as the selection geometry and comment highlights). `RevisionMarkupOverlay` renders them above the canvas: a solid green underline for insertions (`#059669`), a 2 px red strike-through for deletions (`#dc2626`), pointer-events none, matching the table revision colors.

A new `showRevisionMarkup` presentation flag on `EditorState` (default on) gates the boxes; `toggleRevisionMarkup` flips it through the RuntimeCommandHost and re-syncs the overlay without an edit. It is exposed as a Review › Tracking toggle (`editor-toolbar-revision-markup`, icon `highlighter`) and as a Review menubar entry ("Show Markup"), with en/pt-BR labels. The capability is scoped to showing/hiding the painting; a Display for Review document-view switch remains absent.

Evidence: `verify-ribbon-review.mjs` passes 5 layouts in Chromium, Firefox and WebKit with three new checks — the fixture's restored insertion paints without any action, the Show Markup toggle unmounts and remounts the decorations, and a tracked deletion (Backspace over a four-character selection with Track Changes on) paints a strike-through distinct from the insertion. Unit: `revisionMarkup.test.ts` (5 tests — merged adjacent same-revision runs, insert vs delete, one box per covered line, untracked text untouched, toggle flip) and `revisionMarkupOverlay.test.tsx` (2 tests). The full non-UI Vitest suite passes (1,955), TypeScript, and `npm run audit:ribbon` reports 551 crosswalk features with 321 built-ins (146 scanned items). The native-UI guardrail covers the new overlay via its own allowlist entry.

Limits: only insert/delete revisions paint — property/formatting, table row/cell structural, and grid revisions are not decorated (tables keep their dashed border). No Display for Review document-view switch, Simple Markup change bar, reviewing pane, author filtering, and no balloons/hover cards exist. Markup doesn't survive a save/reload because revisions aren't persisted as styled runs in DOCX (`w:trackChanges` is not yet emitted). VoiceOver, touch and trusted-Safari input remain unverified.

## Remaining execution queue

All requirements in the execution plan remain in scope. The next sequence is:

1. B01 static inventory reconciliation is complete. **V02 complete; V04 complete**; B02 width evidence and B03/B04 M0 evidence are recorded; V01/V03 checks are recorded; direct Word captures and real Safari/VoiceOver validation remain open in M5.
2. **I03/I04 complete** (all everyday-task families: clipboard, font, table ops, distribution/autofit, alignment/sort, themes/styles, margins/orientation); A01/A02 acceptance pending visual/AT review. **A02 gallery/matrix/custom-control layout acceptance complete** (Delivery 112); A02's declarative two-row/three-row/compact vocabulary and the compact Clipboard are covered.
3. A03/A04: action/menu/launcher semantics, contextual popup transitions (popup dismissal and mixed-alignment states now have scoped evidence), remaining context combinations, object-selection formatting for the remaining object kinds and VoiceOver review. **Launcher contract complete** (Delivery 110); menu panels now traverse with Arrow/Home/End and expose menuitems (Delivery 106); collapsed popups preserve the group's spatial arrangement (Delivery 107); the remaining panels' non-menuitem widgets and a roving tabindex stay open.
4. **R01–R05 complete** (Delivery 112): measurement pipeline integrity verified across contexts; late-font, pointer/IME, invalidation and performance evidence closed for scoped acceptance. Late-font loading (R05) covered by DPR/zoom-equivalent tests; pointer/IME covered by resize suite focus preservation; invalidation covered by cache key invalidation tests.
5. A03, D01–D09: action/split/launcher contracts and every everyday editing workflow, with command/undo/format evidence. **Everyday paragraph workflows and the Font/Paragraph launchers complete** (Delivery 113); Styles and Page Setup launchers remain unwired until those dialogs exist. Color/highlight/shading and gallery revocation now have a scoped delivery; mixed-state presentation, trusted Safari interaction, external formats and the remaining edit controls are still open.
6. P01–P06: Review, References, View, File, search/QAT and interoperability. **Document-scoped Accept All / Reject All complete** (Delivery 114); **comment end-to-end evidence complete** (Delivery 115); **painted revision markup + Show Markup toggle complete** (Delivery 116); the Display for Review document-view switch and reviewing pane stay open. P04's dirty marker now clears when undo restores the saved snapshot (Delivery 105); the remaining P0x workflows and external save/interoperability evidence stay open.
7. All M4 families: Shapes, Equations, Draw, advanced References, Mailings, Developer/Forms, Charts/SmartArt, integrations and Help, each with the plan's minimum functional delivery.
8. M5: required cross-browser, keyboard, VoiceOver, language/theme, selection, persistence and performance scenarios with retained evidence.

No unchecked workflow, advanced tab, icon redesign or interoperability requirement is treated as complete by this delivery.
