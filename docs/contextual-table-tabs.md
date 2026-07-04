# Contextual Table Tabs — Implementation Plan

A multi-phase plan to add MS Word–style **contextual ribbon tabs** that appear
only when the caret is inside a table: **Design da Tabela** (table styles,
shading, borders) and **Tabela Layout** (rows/columns, merge, cell size,
alignment).

## Why

Word surfaces table tools through two contextual tabs that flip into the ribbon
the moment the selection enters a table, and vanish when it leaves. oasis-editor
today buries every table tool inside a single dropdown (`TableGroup`) on the
static **Layout** tab, gated only by per-item `isVisible`. The ribbon tab strip
itself is static — every tab in `RIBBON_TABS` renders unconditionally, and there
is no notion of a tab that shows/hides on selection.

Goal: two contextual tabs mirroring Word, with **full command parity** —
including the currently-missing `tblLook` toggles, a table-style gallery, and
distribute rows/columns.

> The data model already supports every Design feature
> (`EditorTableStyle.tblLook`, `conditionalFormats`, `rowBandSize`, resolver in
> `tableStyleResolver.ts`). The gap is **command + UI wiring**, not the model.

## Current architecture (what we build on)

| Concern | Where |
| --- | --- |
| Tab vocabulary (`RIBBON_TABS`) | `src/core/pluginUiTypes.ts` |
| Tab strip (renders all tabs unconditionally) | `src/ui/components/Toolbar/ribbon/RibbonTabs.tsx` → `buildRibbonTabDefinitions()` in `ribbonModel.ts` |
| Active tab signal + panel filtering | `src/ui/components/Toolbar/Toolbar.tsx` (`activeTab`), `RibbonPanel.tsx` (`buildRibbonGroups`) |
| "Am I in a table?" signal | `commands.state("tableContext").isActive` (`table.insideTable()`) in `src/plugins/internal/essentialsCommandGroups.ts` |
| Selection-change broadcast | `src/ui/app/createEditorChangeBroadcast.ts` |
| Item placement (pure data) | `RIBBON_PLACEMENTS` + `withDefaultRibbonPlacement()` in `src/ui/components/Toolbar/presets/defaultToolbar.ts` |
| Existing table commands | `buildTableCommands` (essentials); producers in `src/core/commands/table/` |
| Table style model + resolver | `src/core/model/types/styles.ts`, `src/core/tableStyleResolver.ts` |

**Existing commands to reuse (do not rebuild):** `tableMerge`, `tableSplit`,
`tableInsertRowBefore/After`, `tableDeleteRow`, `tableInsertColumnBefore/After`,
`tableDeleteColumn`, `tableCellShading`, `tableCellBorders`,
`tableCellNoBorders`, `tableWidth100`, `tableAlignLeft/Center/Right`,
`tableSetCellWidth`. Key producers: `setActiveTableStyleValue` (already writes
`tblLook`, `styleId`, band sizes) and `setSelectedTableRowHeader`.

---

## Phase 1 — Conditional contextual tabs (framework)

The core gap: the ribbon has no concept of a tab that appears/disappears. This
phase adds it, using the `tableContext` signal that already exists.

- **Register the tabs.** Add `tableDesign` and `tableLayout` to `RIBBON_TABS`
  (`pluginUiTypes.ts`), plus entries in `TAB_LABEL_KEYS`, `RIBBON_GROUP_ORDER`,
  and `RIBBON_GROUP_RESIZE_DEFAULTS` in `ribbonModel.ts`.
- **Mark them contextual.** Add a small tab-metadata map (e.g.
  `CONTEXTUAL_TABS: Set<RibbonTabId>`) so the framework knows these two are
  hidden by default.
- **Filter the tab strip.** Give `buildRibbonTabDefinitions` access to the
  toolbar `api` (or a boolean predicate) so a contextual tab is included only
  when `api.commands.state("tableContext").isActive`.
- **Make the strip reactive.** `RibbonTabs` currently computes `tabs` once. Wrap
  it in a `createMemo` that reads the table-context signal so the strip
  re-renders on selection change; pass `api` down from `Toolbar.tsx`.
- **Auto-switch (Word parity).** In `Toolbar.tsx`, a `createEffect`:
  - inactive → active table context: set `activeTab` to `tableDesign`
    (or `tableLayout`);
  - active → inactive while a contextual tab is selected: fall back to `home`.
- **Visual treatment.** A contextual-tab CSS class (accent-colored group-header
  strip) in `src/styles/oasis-editor/toolbar.css`, using existing design tokens.
  Only light-mode token values are needed (no dark theme ships today).

## Phase 2 — Populate "Tabela Layout" from existing commands

Pure re-placement of already-implemented commands into first-class ribbon
buttons (instead of the dropdown).

Add ribbon items to `defaultToolbar.ts` with `tab: "tableLayout"`, grouped as
Word does:

- **Rows & Columns** — insert above/below/left/right, delete row/column/table.
- **Merge** — merge cells, split cells, split table.
- **Cell Size** — cell width, distribute rows/columns (see Phase 4).
- **Alignment** — the nine cell-alignment buttons + cell width.

Gate each button with `isEnabled` from its command state. Once parity is reached,
retire the monolithic `TableGroup` dropdown on the Layout tab (or keep it only as
a compact-mode fallback).

## Phase 3 — "Design da Tabela": tblLook toggles + shading/borders

Build the missing command layer, then wire the UI.

- **New toggle commands** in `buildTableCommands`
  (`essentialsCommandGroups.ts`), each backed by
  `setActiveTableStyleValue(state, tableId, "tblLook", …)`:
  `tableToggleHeaderRow`, `tableToggleTotalRow`, `tableToggleBandedRows`,
  `tableToggleFirstColumn`, `tableToggleLastColumn`, `tableToggleBandedColumns`.
  Each `isActive` reads the corresponding `tblLook` flag from the resolved style.
  Expose the names in `src/core/commands/publicCommandTypes.ts`.
- **Table Style Options group** on `tableDesign` — the six checkboxes from the
  screenshot's left group, as `toggle` items.
- **Borders group** — move shading + borders here, reusing `tableCellShading`,
  `tableCellBorders`, `tableCellNoBorders`. Promote shading to a real
  `colorPicker` item instead of the current `prompt()`.

## Phase 4 — Table-style gallery + distribute/autofit (parity finish)

- **Style gallery** (the large center gallery in the Design screenshot): a new
  `tableStyleGallery` command that lists available named table styles and applies
  one via `setActiveTableStyleValue(state, tableId, "styleId", id)`. Render with
  the existing `styleGallery` item type on `tableDesign`. Source styles from the
  document's table-style definitions, with a small built-in set as fallback.
- **Distribute rows / columns** and **AutoFit** toggle on `tableLayout`: new
  commands over `setTableColumnWidths` / row-height producers and the
  `EditorTableStyle.layout: "fixed" | "autofit"` field.
- **i18n**: add `ribbon.tab.tableDesign` / `ribbon.tab.tableLayout`, the new
  `ribbon.group.*` keys, and per-button tooltip keys under `src/i18n/`.

## Phase 5 — Tests & docs

- **Unit** — tab visibility flips with `tableContext` (extend the toolbar/ribbon
  test suite); new command producers (`tblLook` toggles round-trip through the
  model + resolver, mirroring existing table command tests).
- **Integration** — caret enter/exit table flips the tab strip and auto-selects
  the contextual tab.
- **Docs** — update `docs/plugin-api.md` with the contextual-tab contribution
  pattern (how a plugin can register a `contextual` tab).

---

## Files touched (representative)

- `src/core/pluginUiTypes.ts` — new tab ids (+ optional `contextual` metadata).
- `src/ui/components/Toolbar/ribbon/ribbonModel.ts` — label keys, group order,
  contextual filtering in `buildRibbonTabDefinitions`.
- `src/ui/components/Toolbar/ribbon/RibbonTabs.tsx` — reactive, api-aware strip.
- `src/ui/components/Toolbar/Toolbar.tsx` — pass `api`, auto-switch effect.
- `src/ui/components/Toolbar/presets/defaultToolbar.ts` — new items + placements.
- `src/plugins/internal/essentialsCommandGroups.ts` +
  `src/core/commands/publicCommandTypes.ts` — new `tableToggle*`,
  `tableStyleGallery`, distribute/autofit commands (reusing
  `src/core/commands/table/` producers).
- `src/styles/oasis-editor/toolbar.css` — contextual-tab styling.
- `src/i18n/` — new keys.

## Verification

1. Typecheck / build clean after each phase.
2. Open a document, click into a table → the two contextual tabs appear and
   `tableDesign` auto-activates; click outside → they disappear and focus
   returns to Home.
3. Toggle **Header Row** / **Banded Rows** and confirm live restyle; export to
   DOCX and re-import to confirm `tblLook` round-trips (reuse the existing table
   conditional-formatting import/export tests).
4. Run the toolbar + table command test suites, including the new visibility and
   `tblLook`-toggle tests.
