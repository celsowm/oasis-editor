# Anti-patterns & Gambiarras observed in the codebase

This document lists code-smells, anti-patterns and "gambiarras" (quick hacks) found
during recent work on the editor. Each entry has a short description, an example
location, why it is problematic, and a suggested direction.

> The intent is documentation, not blame — these are common during fast iteration
> and most are easy to fix.

---

## 1. `console.log` / `console.trace` left in production code paths

**Where**
- [src/app/OasisEditorController.ts](../src/app/OasisEditorController.ts) —
  `CONTROLLER: onTextInput`, `CONTROLLER: onEnter` + `console.trace("onEnter stack trace")`,
  `CONTROLLER: insertImage`, `CONTROLLER: onDrop`, `CONTROLLER: onImageDragStart`.
- [src/app/controllers/MouseController.ts](../src/app/controllers/MouseController.ts) —
  `MOUSE: handleMouseDown`, `MOUSE: Click on image related element...`.
- `src/core/runtime/DocumentRuntime.ts` — `RUNTIME: dispatch chamado com ...`,
  `RUNTIME: Estado atualizado, selection: ...`.

**Problem**
- Pollutes the browser console for every keystroke / mouse move.
- `console.trace` on every Enter is extreme overhead and noise.
- Mixed languages in messages ("RUNTIME: dispatch chamado com").

**Suggested fix**
Replace ad-hoc logs with a single debug logger that can be toggled by environment
flag (`if (DEBUG) ...`) or by a level-aware logger. Strip these logs (or gate them)
before shipping.

---

## 2. Global state stashed on `window`

**Where** — [src/app/OasisEditorView.ts](../src/app/OasisEditorView.ts) and
[src/app/OasisEditorController.ts](../src/app/OasisEditorController.ts):

```ts
(window as any)._oasisDragging = true;
(window as any)._oasisLastDragOverTime = now;
(window as any)._oasisLastDropTime = Date.now();
```

**Problem**
- Untyped global state, invisible to consumers of the library.
- Two callers (`onDragOver` in the controller and the drop listener in the view)
  cooperate via the same magic key — fragile coupling.
- Side-effect on `window` is a leak when the editor is embedded multiple times.

**Suggested fix**
Encapsulate this state in a dedicated `DragState` class (or per-instance field on
the view/controller). Throttle via a real utility, not a hand-rolled timestamp on
`window`.

---

## 3. Hand-rolled throttle with magic number on `window`

**Where** — [OasisEditorController.ts onDragOver](../src/app/OasisEditorController.ts):

```ts
const now = Date.now();
if (now - ((window as any)._oasisLastDragOverTime || 0) < 50) return;
(window as any)._oasisLastDragOverTime = now;
```

**Problem**
- Magic number `50`.
- Throttle state on a global.
- Even with the throttle, `dragover` fires a `SET_SELECTION` for every cursor
  movement — 16 SET_SELECTION dispatches were seen in a single short drag in the
  reported logs.

**Suggested fix**
Use a real throttle/`requestAnimationFrame` debounce, encapsulated. Or change the
strategy entirely: render a *visual* drop indicator (like
[TableDragController](../src/app/controllers/TableDragController.ts) does) instead
of mutating editor selection on every dragover frame.

---

## 4. Hardcoded `isBefore: true` on image drop (the bug we just fixed)

**Where** — previously in
[OasisEditorController.ts onDrop](../src/app/OasisEditorController.ts):

```ts
this.runtime.dispatch(Operations.moveBlock(this.draggingBlockId, pos.blockId, true));
```

**Problem**
The image *always* landed before the target block, regardless of whether the
user dropped above or below the midpoint. Worse, `pos.blockId` came from the
text-cursor calculator, so the "target" was the closest text block to the
cursor, not the block under the pointer.

**Suggested fix (applied)**
Use a DOM hit-test to find the actual `.oasis-fragment` under the pointer, and
compute `isBefore` from `event.clientY` vs the fragment's vertical midpoint —
the same pattern that
[TableDragController](../src/app/controllers/TableDragController.ts) already
uses. Duplicated logic between table and image drops should now be extracted
into a shared service.

---

## 5. Generic `transformContainerDeep*` walkers that lose all type safety

**Where** — [src/core/runtime/handlers/moveHandlers.ts](../src/core/runtime/handlers/moveHandlers.ts):

```ts
function transformContainerDeepForStrip(
  container: any,
  blockId: string,
): { block: any; stripped: BlockNode | null } {
  ...
  for (const key in result) {
    const value = result[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && "kind" in value[0] && "id" in value[0]) {
        ...
```

**Problem**
- Pure `any` — defeats the type system.
- Heuristically detects "block arrays" by sniffing `kind` and `id` on the first
  element — adding a new `kind` of array elsewhere in the document tree could
  silently match and corrupt the document.
- Two near-identical functions (`...ForStrip` and `...ForInsert`) duplicated.

**Suggested fix**
Add an explicit traversal API on the document model (e.g. `walkBlocks`,
`replaceBlock`) that knows the schema (sections, table rows/cells, footnotes,
etc.) and is typed.

---

## 6. Type assertions used to silence the compiler

**Where** — many places, e.g.
- `e as any` in
  [OasisEditorController.ts onDragOver / onDrop](../src/app/OasisEditorController.ts).
- `e as MouseEvent`, `e as DragEvent` in
  [OasisEditorView.ts](../src/app/OasisEditorView.ts).

**Problem**
Hides genuine type mismatches and disables IDE help. `e as any` is particularly
bad — it actively erases information.

**Suggested fix**
Type the event-binding interface so callbacks declare the actual event type
they expect. Drop the `as any`.

---

## 7. Pre-existing TypeScript errors that are ignored

`npx tsc --noEmit` reports ~25+ errors that are not new but are also not fixed:

- `src/app/bootstrap/createOasisEditorApp.tsx(82,5)`: `'shell' is possibly 'null'`.
- `src/app/commands/AnnotationCommands.ts(36,55)`: bad string→union assignment.
- `src/app/commands/FormattingCommands.ts(30,41)` and `(36,41)`:
  `Operations.undo` / `Operations.redo` referenced but don't exist on the
  `Operations` factory.
- A long list of stale references in `src/app/OasisEditorView.ts`
  (`onInsertRowAbove`, `onInsertColumnLeft`, `onMoveStart`, `onTableMoveEnd`, …)
  that don't exist on the current `ViewEventBindings`.
- `src/core/operations/OperationFactory.ts(43,16)`: `null` not assignable to
  `EditorSelection`.

**Problem**
- Build is permanently in a "broken" state from a strict-types perspective.
- Real bugs (missing handlers, wrong types) are camouflaged in the noise.
- Anyone running `tsc` can no longer use it as a quality gate.

**Suggested fix**
Triage and fix or `// @ts-expect-error <reason>` each one individually so new
errors stand out.

---

## 8. Two `MOUSE: handleMouseDown` log lines for a single click

In every captured log we see `handleMouseDown` fire twice in a row before any
selection actually moves:

```
MouseController.ts:26 MOUSE: handleMouseDown mousedown
MouseController.ts:26 MOUSE: handleMouseDown mousedown
```

**Problem**
Suggests `mousedown` is being bound twice — likely once from the view's
`addEventListener` and once from a re-bind on `refresh()` or HMR. Each click
runs the cursor-position calculation twice.

**Suggested fix**
Audit `view.bind` to make sure handlers are attached once per editor instance,
and ensure `refresh()` does not re-attach DOM listeners.

---

## 9. `setTimeout(..., 0)` for focus management

**Where** — [OasisEditorView.ts](../src/app/OasisEditorView.ts):

```ts
setTimeout(() => this.elements.hiddenInput.focus(), 0);
```

**Problem**
Classic "I don't know why focus doesn't stick, so I defer it" workaround.
Often a sign the focus is being stolen by a render that should be batched
differently.

**Suggested fix**
Find the actual cause (likely a re-render that blurs the input). If a defer is
truly needed, prefer `queueMicrotask` or `requestAnimationFrame` and document
why.

---

## 10. `dragleave` "we left the window" hack

**Where** — [OasisEditorView.ts](../src/app/OasisEditorView.ts):

```ts
window.addEventListener("dragleave", (e) => {
  // Only unset if we actually leave the window
  if (e.relatedTarget === null) {
    (window as any)._oasisDragging = false;
  }
});
```

**Problem**
Relies on the inconsistent `relatedTarget === null` heuristic, which is
unreliable across browsers and produces false positives when leaving an iframe
or shadow root.

**Suggested fix**
Track a counter (`enter` increments, `leave` decrements) — when it returns to
zero, the cursor is truly outside.

---

## 11. View directly imports React/TSX components from a "library" file

**Where** — [OasisEditorView.ts](../src/app/OasisEditorView.ts) imports
`ColorPickerListener`, `TablePickerListener` from `.tsx` modules, but those
exports no longer exist (causing the TS errors in #7). The view is also
issuing custom `image-select` DOM events handled at the same level.

**Problem**
- Mix of typed event bindings (`ViewEventBindings`) and stringly-typed
  `CustomEvent` channels in the same surface.
- Tight coupling between presentation (`.tsx`) and the imperative view layer.

**Suggested fix**
Pick one: either go fully through `ViewEventBindings`, or fully through a
typed event bus. Don't mix.

---

## 12. Workspace pollution at the repo root

The repository root contains files that look like one-off debug artifacts:

- `debug-dropdown.ts`
- `dropdown-debug.png`
- `e2e-debug-final.png`
- `screenshot.png`, `screenshot2.png`, `screenshot-issue.png`
- `vite.err`, `vite.log`
- `dist/` and `dist-app/` checked into the repo

**Problem**
- Hard to tell what's actually source.
- Build outputs (`dist/`) committed alongside sources causes stale-build
  confusion (the browser was loading an old `oasis-editor.js` while the user
  was editing `src/`).
- Logs and screenshots have no place in version control.

**Suggested fix**
Move debugging artifacts to a `tmp/` (or `scratch/`) folder that is
`.gitignore`d. Stop committing `dist/` — publish from CI. Add a pre-commit
check that fails on `*.log`, `*.err`, etc.

---

## 13. Multiple `dispatch` per logical user action

A single drag produces dozens of `SET_SELECTION` operations (one per dragover
frame), and clicking once shows two `mousedown` dispatches plus a
`SET_SELECTION`. Every dispatch:

- runs the full reducer chain,
- bumps `document.revision`,
- triggers a re-render path.

**Problem**
Performance scales linearly with mouse-movement frequency. The undo/redo
history can also pollute if any of these are not filtered.

**Suggested fix**
- Coalesce purely-visual selection updates (e.g. drag-over caret preview) into
  a non-undoable, non-revisioned channel separate from the document mutation
  path.
- Or skip the dispatch entirely and just paint a drop indicator (see #3).

---

## 14. Image-drop selection set as a side-effect of "previewing"

In `onDragOver` we mutate the document's selection to indicate where the drop
*would* land. This means **moving the mouse over the page during a file drag
silently changes the user's caret**, even if they cancel the drag.

**Problem**
A drag that's cancelled (Escape, drag back to file explorer) leaves the caret
in a place the user never clicked.

**Suggested fix**
Use a transient "drop-preview" indicator (DOM overlay) instead of moving the
real selection. Restore the original selection on `dragend`/`dragleave` if the
drop is aborted.

---

## 15. `Operations.undo` / `Operations.redo` referenced but missing

**Where** — [src/app/commands/FormattingCommands.ts](../src/app/commands/FormattingCommands.ts):

```ts
this.runtime.dispatch(Operations.undo());   // does not exist
this.runtime.dispatch(Operations.redo());   // does not exist
```

The runtime *does* have `runtime.undo()` / `runtime.redo()` (used elsewhere in
the controller), but the command bus calls a non-existent factory function.
This is a real, currently-broken code path masked by the wider TS-error noise.

**Suggested fix**
Either add `Operations.undo`/`redo` factories or call `runtime.undo()`/`redo()`
directly from the command handlers.

---

## 16. Magic strings for command IDs and ad-hoc field instructions

**Where** — [OasisEditorController.ts](../src/app/OasisEditorController.ts):

```ts
this.commandBus.execute("field", "page", "PAGE \\* MERGEFORMAT");
this.commandBus.execute("field", "date", "DATE \\@ \"dd/MM/yyyy\"");
```

**Problem**
- OOXML field instruction strings hard-coded inline at the controller layer.
- Command ids are loose strings — typo will silently no-op.

**Suggested fix**
Centralize field templates in a constants module (or in the field handler).
Use a typed enum or branded string type for command ids.

---

## 17. `runtime.getState()` called from inside an op factory call

**Where** — [OasisEditorController.ts toggleSuperscript / toggleSubscript](../src/app/OasisEditorController.ts):

```ts
const state = this.runtime.getState();
const current = state.pendingMarks?.vertAlign;
const next = current === "superscript" ? undefined : "superscript";
this.runtime.dispatch(Operations.setMark("vertAlign", next));
```

**Problem**
The "toggle" semantics live in the controller, not in a reducer/operation.
Two callers wanting to toggle vertical alignment must reimplement this.
Also, reading state and then dispatching is a classic race in any future
async runtime.

**Suggested fix**
Add a `toggleMark(name, value)` operation that does the read+write atomically
in the reducer.

---

## Summary

The single biggest theme is **debug-time conveniences leaking into the
production code path** — console logs, window globals, magic timeouts, type
assertions, hand-rolled walkers. The second biggest theme is **two parallel
implementations of the same idea** — table-drop vs image-drop, command-bus
vs. direct `runtime.dispatch`, typed event bindings vs. CustomEvents.

Tightening these would dramatically reduce the surface area where bugs like
the "image drops in the wrong place" one can hide.
