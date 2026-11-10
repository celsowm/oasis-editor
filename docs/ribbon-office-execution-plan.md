# Execution Plan — Ribbon Quality on Par with WordCraft and Microsoft Office

Date: 2026-11-09. Status: active; implementation is in progress. See the [delivery ledger](ribbon-office-progress.md) for verified changes, evidence and remaining acceptance.

This document defines the current execution sequence. It complements the [general roadmap](wordcraft-ribbon-parity-plan.md), [command matrix](ribbon-parity-matrix.md), and [OOXML interoperability plan](ooxml-near-full-compatibility-plan.md). Historical assessments in those documents do not replace a current inventory.

## 1. Intended outcome and references

Oasis should provide a familiar Ribbon for Word users: predictable command locations, recognizable option effects, editing without losing the selection, access to essential controls as the window narrows, and changes that persist correctly in the document.

Use these product references for the initial implementation:

| Dimension | Reference and decision |
| --- | --- |
| Hierarchy and organization | The classic Microsoft 365 Word Ribbon guides groups, primary actions, button stacks, galleries, and contextual tools. |
| Observable implementation | WordCraft provides an inventory and visual reference. Verify its choices before adopting them; do not assume functional equivalence with Office. |
| Browser and platform | Safari on macOS is mandatory, with Chromium and Firefox in the compatibility matrix. |
| Narrower layouts | Use the captured Word web interface as evidence and define a documented reduction policy. WordCraft and Word web make different Font/Paragraph tradeoffs. |
| Appearance | Original components and icons with a consistent visual language. Light and dark themes share the same contract. |
| Scope | Common text, page, table, image, and review tasks first; advanced references, shapes/equations, and specialized tools follow. |
| Integrations | Zotero, proofing providers, and mail merge data sources remain extensions rather than core dependencies. |

The target is comparable quality, discoverability, and workflows for the selected capabilities. Presentation fidelity, command behavior, and interoperability must be tracked separately.

## 2. Evidence and baseline limitations

- Observed Oasis: HEAD `8aaa8985937b5c5959e2d8bc0850c0dfcd932856`, with a pre-existing local change in `ribbonModel.ts`. Reconcile that change before implementing work in this area.
- Observed WordCraft: HEAD `05f781cfdac1d89034c0f4f5824b597ff845f2ef`.
- Visual inventory: 64 Oasis and 153 WordCraft captures, organized into 21 tab categories and 53 menu/expansion scenes in the comparison viewer. These counts do not measure completed features.
- Direct reference: 21 dark-theme Word web/Safari captures across seven tabs and three widths, plus one extra 1470 px Insert capture (22 total). This round did not directly validate Word desktop or its contextual tools.
- Oasis measurements: 36 captures across nine tabs and 25 additional resize measurements. Actual content widths of 1440/1200/960 were verified; playground geometry invalidated some smaller targets.
- Confirmed findings: visible `headerFooter`/`sort` identifiers; truncated style previews; a 339 px Clipboard group; Paragraph collapses at 1200 and reappears at 960 while Font collapses; collapsed groups lose their spatial organization.
- Preserve these strengths: Margins previews, the color palette, table style galleries, contextual tabs, and the shared command boundary.

Session artifacts are in the gitignored `debug_artifacts/ribbon-comparison/` directory. This plan must remain usable without them. Before establishing permanent baselines, capture synthetic documents and retain the necessary references through the project's approved artifact mechanism. Do not commit screenshots of personal documents.

## 3. Definition of done and tracking

Each backlog item must record its chosen reference, expected behavior, current status, dependencies, relevant files, before/after evidence, and limitations.

Use the general roadmap's status vocabulary: `complete`, `partial`, `core-only`, `menu-only`, `ui-only`, `preservation-only`, `missing`, and `not-applicable`. Keep a capability **unverified** when evidence is missing; an absent screenshot does not make a feature `missing`.

A delivery is complete only when the applicable criteria pass:

1. Users can find the action in its defined location and context.
2. Labels, tooltips, shortcuts, primary actions, and expansions have consistent meanings.
3. Active/disabled states reflect the selection, context, and read-only mode.
4. Interaction preserves selection, caret, focus, and text composition.
5. Commands mutate the model through the shared command boundary and respect undo/redo.
6. Layout and rendering reflect the result.
7. DOCX/PDF output and reimport preserve the result where applicable.
8. Required keyboard, theme, language, and browser scenarios have appropriate evidence.

### Exit indicators

| Indicator | Target within each milestone's scope |
| --- | --- |
| Internal identifiers and empty groups | Zero occurrences in exercised presets and contexts. |
| Controls inaccessible through clipping | Zero at supported widths; below the minimum, every action remains reachable through an explicit mechanism. |
| Resize determinism | The same width/context produces the same arrangement after direct loading, shrinking, and expanding. |
| Reduction policy | Every transition follows the approved policy; exceptions are explicit and reproducible. |
| Galleries | Distinguishable names, whole options, and a perceptible selection; no clipping that makes options ambiguous. |
| Critical workflows | All mandatory milestone scenarios pass. Selection loss, broken undo, or content loss blocks delivery. |
| Accessibility | All mandatory paths are keyboard reachable; names/states and focus restoration are verified with VoiceOver. |
| Parity | Publish results by dimension and capability. Do not infer an overall parity percentage from command registration. |

## 4. Milestones and critical path

| Milestone | Reviewable delivery | Depends on |
| --- | --- | --- |
| M0 — Reliable baseline | Reconciled inventory, isolated host, and synthetic fixtures. | Current working state. |
| M1 — Consistent Ribbon | Correct names/visibility, readable galleries, reviewed iconography, defined components/layouts, and deterministic resize. | M0. |
| M2 — Competitive everyday editing | Organized Home, Insert, Layout, Tables, and Pictures; demonstrated common workflows with selection and keyboard behavior. | M1 and verified capabilities. |
| M3 — Professional documents | Complete Review, References, View, and File workflows with applicable interoperability. | M2 and required document subsystems. |
| M4 — Advanced tools | Shapes, Equations, drawing, and specialized capabilities enabled according to semantic readiness. | M3 and each tool family's dependencies. |
| M5 — Sustained quality | Reproducible evidence, scoped gates, customization, and controlled regressions. | Earlier deliveries; infrastructure begins in M0. |

Critical path: baseline → layout contracts → state measurement → resize policy → tab composition → workflow demonstrations. Label and visibility fixes can ship before layout changes. Accessibility, localization, and selection handling apply throughout.

No calendar deadline is committed. Complete M0 first and size the verified gaps. Relative complexity classes below are **S** for localized work, **M** for work across components, and **L** for model/layout/format work. Large items need decomposition before scheduling estimates.

## 5. Detailed foundation and presentation backlog

### M0 — Inventory, fixtures, and capture

| ID | Work | Files/areas | Acceptance | Size |
| --- | --- | --- | --- | --- |
| B01 | Reconcile the static matrix with commands, presets, and observed state; classify exposure, semantics, and persistence independently. | `scripts/ribbon-parity/features.json`, pinned source at `scripts/ribbon-parity/wordcraft-catalog.json`, `scripts/snapshot-wordcraft-catalog.mjs`, `scripts/audit-ribbon-parity.mjs`, `docs/ribbon-parity-matrix.md`. | Reconcile all 521 source entries. Distinguish 13 WordCraft default tabs, seven contextual tabs and seven auxiliary surfaces; identify default tabs with no catalog rows. Separately triage the 21 historical screenshot categories, including cases without equivalents. Unmatched source entries stay unclassified until reviewed. No feature is complete solely because a binding exists. | M |
| B02 | Create a reference host without the playground sidebar; control actual width, DPR, fonts, theme, and language. | Capture harness, playground configuration, and host geometry. | Complete captures at actual content widths of 1440, 1200, 960, 800, and 640 px. Record requested/measured width and reject mismatches. | M |
| B03 | Prepare synthetic text, list, style, table, image, section, and review documents. | Fixtures and existing capture scripts. | Known selection/context; no personal data. Every screenshot records SHA, scenario, theme, language, DPR, and width. | M |
| B04 | Define each tab/scene's reference: equivalent command, related task, or no counterpart. | Parity catalog and UX documentation. | Classify all 53 existing cases and identify which need another capture from Word itself. | S |

Current M0 status (2026-11-10), with evidence and remaining limits in the [delivery ledger](ribbon-office-progress.md):

| Ticket | Status |
| --- | --- |
| B01 | Partial — 115 of 521 source rows are linked; 406 still need individual review. |
| B02 | Complete for the Chromium reference host's required widths; Safari and VoiceOver remain in M5. |
| B03 | Complete — seven synthetic fixtures and their contextual capture metadata are verified. |
| B04 | Complete — all 53 scene relationships are classified and direct Word captures are explicitly queued; capture execution remains in M5. |

### M1a — Immediate fixes

| ID | Work | Files/areas | Acceptance | Size |
| --- | --- | --- | --- | --- |
| V01 | Resolve `headerFooter`, `sort`, and other unmapped group names; define explicit labels for plugin contributions. | `ribbon/ribbonModel.ts`, locales, and placements. | No internal identifiers in pt-BR/en. Reuse existing keys where appropriate and define plugin fallback behavior. | S |
| V02 | Compose groups from effectively visible items; remove groups without visible actions and orphan separators. | Group model, renderers, and item state. | Insert has no empty Accessibility group. Selection changes update composition and measurements; disabled actions remain visible where appropriate. | M |
| V03 | Fix style gallery samples and theming. | `StyleGallery.tsx`, `toolbar.css`, and tokens. | Normal/Heading/Caption are distinguishable; selection is perceptible; expansion matches both themes; the last sample is whole or omitted. | M |
| V04 | Review long labels and units. | Presets, locales, and measurement controls. | Intentional wrapping, visible essential text, explicit units, and supplemental tooltips. | S |

### M1 — SVG iconography: complete, redesign, and validate

Iconography is an explicit UI/UX workstream. Distinguish **missing icons**, **wrong action metaphors**, **poor recognition**, **visual inconsistency**, and **rendering failures**. Each replacement decision must identify an observed defect and show the alternative at its actual Ribbon size.

Initial inspection: `ToolIcon` resolves the custom registry first, then Lucide through `IconManager`. The inspected presets, button specifications, and collapse policies contain **111 distinct literal icon names**, all matching the custom registry or installed Lucide package. There are **28 registered custom icons**. This static check excludes dynamic names and plugins and does not establish correct browser rendering. A verified runtime missing-icon list is therefore still pending.

| ID / priority | Work | Files/areas | Acceptance |
| --- | --- | --- | --- |
| I01 · P1 | Inventory command, menu, launcher, collapsed-group, and plugin icons; associate name, command, size, and origin. | `customIcons.tsx`, `IconManager.ts`, presets, renderers; proposed catalog at `scripts/ribbon-parity/icons.json`. | Every action expected to have an icon has an entry. Distinguish intentionally absent icons from resolution failures. |
| I02 · P1 | Audit runtime for unresolved placeholders, empty SVGs, clipping, invisible colors, and icons lost after context changes. | `ToolIcon`, primitives, DOM observation, and capture harness. | No in-scope action leaves an unresolved placeholder or invisible SVG. Include portalled popups and items added after initialization. |
| I03 · P1 | Produce a review sheet with current/proposed icons, commands, and use in buttons, menus, and collapsed groups. | Design artifacts and catalog. | Compare actual sizes in both themes and normal/active/disabled states; record keep/refine/replace decisions by family. |
| I04 · P1 | Define the graphic family and replace ambiguous everyday-task icons first. | Original SVGs, `SvgIcon` shell, tokens, and presets. | Consistent optical scale, stroke, internal spacing, alignment, and accents; adjacent actions remain distinguishable at small sizes. |
| I05 · P2 | Complete contextual families and SVGs required by new capabilities. | Tables, Pictures, Shapes, Equations, and new contributions. | Insert/delete, row/column, horizontal/vertical, color/border, and crop/resize are distinct. Deliver the icon with the usable capability. |
| I06 · P1 | Validate themes, sizes, and accessibility. | `SvgIcon`, CSS, tokens, accessible names, and focus. | Decorative icons do not duplicate announcements; buttons have names; color is not the only distinction; focus/selection/disabled states remain legible in required browsers. |
| I07 · P2 | Guard against resolution and appearance regressions. | Catalog, existing audit, and visual scenarios. | Invalid names or expected icons that fail to render produce diagnostics. Critical-family screenshots accompany changes; verify rendering beyond renderer-function existence. |

#### First families to review

| Order | Family/candidate | Observed problem or hypothesis to verify | Improvement direction |
| --- | --- | --- | --- |
| 1 | Paste, Copy, Cut, and Format Painter | Large icons with unequal optical weights contribute to an oversized Clipboard group. | Review optical size with the new stack; keep Paste recognizable as the primary action and distinguish painter modes. |
| 2 | Font color, highlighting, and shading | Generic text, marker, and bucket symbols may communicate target/current color inconsistently. | Distinct families with current-color feedback; separate the variant arrow from the primary action. |
| 3 | Header, Footer, and Page Number | `panel-top`/`panel-bottom` and `hash` resolve technically, but may be too generic for document actions. | Evaluate original page glyphs emphasizing top/bottom regions and numbering, readable at small sizes. |
| 4 | Margins, Orientation, and section setup | Page geometry actions need distinguishable silhouettes. | Use page/margin/orientation metaphors while preserving useful Margins diagrams. |
| 5 | Merge, Split, Insert, and Delete in tables | Similar grids carry many operation marks whose details may disappear at small sizes. | Simplify the grid, emphasize axis/action, check accent contrast, and retain row/column distinctions. |
| 6 | Distribute, AutoFit, and dimensions | Similar arrows can represent different operations. | Distinguish fitting to contents, distribution, and resizing rather than using one width symbol throughout. |
| 7 | Cell alignment and sorting | Collapsed-group icons must represent a family; options must represent positions/order. | Spatial alignment matrix, readable sort direction, and explicit family labels. |
| 8 | Footnotes and typography | The current footnote SVG uses `text` with system fonts; metrics can vary across platforms. | Check baselines and shapes on target systems; use original paths when needed for stability. |
| 9 | Themes, styles, and effects | A generic palette icon cannot replace a preview of the result. | Use an icon for the family and a gallery for options; preserve useful previews. |
| 10 | New Shape, Draw, Equation, and Reference tools | Future capabilities may require specific artwork not determined by the current inventory. | Define the minimum set per delivery without exposing icons/buttons for unavailable capabilities. |

Do not redraw the entire library on aesthetic preference alone. Keep readable icons that work, refine inconsistent ones, and replace misleading metaphors. Reuse Lucide where appropriate and create original SVGs for specialized needs. Author vectors directly rather than generating bitmaps to convert into SVG. Record the origin/license of external assets. Word and WordCraft guide purpose and hierarchy; final artwork belongs to Oasis's visual system.

I01/I02 start in M0; I03/I04 accompany A01/A02 before Home composition is frozen; I05 accompanies contextual deliveries in M2/M4. Avoid broad asset replacement before determining each icon's final component size and role.

### M1b — Component and layout contracts

Implement after B02/B03; resolve V01/V02 before freezing the baseline.

| ID | Work | Files/areas | Acceptance | Size |
| --- | --- | --- | --- | --- |
| A01 | Define height, spacing, icon, typography, and state tokens; distinguish large/small controls, stacks, and galleries. | `toolbar.css`, tokens, and original icons. | Shared tokens in both themes; focus differs from selection; changes are scoped to the Ribbon and associated primitives. | M |
| A02 | Support declarative group layouts: two rows, three-small-command stacks, a large action with a side stack, and galleries. | `core/pluginUiTypes.ts`, schema, `RibbonGroup.tsx`, `RibbonRow.tsx`, and renderers. | Clipboard can become compact without sacrificing Font; two-row groups remain valid; plugin contributions still work. | M |
| A03 | Represent primary actions, split buttons, menus, and dialog launchers distinctly. | `Button`, `SplitButton`, `Menu`, presets, and schema. | Main click executes the action, arrow opens variants, launcher opens advanced options; no duplicate wrappers or parallel command handlers. | M |
| A04 | Preserve group arrangement in collapsed popups, including galleries and matrices. | `RibbonGroup.tsx`, `Popover.tsx`, positioning, and renderers. | Spatial alignment controls, viewport-fitting scrollable popups, and nested menus that do not prematurely close their parents. | M |
| A05 | Define tab-strip overflow and contextual highlighting. | `RibbonTabs.tsx`, `Toolbar.tsx`, and CSS. | Active/contextual tabs remain discoverable; all tabs are mouse/keyboard reachable at 640 px; context changes do not steal focus. | M |

A02 must preserve layering: neutral contribution vocabulary belongs in the core and presentation belongs in UI. Inventory consumers before expanding the public API and define migration or compatible defaults. Do not introduce Solid/CSS types into the core contract.

### M1c — Measurement and reduction policy

Dependencies: A02/A04 and B02. Design this work alongside the layouts and integrate it after dimensions stabilize.

| ID | Work | Files/areas | Acceptance | Size |
| --- | --- | --- | --- | --- |
| R01 | Measure `full`, `compact`, and `collapsed`; budget actual padding, borders, and gaps. | `RibbonPanel.tsx`, `ribbonModel.ts`. | Measured states match rendered states; hidden measurement variants do not change selection or create observer loops. | M |
| R02 | Key caches by tab/group/configuration and invalidate on visible-item, language, font, scale, or dimensional-theme changes. | Ribbon model and panel. | Layout's `paragraph` does not reuse Home measurements; removing plugins or switching language leaves no stale width. | M |
| R03 | Implement explicit priorities and space recovery. | Responsive resolver and group policies. | No recurrence of the observed inversion without a documented UX decision; the same width/context has the same result regardless of resize history. | M |
| R04 | Define fallback when even collapsed groups cannot fit. | Panel, navigation, and overflow. | No action becomes inaccessible through `overflow:hidden`; explicit navigation/overflow preserves focus. | M |
| R05 | Stabilize continuous resize and late font loading. | Observer, scheduling, and planner. | No idle layout oscillation or lost clicks/focus during transitions; before/after profiling shows no material regression. | M |

Proposed initial Home policy: first reduce Style card count and secondary labels, then compact Clipboard/Editing; keep Font and Paragraph directly useful while the budget allows. Any subsequent collapse follows documented task priorities. Do not promise a fixed card count or breakpoint before measuring final components.

## 6. M2 — Everyday editing deliveries by tab

Each row is a delivery family. Before adding semantics, check whether a command already exists in the core, menus, or capabilities.

| ID / tab | Presentation change | Functional workflow to close | Specific acceptance |
| --- | --- | --- | --- |
| D01 · Home/Clipboard | Large Paste; Cut/Copy/Painter stack; persistent history area outside critical formatting space. | Rich/text/merged paste, permission failure, one-shot/sticky painter. | Preserve selection; Copy does not mutate the document; Cut deletes only after successful copying; Safari has a usable path and appropriate feedback. |
| D02 · Home/Font | Readable fields, underline/color splits, stable ordering, consistent menus. | Mixed states, invalid sizes, multirun selections, undo. | Menus apply to the original target; correct active/mixed values; editing keys do not trigger unrelated commands. |
| D03 · Home/Paragraph | Hierarchy for lists, alignment, indents, and spacing; separate quick libraries from advanced options. | Numbering restart/continuation, lists in tables, indent/spacing values. | Document and export reflect values; editing/undo preserve list levels. |
| D04 · Insert | Pages → Tables → Illustrations → Links → Header/Footer → Text/Symbols where populated. | Table grid, links/bookmarks, fields, headers/footers, page X of Y. | Short paths for frequent actions; correct section/story; non-destructive insertion does not overwrite existing header content. |
| D05 · Layout | Page Setup and Paragraph with direct fields; preserve Margins previews. | Paper, orientation, margins, sections, indents, spacing; columns only with complete support. | Clear units, correct section target, coherent pagination/PDF and undo. |
| D06 · Design | Document formatting gallery, themes/colors/fonts, page background according to capability readiness. | Apply themes and distinguish theme colors from direct RGB. | Recognizable previews; preserve local styles appropriately; supported watermarks/borders persist. |
| D07 · Table Design | Preserve previews; distinguish choosing and managing styles; consistent borders/shading. | Conditional options, cell/table targeting, colors, borders. | Correct header/banding/first-column effects; DOCX retains styles and borders. |
| D08 · Table Layout | Selection/deletion menus; insert/merge; direct dimensions; spatial alignment; Data for sorting/conversion. | Dimensions, cell margins, vertical alignment, repeated headers, split/conversion, AutoFit. | Understandable horizontal/vertical combinations; nested-table operations target correctly. Do not expose nine presets unless the model supports their results. |
| D09 · Picture Format | Adjust, Styles, Accessibility, Arrange, and Size populated only with available actions. | Aspect ratio, crop, dimensions, alt text; arrangement/rotation according to support. | Explicit units, aspect lock where available, original bitmap retained, preview/export matching the crop. |

Primary files: `presets/defaultToolbar.ts`, `ribbonPlacements.ts`, `buttonSpecs.ts`, Toolbar galleries/controls, `essentialsCommandGroups/*`, and `ui/app/essentials/*`. For semantic gaps, identify the specific `core/commands`, model, layout, and import/export files in the ticket before starting.

## 7. M3 — Professional documents

| ID / tab | Work and dependencies | Acceptance |
| --- | --- | --- |
| P01 · Review | Consolidate existing comment commands; accept/reject current/selected/all; navigation and markup display with explicit scope. | Anchors, replies, and authorship survive editing/undo; correct disabled state without revisions; current and all-change actions cannot be confused. |
| P02 · References | Close TOC/notes, then captions/cross-references and sources/citations/bibliography. Depends on fields, anchors, and pagination updates. | Updates do not duplicate content; broken targets have defined handling; applicable DOCX fields and links persist. |
| P03 · View | Organize modes, zoom, show/hide, and navigation; place technical font settings appropriately. | Zoom does not mutate content; modes preserve selection; shared status-bar actions expose the same state. |
| P04 · File | Define document lifecycle: create/open/import, export, print, dirty state, and errors. Saving integrates through the host contract. | Cancel does not discard content; export failure retains the document; no fictitious save action without persistence. |
| P05 · Search and quick access | Consolidate find/replace, command search, and history/QAT; customization follows stable states. | Search reaches results; replacement scope is clear; keyboard/Ribbon dispatch the same command; preferences do not contaminate DOCX state. |
| P06 · Interoperability | Apply the OOXML roadmap to new capabilities and preservation during adjacent edits. | Fixtures import → edit → export → reimport; Word opens without repair; unrelated parts survive; PDF reflects supported changes. |

Comments, revisions, and headers already have implementation and partial exposure. Begin by verifying the complete path rather than recreating those subsystems.

## 8. M4 — Advanced and specialized tabs

| Order | Family | Prerequisites | Minimum usable delivery |
| --- | --- | --- | --- |
| 1 | Shape Format | Shape/text model, selection, geometry, serialization. | Fill/outline, text, size, arrangement with rendering and undo. |
| 2 | Equation | Editable math model, navigation, rendering, scoped OMML support. | Symbols/structures, input modes, Inline/Display, internal selection and export preservation. |
| 3 | Draw | Pointer/pen input, coordinates, strokes, persistent model. | Selection, pen, color, thickness, eraser, undo; touch does not improperly compete with scrolling. |
| 4 | Advanced References | Stable fields/anchors/citations. | Captions, cross-references, bibliography; indexes/authorities follow demand and readiness. |
| 5 | Mailings | Typed fields, generic data source, templates, batch output. | Configure → recipients → fields → preview → generate; defined per-record errors and deterministic output. |
| 6 | Developer/Forms | Content controls in the model, properties, persistence. | Insert/edit controls, properties, design mode, preservation of unknown controls. Macros require a separate project. |
| 7 | Charts and SmartArt | Object data/layout models, selection, export. | Explicitly supported subset with real editing and preservation of the remainder; a button does not establish support. |
| 8 | Integrations/Plugins | Contribution contract, state, preference persistence. | Named consistent groups; extension removal clears items/measurements; optional Zotero integration with its own contract. |
| Cross-cutting | Help | Task and shortcut documentation. | Reachable help, shortcuts, feedback, and clear links without duplicating another product's support/community services. |

New tabs ship when their minimum usable delivery is demonstrated. Declaring a new `RibbonTabId` is not a functional milestone. Contribution API changes follow the neutral design in `core/pluginUiTypes.ts`.

## 9. Cross-cutting validation and M5

### Scenario matrix

- Actual content widths: 1440, 1200, 960, 800, and 640 px, with measured dimensions. Establish the supported minimum after B02 and verify explicit fallback below it.
- Resize: direct loading, shrinking, expanding, tab switching, late fonts, extension addition/removal, and selection changes with a popup open.
- Themes/languages: light/dark, pt-BR/en, long labels, browser zoom. Verify RTL before claiming comparable support.
- Selection: caret, multirun, multiple paragraphs, lists, cells/nested tables, pictures, headers/footers, read-only mode, IME.
- Input: mouse, keyboard, VoiceOver/Safari, and touch for tools advertised as supporting it.
- States: normal, active, mixed, disabled, focused, submenu; no state communicated only by color.

### Tests and evidence strategy

1. Pure functions: visible groups, budgets, invalidators, reduction policies, direct loading versus resize. Use minimal meaningful scenarios for the observed regressions.
2. Components/browser: layout contracts, focus, selection, popup dismissal, nested menus, tab navigation, and actual adaptation. Use browsers for behavior simulated dimensions cannot establish.
3. Visual: checkpoint each state and reduction boundary, cropping the Ribbon plus complete popup. Exclude document content unless needed to demonstrate a command's result.
4. Commands: states, parameters, mutation, undo/redo, and export/reimport when document content changes.
5. Guided manual checks: short tasks in Safari/VoiceOver and Word itself using synthetic documents. Record observed steps/time and establish a baseline before promising numerical improvement.
6. Performance: compare resize/gallery opening before and after changes without repetitive layout work or observer loops. Establish budgets from M0 measurements.

The initial harness had `@solid-refresh` failures in certain TSX tests, as recorded in AGENTS.md. The current local harness can execute the full suite; record the actual result for each delivery. CI remains the authority, and DOM tests do not replace browser, Safari or VoiceOver evidence.

### Delivery gates

Run checks relevant to each implementation. Before pushing, follow repository gates: `npm run typecheck`, `npm run lint` clean in changed files, non-UI Vitest, and `npm run audit:ribbon`, followed by `git pull --rebase` and push. Add the ticket's required browser/format scenarios. Documentation-only changes do not require the implementation suite.

Do not manually edit generated matrix snapshots. `audit:ribbon` certifies static wiring; visual/functional evidence remains independent.

## 10. First tickets and commit order

| Order | Initial ticket | Dependency | Reviewable result |
| --- | --- | --- | --- |
| 1 | B01 — reconcile inventory and identify stale evidence. | None. | Current statuses without deleting history. |
| 2 | B02/B03 — isolated host and synthetic fixtures. | Defined baseline. | Complete captures with width/context metadata. |
| 3 | V01 — group names. | Inventory. | Correct `headerFooter`/`sort`; verify remaining names. |
| 4 | V02 — visible groups and separators. | Fixtures. | No empty groups in required scenarios. |
| 5 | V03 — style gallery. | Fixtures/themes. | Before/after comparison with recognizable samples. |
| 6 | I01–I04 + A01/A02 — SVG inventory/review sheet, tokens, group layouts. | Reliable measurements. | Clipboard demonstrating a large action plus three-command stack. |
| 7 | A04/R01/R02 — popups and actual measurements. | Layouts. | Measured states and context-isolated caches. |
| 8 | R03/R04/R05 — policy, overflow, stability. | Measurements. | Resize sequence without unplanned inversions or inaccessible actions. |
| 9 | D01/D02/D03 — finish Home. | Planner/components. | Complete Safari workflows and required-width evidence. |
| 10 | D04/D05/D07/D08/D09 — Insert, Layout, Tables, Pictures. | Home and required commands. | One task family per delivery with specific acceptance. |

Do not combine these tickets into one rewrite. For semantic gaps, follow repository conventions: core/command plus tests in a separate commit, followed by wiring/preset/parity. For presentation changes, separate generic components from tab adoption when each commit can remain usable.

Declaration-level type imports use top-level `import type`; local handler casts follow existing conventions. Keep the planner pure; UI components do not write directly to the document.

## 11. Risks, decisions, and scope control

| Risk/decision | Treatment |
| --- | --- |
| The initial roadmap lists already implemented actions as absent. | B01 reconciles each item before implementation and retains historical links. |
| Caching/metrics may over-reduce groups. | Instrument before attributing causality; fix policy and measurement with separate evidence. |
| Redesign breaks plugins or compact mode. | Inventory consumers, provide compatible defaults, and verify both modes per delivery. |
| Layout looks better but loses caret/IME state. | Selection/focus are functional gates starting at A03. |
| Additional controls hide essential capabilities. | Prioritize tasks and measure discovery cost rather than filling available space. |
| Word differs across desktop/web/macOS. | Fix the reference per capability and record exceptions; avoid an implicit mixture of versions. |
| A menu looks complete but fails in persisted files. | Apply the acceptance ladder and OOXML plan to document mutations. |
| Charts, SmartArt, and mail merge expand the schedule. | Deliver after M2/M3, split into usable capabilities, and preserve content that remains uneditable. |

## 12. Track progress without inflating parity

At each milestone, publish completed tickets, exercised scenarios, before/after comparisons, known regressions, and unverified capabilities. Update the structured catalog and regenerate the matrix when bindings change.

M1 supports a claim of consistent presentation and predictable adaptation. M2 establishes demonstrated quality for selected everyday tasks. Office functional-equivalence claims also require verified professional workflows and interoperability for the advertised scope; not every product edition necessarily requires every M4 capability.

Design references: [Microsoft — Ribbons](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-ribbons) and [Microsoft — Tab.ScalingPolicy](https://learn.microsoft.com/en-us/windows/win32/windowsribbon/windowsribbon-element-tab-scalingpolicy). These establish organization/reduction principles; validate concrete behavior in the chosen Word versions.
