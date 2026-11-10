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
| I01       | partial  | `scripts/audit-ribbon-icons.mjs` generates `scripts/ribbon-parity/icons.json`: 125 literal names, 163 uses, 28 custom renderers and 11 dynamic expressions. No unresolved static literal names. Origin/license recorded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Associate every command/size and inspect dynamic/plugin/direct renderer paths.                                                                                                                                                                                                |
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
| A04     | partial | Collapsed groups retain large actions and their two/three-row arrangement. A logical popup ownership tree keeps portalled children inside their parent for outside-click handling. Escape closes the deepest open menu and restores its trigger focus.                                                                                                         | Short viewport heights, inline flyouts, contextual transitions with menus open, matrix alignment controls and VoiceOver.                               |
| R01     | partial | Full/compact/collapsed DOM copies are inert, hidden, stripped of IDs/test IDs, measured in one batched write/read task and removed synchronously. No additional Solid controllers are mounted for measurement. Browser assertions compare rendered widths with planned outer widths.                                                                           | Every contextual/custom-control family and dimensional override.                                                                                       |
| R02     | partial | Widths belong to the exact current group composition. Tab/group ID reuse cannot reuse measurements; item, language and extension changes rebuild the context. Font completion, owner theme/style changes and viewport changes schedule measurement.                                                                                                            | Real late font loads, zoom/DPR transitions, nested selection changes and externally injected stylesheet changes.                                       |
| R03     | partial | Fixed reduction ladder: compact states before collapse; lower priority first, then right-to-left for ties. No restorative pass. Home priorities preserve Font/Paragraph until secondary groups reduce. Only actual style galleries can receive whole-card slack from a budget assuming other groups full.                                                      | Review all tab priorities with task evidence, contextual selections and other group families.                                                          |
| R04     | partial | Groups never shrink beneath the measured state to silently absorb a deficit. Below their minimum, visible left/right buttons and a focusable horizontal scroll area expose all groups. Tested at 320 px; default supported capture widths remain 640–1440 px.                                                                                                  | Full keyboard action walkthrough, touch, assistive technology and every oversized contextual popup.                                                    |
| R05     | partial | Coalesced animation-frame scheduling, stable mounted controls during width changes, focus handoff to a collapsed trigger, observer cleanup and no idle measurement loop in executed scenarios.                                                                                                                                                                 | Continuous drag/late-font profiling and pointer/IME interactions across all browser/context combinations.                                              |
| D01     | ui-only | Large labeled Paste plus small Cut/Copy/Painter stack; history separated. The existing shared clipboard and painter commands are reused.                                                                                                                                                                                                                       | Safari permissions/failure paths, rich/text/merge paste, selection/undo and one-shot/sticky painter workflow evidence remain as specified in the plan. |
| I02/I07 | partial | Icon observation now resolves new placeholders without recreating existing SVGs on unrelated DOM changes. Per-root subscription counts support shared editors; explicit icon-name changes retain accessibility attributes. Three DOM tests cover identity, naming and shared ownership. Static inventory: 125 names, 165 literal uses, 11 dynamic expressions. | All dynamic `ToolIcon` names, SVG clipping/visibility, custom families, icon review sheet and replacements.                                            |

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
| V04         | partial | Flat data-driven action menus size to content within viewport bounds and retain full captions. Header/Footer's Portuguese Close caption previously clipped (118 px available for 155 px text); the browser guard checks all seven captions. Galleries and nested contribution layouts retain their own geometry.                                                               | All labels, units, read-only/mixed states, long plugin/localized captions and other controls.                                           |
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

## Remaining execution queue

All requirements in the execution plan remain in scope. The next sequence is:

1. Finish B01 source/category reconciliation and remaining V02/V04 cases. B02 width evidence and B03/B04 M0 evidence are recorded; V01/V03 checks are recorded; direct Word captures and real Safari/VoiceOver validation remain open in M5.
2. Complete the remaining I03/I04 icon families and A01/A02 contextual/custom layout acceptance.
3. A03/A04: action/menu/launcher semantics, short viewports, spatial matrices and contextual popup transitions.
4. R01–R05: close late-font, zoom, pointer/IME, invalidation and performance evidence across remaining contexts.
5. A03, D01–D09: action/split/launcher contracts and every everyday editing workflow, with command/undo/format evidence. Color/highlight/shading and gallery revocation now have a scoped delivery; mixed-state presentation, trusted Safari interaction, external formats and the remaining edit controls are still open.
6. P01–P06: Review, References, View, File, search/QAT and interoperability. P04 includes the dirty marker staying set after undo restores the saved document snapshot.
7. All M4 families: Shapes, Equations, Draw, advanced References, Mailings, Developer/Forms, Charts/SmartArt, integrations and Help, each with the plan's minimum functional delivery.
8. M5: required cross-browser, keyboard, VoiceOver, language/theme, selection, persistence and performance scenarios with retained evidence.

No unchecked workflow, advanced tab, icon redesign or interoperability requirement is treated as complete by this delivery.
