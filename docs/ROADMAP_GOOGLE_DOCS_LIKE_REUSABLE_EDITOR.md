# Oasis Editor — Roadmap to "Google Docs UX, CKEditor 5 Reusability"

> **Audience:** AI agent (Amp / Claude / Codex / etc.) executing this plan autonomously, one phase at a time.
> **Owner:** @celsowm
> **Status:** Draft v1 — 2026‑05‑04
> **Source of truth for goal:** Build an editor that *feels* like Google Docs to end users, but ships as a *headless‑first, embeddable, plugin‑driven* component the way CKEditor 5 does.

---

## 0. How an Agent Should Use This Document

1. Read **§1 Vision** and **§2 Current State Snapshot** before touching code.
2. Pick the **lowest‑numbered open phase** in **§5 Execution Phases**.
3. For each phase:
   - Re‑read the relevant files listed under *Touch Points*.
   - Implement the *Deliverables*.
   - Satisfy every item in *Acceptance Criteria*.
   - Run the *Verification* commands and paste results in the PR description.
   - Update this document's *Progress Log* (§9) with date + commit hash.
4. **Never** start a later phase before the previous phase's Acceptance Criteria are green, unless §5 explicitly says the work is parallelizable.
5. Prefer the **smallest correct change**. No speculative refactors outside the phase scope.
6. If a decision is ambiguous, write the question into §10 *Open Questions* and pick the option that minimizes API surface; do **not** block waiting for a human.

---

## 1. Vision

A single product, **two faces**:

| Face | Looks/Behaves Like | Primary Consumer |
|---|---|---|
| **Document Shell** (default) | Google Docs | End users writing long‑form documents |
| **Embeddable Component** | CKEditor 5 / TipTap | Developers integrating into CMS, SaaS forms, chat composers |

Non‑negotiables:

- **Headless core** that runs without any DOM UI (drives schema, commands, selection, history, OT/CRDT later).
- **Replaceable UI shells** (`document`, `inline`, `balloon`, `headless`) sharing one core.
- **Plugin contract** so third parties can register: toolbar items, menu items, side panels, status‑bar items, schema nodes/marks, commands, keymaps.
- **Theming via CSS custom properties** so host apps can re‑skin without forking.
- **Framework‑agnostic public API** (works in vanilla JS, React, Vue, Svelte, Angular). Internal implementation may stay Solid.js.

---

## 2. Current State Snapshot (verified 2026‑05‑04)

### Tech stack
- **Build:** Vite 5, dual entry: `build:lib` (library) + `build:app` (demo). Already publishes ESM + UMD + types via `package.json#exports`.
- **UI framework:** Solid.js 1.9 (`vite-plugin-solid`).
- **Native acceleration:** Rust crate at `rust-core/` compiled to WASM (`npm run wasm:build`), output to `public/wasm`.
- **Tests:** Vitest (`npm test`) + Playwright (`npm run test:e2e`).
- **Lint/format:** ESLint + Prettier.

### Source tree (relevant)
```
src/
  index.ts                       ← public exports
  main.ts                        ← demo bootstrap
  core/
    editorCommands.ts            (~99 KB — monolithic command surface)
    editorState.ts
    model.ts                     (~22 KB — document model)
    selection.ts
    tableLayout.ts
    cloneState.ts
    wordBoundaries.ts
  ui/
    OasisEditorApp.tsx           (~65 KB — Solid root, holds the whole shell)
    OasisEditorContainer.tsx
    OasisEditorEditor.tsx
    layoutProjection.ts          (~27 KB)
    toolbarStyleState.ts
    components/
      EditorSurface.tsx          (~37 KB — contenteditable surface)
      CaretOverlay.tsx
      SelectionOverlay.tsx
      RevisionOverlay.tsx
      Toolbar/                   ← top toolbar
      FloatingToolbar/           ← selection bubble
      FindReplace/
      Dialogs/
  app/
    bootstrap/
      createOasisEditorApp.ts
      createOasisEditorContainer.ts
    controllers/                 ← "use*" hooks (Solid pseudo-hooks)
      EditorCommandRegistry.ts
      EditorCommandsController.ts
      useEditorClipboard.ts
      useEditorFindReplace.ts
      useEditorImageOperations.ts
      useEditorKeyboard.ts
      useEditorLayout.ts
      useEditorPersistence.ts
      useEditorTableDrag.ts
      useEditorTableOperations.ts (~47 KB)
      useEditorTableResize.ts
    services/
      FindReplaceService.ts
      PersistenceService.ts
  import/   export/   utils/   styles/   __tests__/
```

### What's already aligned with the goal ✅
- Public ESM/UMD entry exists.
- Headless‑style separation already started: `core/` vs `ui/` vs `app/controllers/`.
- Command registry pattern (`EditorCommandRegistry.ts`) is the seed of a plugin system.
- A `OasisEditorContainer` factory exists for embedding.

### Gaps blocking the goal ⚠️
1. `OasisEditorApp.tsx` (~65 KB) and `EditorSurface.tsx` (~37 KB) are **monolithic** — they import everything; not tree‑shakeable.
2. `editorCommands.ts` (~99 KB) is one file — impossible to register/unregister granularly.
3. No **menu bar**, **doc title bar**, **outline panel**, **comments rail**, **insert dialogs** beyond the basics.
4. No **shell switching** (only the document/paper shell exists).
5. No **plugin registration API** for external code.
6. No **CSS custom property** theming layer; styles live in `styles/oasis-editor.css` with hard‑coded values (verify before refactor).
7. No **framework adapters** (`@oasis/react`, `@oasis/vue`).
8. Mixed locale (Portuguese in UI, English elsewhere) — needs **i18n layer**.
9. No **collaboration**, **comments**, **suggestions**, **AI** affordances.
10. Status bar only shows characters — no words, pages, zoom.

---

## 3. Target Architecture

```diagram
╭───────────────────────────────────────────────────────────────╮
│ @oasis/core            (no DOM, no Solid)                     │
│   - schema (nodes, marks)                                     │
│   - model (immutable doc)                                     │
│   - selection                                                 │
│   - transactions / history                                    │
│   - command registry                                          │
│   - keymap registry                                           │
│   - plugin host (lifecycle: install, destroy)                 │
│   - event bus                                                 │
╰───────────────────────────────────────────────────────────────╯
                  ▲                              ▲
                  │ used by                      │ used by
╭──────────────────────────────╮   ╭──────────────────────────────╮
│ @oasis/view                  │   │ @oasis/plugins/*             │
│   - DOM renderer             │   │   tables, images, links,     │
│   - input handling           │   │   lists, code, math, mentions│
│   - selection painter        │   │   outline, pagination,       │
│   - layout projection        │   │   comments, suggestions,     │
│   - WASM bridge              │   │   collab (yjs), ai           │
╰──────────────────────────────╯   ╰──────────────────────────────╯
                  ▲
                  │
╭───────────────────────────────────────────────────────────────╮
│ @oasis/ui              (Solid widgets, slot‑based)            │
│   Toolbar  Menubar  StatusBar  TitleBar  SidePanel  Dialogs   │
╰───────────────────────────────────────────────────────────────╯
                  ▲
                  │
╭───────────────────────────────────────────────────────────────╮
│ @oasis/shells                                                 │
│   DocumentShell  (Google‑Docs‑like, the current screen)       │
│   InlineShell    (CKEditor classic, single contenteditable)   │
│   BalloonShell   (no chrome, floating bubble on selection)    │
│   HeadlessShell  (just core + view, host renders everything)  │
╰───────────────────────────────────────────────────────────────╯
                  ▲
                  │
╭──────────────────────────────╮   ╭──────────────────────────────╮
│ @oasis/react                 │   │ @oasis/vue                   │
│   <OasisEditor shell="…"/>   │   │   <OasisEditor shell="…"/>   │
╰──────────────────────────────╯   ╰──────────────────────────────╯
```

> **Implementation note:** packages above can be **folders inside `src/packages/*`** initially, exported through the existing single `package.json`. A real monorepo (pnpm workspaces / changesets) is **Phase 9**, not now.

---

## 4. Public API Sketch (what we're committing to)

```ts
// Headless
import { Editor } from "oasis-editor";

const editor = new Editor({
  doc: { type: "doc", content: [...] },
  plugins: [tables(), images(), outline(), comments(), collab({ provider })],
  keymaps: [{ key: "Mod-b", command: "bold" }],
});

editor.commands.bold();
editor.on("change", (state) => save(state.doc));
editor.destroy();

// With UI shell (vanilla)
import { mount, DocumentShell } from "oasis-editor";

const ui = mount(document.getElementById("root")!, {
  editor,
  shell: DocumentShell,
  toolbar: { items: ["bold","italic","|","heading","bulletList","|","insertTable"] },
  menubar: true,
  outline: true,
  statusBar: { items: ["words","chars","pages","zoom","saved"] },
  theme: "light",
  locale: "pt-BR",
});

ui.unmount();

// Plugin contract
export function myPlugin(): OasisPlugin {
  return {
    name: "my-plugin",
    schema: { nodes: { … }, marks: { … } },
    commands: { sayHi: ({ dispatch }) => dispatch.insertText("hi") },
    keymaps: [{ key: "Mod-Alt-h", command: "sayHi" }],
    toolbar: [{ id: "sayHi", icon: "wave", command: "sayHi", group: "insert" }],
    menubar: [{ id: "sayHi", path: "Insert/Say hi", command: "sayHi" }],
    install(editor) { /* … */ return () => { /* destroy */ }; },
  };
}
```

---

## 5. Execution Phases

> Each phase is sized so an agent can complete it in **one working session** (≤ ~6 h of agent time).
> Every phase ends with: tests green, build green, demo still works, doc updated.

---

### **Phase 1 — Theming Tokens & Visual Audit** *(quick win; no architectural risk)*

**Touch Points**
- `src/styles/oasis-editor.css`
- `src/styles/oasis-editor-demo.css`
- `src/ui/components/Toolbar/*`
- `src/ui/OasisEditorApp.tsx`

**Deliverables**
1. Introduce a CSS custom‑property layer in `styles/oasis-editor.css`:
   ```css
   :root, .oasis-editor {
     --oasis-bg: #f6f8fb;
     --oasis-paper: #ffffff;
     --oasis-paper-shadow: 0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.07);
     --oasis-toolbar-bg: #ffffff;
     --oasis-toolbar-border: #e0e3e7;
     --oasis-text: #202124;
     --oasis-text-muted: #5f6368;
     --oasis-accent: #1a73e8;
     --oasis-accent-soft: #e8f0fe;
     --oasis-radius: 8px;
     --oasis-font-ui: "Inter", system-ui, sans-serif;
     --oasis-font-doc: "Source Serif Pro", Georgia, serif;
   }
   .oasis-editor[data-theme="dark"] { … }
   ```
2. Replace **every hard‑coded color/radius/shadow** in editor CSS with a token. Demo CSS may keep brand colors.
3. Raise icon contrast to WCAG AA (≥ 4.5:1 against `--oasis-toolbar-bg`).
4. Add **tooltips** (`title=` + `aria-label=`) to every toolbar button, including the keyboard shortcut.

**Acceptance Criteria**
- `grep -rE "#[0-9a-fA-F]{3,6}" src/styles/oasis-editor.css | wc -l` → only inside `:root` declaration blocks.
- All toolbar buttons have non‑empty `aria-label`.
- A consumer can override the theme by setting `--oasis-accent: red` on a wrapper.

**Verification**
```bash
npm run lint
npm run test
npm run build
npm run dev   # smoke check; screenshot the toolbar
```

---

### **Phase 2 — Status Bar v2 + i18n Skeleton**

**Touch Points**
- `src/ui/OasisEditorApp.tsx` (status bar JSX)
- `src/core/editorState.ts` (counters)
- new: `src/i18n/index.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/pt-BR.ts`

**Deliverables**
1. Tiny i18n module: `t(key, params?, locale?) → string`. No external dep. Locales are plain TS objects.
2. Replace every user‑visible string in `src/ui/**` with `t("…")`. Default locale = `pt-BR` to match current behavior.
3. Status bar renders: **words · characters · page X of Y · zoom · saved indicator**. Pages may be `1 of 1` placeholder until Phase 6.
4. Word counter implemented in `core/` (no DOM).

**Acceptance Criteria**
- Switching locale via `Editor` option flips all UI text.
- New unit tests: `wordCount("Hello world.") === 2`, handles CJK reasonable fallback (split on whitespace + punctuation), empty doc → 0.

**Verification**
```bash
npm run test -- --run wordCount
npm run dev
```

---

### **Phase 3 — Menu Bar (File / Edit / View / Insert / Format / Tools / Help)**

**Touch Points**
- new: `src/ui/components/Menubar/Menubar.tsx`
- new: `src/ui/components/Menubar/menuRegistry.ts`
- `src/ui/OasisEditorApp.tsx` (mount above the toolbar)
- `src/app/controllers/EditorCommandRegistry.ts` (expose commands by id)

**Deliverables**
1. Menu bar component rendering a registry of `MenuItem { id, path, command?, shortcut?, when?, separator? }`.
2. Default menu populated from existing commands:
   - **File:** New, Open (.docx, .md, .html), Save, Download as → (PDF, DOCX, HTML, MD), Print
   - **Edit:** Undo, Redo, Cut, Copy, Paste, Find & Replace, Select All
   - **View:** Show Outline, Show Ruler, Full Screen, Zoom (50/75/100/125/150/200%)
   - **Insert:** Image, Table, Link, Horizontal Rule, Page Break, Special Character, Comment
   - **Format:** Text → (Bold/Italic/…), Paragraph styles, Align, Line spacing, Lists, Clear formatting
   - **Tools:** Word count, Spelling (placeholder), Preferences
   - **Help:** Keyboard shortcuts, About
3. Keyboard shortcuts displayed on the right side of each menu item.
4. Menus close on `Esc`, on outside click, on item activation. Arrow‑key navigation.

**Acceptance Criteria**
- All current toolbar actions are reachable via the menu.
- Menus are accessible: `role="menubar" / "menu" / "menuitem"`, full keyboard nav.
- Disabled items reflect `when?` predicate (e.g., Paste disabled when clipboard empty — best effort).

**Verification**
- New e2e test in `e2e/menubar.spec.ts`: open every top‑level menu, click "Insert > Horizontal Rule", assert HR appears.

---

### **Phase 4 — Document Title Bar + Share Placeholder**

**Touch Points**
- new: `src/ui/components/TitleBar/TitleBar.tsx`
- `src/app/services/PersistenceService.ts` (store title)

**Deliverables**
1. Top strip above the menu bar with: editable title `<input>` (debounced save), star toggle (placeholder), folder breadcrumb (placeholder), `Share` button (opens placeholder dialog).
2. Document model gains `metadata.title: string` (migrate persisted state with default `"Untitled document"`).
3. Browser tab title syncs with doc title.

**Acceptance Criteria**
- Editing title persists across reload.
- Title bar is **opt‑out** via shell config (`titleBar: false`) for embed scenarios.

---

### **Phase 5 — Outline Panel (Auto‑generated from H1‑H6)**

**Touch Points**
- new: `src/ui/components/Outline/OutlinePanel.tsx`
- `src/core/model.ts` or a new `src/core/headings.ts`
- `src/ui/OasisEditorApp.tsx` (slot on the left)

**Deliverables**
1. Pure function `outlineFrom(doc) → { id, level, text, anchor }[]`.
2. Left panel showing the outline; clicking an item scrolls/selects the heading.
3. Active heading highlighted on scroll (IntersectionObserver).
4. Collapsible (chevron). State persists in `localStorage`.

**Acceptance Criteria**
- Updates within ≤ 100 ms after typing/deleting a heading (debounced).
- Empty doc shows friendly empty state.
- Hidden by default in `InlineShell` and `BalloonShell`.

---

### **Phase 6 — Pagination v1 (Visual + Page Counter)**

**Touch Points**
- `src/ui/layoutProjection.ts`
- `src/core/tableLayout.ts` (probably untouched)
- new: `src/ui/components/PageBreak.tsx`

**Deliverables**
1. Layout pass that splits content into virtual pages by accumulated height; insert visual page‑break separators.
2. Status‑bar `page X of Y` becomes accurate.
3. Real `Insert > Page Break` command (already drafted in Phase 3) emits a hard break that the layout respects.
4. Print stylesheet (`@media print`) renders one DOM page per virtual page.

**Acceptance Criteria**
- A 5‑page document shows 5 separators and `1 of 5 … 5 of 5` as the caret moves.
- Print preview produces the expected page count.

> ⚠️ This phase has the highest layout risk. Keep the algorithm naive (no widow/orphan, no header/footer yet). Header/footer = future phase.

---

### **Phase 7 — Plugin Host & Command Registry Refactor**

**Touch Points**
- `src/core/editorCommands.ts` (split!)
- `src/app/controllers/EditorCommandRegistry.ts`
- new: `src/core/plugin.ts`
- new: `src/core/pluginHost.ts`

**Deliverables**
1. Define `OasisPlugin` interface (see §4).
2. Move existing command implementations from `editorCommands.ts` into per‑feature modules under `src/core/commands/{text,block,list,table,image,link,history,clipboard}.ts`. The big file becomes a thin re‑export for back‑compat (mark `@deprecated`).
3. `Editor` constructor accepts `plugins: OasisPlugin[]`. Built‑in features are themselves plugins, registered by default unless `plugins: { override: true }` is set.
4. Toolbar and menu bar consume the registry; no hard‑coded button list.

**Acceptance Criteria**
- Removing `tablesPlugin()` from the plugin list removes the table button, the `Insert > Table` menu item, and the table commands from `editor.commands`.
- All existing tests still pass.
- Public type `OasisPlugin` exported from `index.ts`.

---

### **Phase 8 — Shell Abstraction**

**Touch Points**
- `src/ui/OasisEditorApp.tsx` → split
- new: `src/ui/shells/DocumentShell.tsx`
- new: `src/ui/shells/InlineShell.tsx`
- new: `src/ui/shells/BalloonShell.tsx`
- `src/index.ts` exports

**Deliverables**
1. Extract the current paper‑sheet UI into `DocumentShell`.
2. Implement `InlineShell`: top toolbar + bordered contenteditable, no paper, no margins, no menu bar by default.
3. Implement `BalloonShell`: no chrome; floating toolbar on selection only.
4. `mount(target, { editor, shell, … })` chooses the shell. Each shell accepts the same slot props (`toolbarItems`, `outline`, `statusBar`, …) but applies sensible defaults.

**Acceptance Criteria**
- The demo (`src/main.ts`) shows three tabs: Document / Inline / Balloon — each working on the same `Editor` instance.
- Tree‑shaking: importing only `InlineShell` must not pull `OutlinePanel` or `Menubar` (verify with `vite build --mode lib && du -sh dist/*`).

---

### **Phase 9 — Framework Adapters**

**Touch Points**
- new: `src/packages/react/index.tsx` (uses `react`, `react-dom` as **peer deps**)
- new: `src/packages/vue/index.ts`
- `package.json` exports map

**Deliverables**
1. `<OasisEditor shell="document" plugins={[…]} value={doc} onChange={setDoc} />` for React.
2. Equivalent Vue 3 SFC.
3. Both adapters are **thin** wrappers around the vanilla `mount()`; no business logic.
4. `peerDependencies` declared; no React/Vue in main bundle.

**Acceptance Criteria**
- `npm run build:lib` produces separate ESM bundles per adapter.
- Sample apps under `examples/react/` and `examples/vue/` build & run.

---

### **Phase 10 — Insert Suite (Image, Table, Link Dialogs polished)**

**Touch Points**
- `src/ui/components/Dialogs/*`
- `src/app/controllers/useEditorImageOperations.ts`
- `src/app/controllers/useEditorTableOperations.ts`

**Deliverables**
1. Image dialog: upload (drag‑drop), URL, alt text, alignment, resize handles in‑canvas.
2. Table dialog: rows×cols picker grid, header row toggle, cell merge UI.
3. Link dialog: URL, text, open‑in‑new‑tab, edit/remove popovers on existing links.

**Acceptance Criteria**
- All three dialogs accessible from menu bar AND toolbar AND keyboard shortcut.
- Round‑trip preserved through DOCX export (`src/export`).

---

### **Phase 11 — Comments & Suggestions Rail (UX scaffolding only)**

**Touch Points**
- new: `src/core/marks/comment.ts`, `src/core/marks/suggestion.ts`
- new: `src/ui/components/CommentsRail/`

**Deliverables**
1. Schema marks: `comment(id, threadId)` and `suggestion(id, kind: insert|delete)`.
2. Right‑side rail rendering threads anchored to comment ranges; clicking a comment focuses the range; clicking a range opens the comment.
3. No backend; persists in document metadata.

**Acceptance Criteria**
- Adding a comment via `Insert > Comment` highlights the selection and creates a thread in the rail.
- Comments survive export/import round‑trip in JSON; gracefully dropped in DOCX export with a TODO log.

---

### **Phase 12 — Collaboration Hook (Yjs adapter)**

**Touch Points**
- new: `src/packages/collab-yjs/index.ts`

**Deliverables**
1. Plugin `collab({ provider })` that binds the doc to a `Y.XmlFragment`.
2. Awareness → presence avatars + remote cursors in the canvas.

**Acceptance Criteria**
- Two browser tabs editing in parallel converge.
- Disabling the plugin returns the editor to single‑user mode without errors.

---

### **Phase 13 — AI Assist Slot**

**Touch Points**
- new: `src/ui/components/AiPanel/`
- new: `src/packages/ai/index.ts` (provider‑agnostic)

**Deliverables**
1. Slot in the right rail and a floating "✨ Ask AI" button on selection.
2. Pluggable provider interface (`stream(messages) → AsyncIterable<string>`).
3. Built‑in actions: rewrite, shorten, expand, translate, summarize.

**Acceptance Criteria**
- With `provider: undefined`, the UI hides itself.
- A mock provider in tests proves the round‑trip selection→prompt→insertion.

---

## 6. Cross‑Cutting Concerns

### Accessibility (apply in every phase)
- All interactive elements have visible focus, ARIA roles, and keyboard equivalents.
- Color contrast ≥ WCAG AA.
- Respect `prefers-reduced-motion`.

### Performance budgets
- First interactive < 1.5 s on a 4× CPU‑slowdown profile for a 50‑page doc.
- Typing latency p95 < 16 ms on the same doc.
- Tree‑shaken `InlineShell` bundle (gzip) < 80 KB excluding plugins.

### Backwards compatibility
- Public exports already in `src/index.ts` must keep working through Phase 8. Mark new exports clearly. Breaking changes only at a major version (next major after Phase 9).

### Testing
- Every phase adds at least one unit test (`vitest`) and one e2e (`playwright`) when user‑visible.
- No phase decreases overall coverage.

### Telemetry / debug
- Reuse `installEditorDebugControl` (`src/utils/logger.ts`). New subsystems must log under a namespaced channel.

---

## 7. Out of Scope (explicitly)

- Real‑time backend service.
- Account / auth / sharing backend.
- Mobile native apps.
- Markdown source mode (post‑v1 idea).
- Plugin marketplace / sandboxing.

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Solid.js limits framework‑agnostic story | Med | High | Keep `core` framework‑free; adapters render Solid inside React/Vue trees via portals. |
| Splitting `editorCommands.ts` breaks imports | High | Med | Keep file as re‑export façade; deprecate, don't delete, for two minor versions. |
| Pagination algorithm regresses layout | Med | High | Feature‑flag (`features.pagination`); ship visual separators behind flag first. |
| Bundle size grows past budget after plugins | Med | Med | Enforce in CI: `bundlesize` check on each shell entry. |
| Locale fallout from i18n migration | Low | Med | Snapshot test of every UI string per locale. |

---

## 9. Progress Log

| Date | Phase | Agent | Commit | Notes |
|---|---|---|---|---|
| 2026‑05‑04 | 0 | human | — | Plan drafted. |
|  |  |  |  |  |

---

## 10. Open Questions

1. Do we accept a hard dependency on **Yjs** for Phase 12, or expose a generic CRDT adapter and leave Yjs as one impl?
2. Should `DocumentShell` render real OS print pages (CSS Paged Media + `@page`) or keep our virtual pagination for both screen and print?
3. Should the React adapter live in this repo or a separate `oasis-editor-react` package from day one?
4. i18n: bring `@formatjs/icu-messageformat-parser` for plurals, or stay with the tiny `t()` until needed?
5. Naming: keep `oasis-editor` as the npm name, or migrate to `@oasis/editor` scope when we split packages?

---

## 11. Glossary

- **Shell** — A pre‑composed UI layout (Document / Inline / Balloon / Headless) that wraps the same `Editor` core.
- **Plugin** — A self‑contained bundle of schema, commands, keymaps, and UI contributions.
- **Slot** — A named insertion point in a shell where plugins/hosts can mount UI.
- **Headless** — The editor running with no DOM UI, exposing only state + commands.

---

*End of plan. Agents: pick Phase 1 and start.*
