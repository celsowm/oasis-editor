# Strong Types & Generics Plan — oasis-editor

## Overview

Add strong TypeScript types and generics across the entire oasis-editor codebase. Currently ~22 of 37 `.ts` files have `// @ts-nocheck` and use JSDoc typedefs or untyped parameters. The goal is to:

- Remove all `@ts-nocheck`
- Convert JSDoc `@typedef` to proper TS `interface`/`type`
- Type every function parameter and return type
- Type all class members
- Introduce generics where they add value (Operations, Runtime listeners, etc.)

## Dependency Graph

```
Phase 1 (leaf types)
├──► Phase 2 (operations)──────────────────┐
├──► Phase 3 (document factories & state)──┼──► Phase 4 (runtime & reducer)──┐
├──► Phase 5 (composition & pagination)────┼──► Phase 7 (UI layer)───────────┼──► Phase 8 (app layer)──► Phase 9 (verify)
└──► Phase 6 (bridge layer)────────────────┘                                 │
                                                                             │
                                           Phase 4 ──────────────────────────┘
```

Phases 2, 3, 5, 6 can run **in parallel** after Phase 1.

---

## Phase 1 — Convert JSDoc typedefs to TS interfaces (leaf types)

**Depends on:** nothing  
**Files:**

- `src/core/layout/LayoutFragment.ts` — convert `Rect`, `LineInfo`, `LayoutFragment` typedefs to interfaces
- `src/core/layout/LayoutTypes.ts` — convert `PageLayout` and `LayoutState` typedefs to interfaces (imports from LayoutFragment)
- `src/core/selection/SelectionTypes.ts` — convert `LogicalPosition`, `LogicalRange`, `EditorSelection` typedefs to interfaces
- `src/core/pages/PageTemplateTypes.ts` — convert `PageSize`, `HeaderFooterTemplate`, `PageTemplate` typedefs to interfaces
- `src/bridge/measurement/TextMeasurementBridge.ts` — convert `MeasureTextInput` and `MeasureTextResult` typedefs to interfaces; define a `TextMeasurer` interface with `measureText(input: MeasureTextInput): MeasureTextResult`
- `src/core/document/InlineTypes.ts` — convert `InlineNode` typedef to interface (or remove file if redundant with `BlockTypes.ts` `TextRun`)

**Actions per file:** remove `// @ts-nocheck`, replace `@typedef` JSDoc with `export interface`, export all types.

---

## Phase 2 — Type the Operations system with discriminated unions & generics

**Depends on:** Phase 1  
**Files:**

### `src/core/operations/OperationTypes.ts`

- Remove `@ts-nocheck`
- Replace `OPERATION_TYPES` const object with a string literal union or `const enum OperationType`
- Define a generic base type:
  ```ts
  interface Operation<T extends OperationType, P> {
    type: T;
    payload: P;
  }
  ```
- Define each operation payload interface:
  - `AppendParagraphPayload { text: string }`
  - `SetSectionTemplatePayload { sectionId: string; templateId: string }`
  - `SetSelectionPayload { selection: EditorSelection }`
  - `InsertTextPayload { text: string }`
  - `DeleteTextPayload {}`
  - `InsertParagraphPayload {}`
  - `MoveSelectionPayload { key: string }`
  - `ToggleMarkPayload { mark: keyof MarkSet }`
- Create discriminated union:
  ```ts
  type EditorOperation =
    | Operation<OperationType.APPEND_PARAGRAPH, AppendParagraphPayload>
    | Operation<OperationType.SET_SECTION_TEMPLATE, SetSectionTemplatePayload>
    | ...
  ```

### `src/core/operations/OperationFactory.ts`

- Remove `@ts-nocheck`
- Type every factory function parameter and return type:
  ```ts
  appendParagraph(text: string): AppendParagraphOp
  setSectionTemplate(sectionId: string, templateId: string): SetSectionTemplateOp
  insertText(text: string): InsertTextOp
  // etc.
  ```

**Benefits:** the reducer `switch` gets exhaustiveness checking, and every `operation.payload` access is narrowed by the discriminated `type` field.

---

## Phase 3 — Type core document factories and state

**Depends on:** Phase 1  
**Files:**

### `src/core/document/DocumentFactory.ts`

- Remove `@ts-nocheck`
- Type all factory functions with explicit return types:
  ```ts
  createTextRun(text: string, marks?: Partial<MarkSet>): TextRun
  createParagraph(text: string, align?: ParagraphNode['align']): ParagraphNode
  createHeading(text: string, level?: HeadingNode['level'], align?: HeadingNode['align']): HeadingNode
  createSection(children?: BlockNode[]): SectionNode
  createDocument(): DocumentModel
  ```

### New: `EditorState` interface

Define in a new or existing type file:
```ts
export interface EditorState {
  document: DocumentModel;
  selection: EditorSelection | null;
}
```
This is used by `DocumentRuntime` and `DocumentReducer`.

### `src/core/selection/SelectionService.ts`

- Remove `@ts-nocheck`
- Type params and returns:
  ```ts
  compareLogicalPositions(a: LogicalPosition, b: LogicalPosition): number
  normalizeSelection(selection: EditorSelection | null): LogicalRange | null
  hasSelection(selection: EditorSelection | null): boolean
  ```

---

## Phase 4 — Type the Runtime and Reducer

**Depends on:** Phase 2, Phase 3  
**Files:**

### `src/core/runtime/DocumentRuntime.ts`

- Remove `@ts-nocheck`
- Add typed class members:
  ```ts
  private state: EditorState;
  private history: EditorState[];
  private future: EditorState[];
  private listeners: Set<(state: EditorState) => void>;
  ```
- Type methods:
  ```ts
  getState(): EditorState
  subscribe(listener: (state: EditorState) => void): () => void
  dispatch(operation: EditorOperation): void
  undo(): void
  redo(): void
  exportJson(): string
  private emit(): void
  ```

### `src/core/runtime/DocumentReducer.ts`

- Remove `@ts-nocheck`
- Type signature:
  ```ts
  reduceDocumentState(state: EditorState, operation: EditorOperation): EditorState
  ```
- The switch-case branches will auto-narrow `operation.payload` thanks to the discriminated union from Phase 2
- Type all intermediate variables (block, run, section indexes, etc.)

---

## Phase 5 — Type composition, pagination, and page templates

**Depends on:** Phase 1  
**Files:**

### `src/core/pages/PageTemplateFactory.ts`

- Remove `@ts-nocheck`
- Type constants: `A4_DEFAULT_TEMPLATE: PageTemplate`, `LETTER_TEMPLATE: PageTemplate`
- Type `PAGE_TEMPLATES` as `Record<string, PageTemplate>`

### `src/core/composition/LineBreaker.ts`

- Remove `@ts-nocheck`
- Define:
  ```ts
  interface LineBrokenResult { text: string; width: number }
  ```
- Type function:
  ```ts
  breakTextIntoLines(
    runs: TextRun[],
    maxWidth: number,
    measure: TextMeasurer,
    defaultFontFamily: string,
    defaultFontSize: number,
    isHeading: boolean,
  ): LineBrokenResult[]
  ```

### `src/core/composition/ParagraphComposer.ts`

- Remove `@ts-nocheck`
- Define:
  ```ts
  interface BlockTypography { fontFamily: string; fontSize: number; fontWeight: number }
  interface ComposedParagraph {
    blockId: string;
    kind: string;
    text: string;
    runs: TextRun[];
    typography: BlockTypography;
    totalHeight: number;
    lines: LineInfo[];
  }
  ```
- Type functions:
  ```ts
  getBlockTypography(block: BlockNode): BlockTypography
  composeParagraph(block: BlockNode, maxWidth: number, measure: TextMeasurer): ComposedParagraph
  ```

### `src/core/pagination/PaginationEngine.ts`

- Remove `@ts-nocheck`
- Type function:
  ```ts
  paginateDocument(documentModel: DocumentModel, measure: TextMeasurer): LayoutState
  ```
- Type all intermediate variables (page, fragment, etc.)

---

## Phase 6 — Type bridge layer (measurement)

**Depends on:** Phase 1  
**Files:**

### `src/bridge/measurement/BrowserTextMeasurer.ts`

- Remove `@ts-nocheck`
- Implement the `TextMeasurer` interface:
  ```ts
  export class BrowserTextMeasurer implements TextMeasurer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    measureText(input: MeasureTextInput): MeasureTextResult { ... }
  }
  ```

### `src/engine/adapters/RustCompositionAdapter.ts`

- Remove `@ts-nocheck`
- Type the stub methods with proper signatures using `EditorState`, `LayoutState`, and `EditorOperation` types
- Consider defining a `CompositionAdapter` interface:
  ```ts
  interface CompositionAdapter {
    getEditorState(): EditorState;
    getLayoutState(): LayoutState;
    applyOperation(operation: EditorOperation): void;
  }
  ```

---

## Phase 7 — Type UI layer (overlays, page rendering)

**Depends on:** Phase 5, Phase 6  
**Files:**

### `src/ui/selection/CaretOverlay.ts`

- Remove `@ts-nocheck`
- Type class members: `container: HTMLElement`, `mapper: SelectionMapper`
- Type: `render(position: LogicalPosition | null): void`

### `src/ui/selection/SelectionOverlay.ts`

- Remove `@ts-nocheck`
- Type class members: `container: HTMLElement`, `mapper: SelectionMapper`
- Type: `render(range: LogicalRange | null): void`

### `src/ui/pages/PageLayer.ts`

- Remove `@ts-nocheck`
- Type class member: `container: HTMLElement`
- Type: `render(layout: LayoutState): void`

### `src/ui/pages/PageViewport.ts`

- Remove `@ts-nocheck`
- Type class members:
  ```ts
  private root: HTMLElement;
  private pageLayer: PageLayer;
  private measurer: TextMeasurer;
  private caretOverlays: Map<string, CaretOverlay>;
  private selectionOverlays: Map<string, SelectionOverlay>;
  private mapper: SelectionMapper | null;
  ```
- Type methods:
  ```ts
  render(layout: LayoutState, selection: EditorSelection | null): void
  normalizeSelection(selection: EditorSelection): LogicalRange
  getOrCreateCaretOverlay(pageId: string): CaretOverlay
  getOrCreateSelectionOverlay(pageId: string): SelectionOverlay
  ```

---

## Phase 8 — Type app layer (services, presenter, DOM, view, controller)

**Depends on:** Phase 4, Phase 5, Phase 7  
**Files:**

### `src/app/services/PositionCalculator.ts`

- Remove `@ts-nocheck`
- Type class member: `layout: LayoutState`
- Type methods with `LogicalPosition`, `LayoutFragment`, `TextMeasurer`, return `number | null`

### `src/app/services/SelectionMapper.ts`

- Remove `@ts-nocheck`
- Define:
  ```ts
  interface CaretRect { x: number; y: number; height: number; pageId: string }
  interface SelectionRect { x: number; y: number; width: number; height: number; pageId: string }
  ```
- Type methods:
  ```ts
  getCaretRect(position: LogicalPosition): CaretRect | null
  getSelectionRects(range: LogicalRange): SelectionRect[]
  ```

### `src/app/services/DocumentLayoutService.ts`

- Remove `@ts-nocheck`
- Type class member: `textMeasurementBridge: TextMeasurer`
- Type: `compose(documentModel: DocumentModel): LayoutState`

### `src/app/dom/OasisEditorDom.ts`

- Remove `@ts-nocheck`
- Type class member: `document: Document`
- Type all methods returning `HTMLElement`
- Type: `requireElement(id: string): HTMLElement`

### `src/app/presenters/OasisEditorPresenter.ts`

- Remove `@ts-nocheck`
- Define:
  ```ts
  interface TemplateOption { value: string; label: string }
  interface SelectionState { bold: boolean; italic: boolean; underline: boolean }
  interface EditorViewModel {
    templateId: string;
    metrics: { revision: string; pages: string; sections: string; template: string; backend: string };
    status: string;
    selectionState: SelectionState;
    selection: EditorSelection | null;
    layout: LayoutState;
  }
  ```
- Type class member: `pageTemplates: PageTemplate[]`

### `src/app/OasisEditorView.ts`

- Remove `@ts-nocheck`
- Define:
  ```ts
  interface ViewElements {
    root: HTMLElement;
    pagesContainer: HTMLElement;
    templateSelect: HTMLSelectElement;
    boldButton: HTMLElement;
    italicButton: HTMLElement;
    underlineButton: HTMLElement;
    undoButton: HTMLElement;
    redoButton: HTMLElement;
    exportButton: HTMLElement;
    status: HTMLElement;
    metrics: HTMLElement;
    hiddenInput: HTMLInputElement;
  }
  interface ViewEventBindings {
    onBold: () => void;
    onItalic: () => void;
    onUnderline: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onExport: () => void;
    onTemplateChange: (templateId: string) => void;
    onTextInput: (text: string) => void;
    onDelete: () => void;
    onEnter: (isShift: boolean) => void;
    onArrowKey: (key: string) => void;
    onMouseDown: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseUp: (e: MouseEvent) => void;
    onDblClick?: (e: MouseEvent) => void;
    onTripleClick?: (e: MouseEvent) => void;
  }
  ```

### `src/app/OasisEditorController.ts`

- Remove `@ts-nocheck`
- Define:
  ```ts
  interface ControllerDeps {
    runtime: DocumentRuntime;
    layoutService: DocumentLayoutService;
    presenter: OasisEditorPresenter;
    view: OasisEditorView;
    measurer: TextMeasurer;
  }
  ```
- Type all class members:
  ```ts
  private runtime: DocumentRuntime;
  private layoutService: DocumentLayoutService;
  private presenter: OasisEditorPresenter;
  private view: OasisEditorView;
  private measurer: TextMeasurer;
  private latestLayout: LayoutState | null;
  private isDragging: boolean;
  private dragAnchor: LogicalPosition | null;
  ```
- Type all methods including `calculatePositionFromEvent(event: MouseEvent): LogicalPosition | null`

### `src/app/bootstrap/createOasisEditorApp.ts`

- Remove `@ts-nocheck`
- Type return: `createOasisEditorApp(): OasisEditorController`

---

## Phase 9 — Verify: build, lint, and test with strict mode

**Depends on:** Phase 8  
**Steps:**

1. `grep -r "@ts-nocheck" src/` — should return zero results
2. `npx tsc --noEmit` — should pass with zero errors
3. `npm run lint` — fix any lint issues caused by the type changes
4. `npm test` — all existing tests must still pass
5. Verify `strict: true` in `tsconfig.json` covers `noImplicitAny` and `strictNullChecks` (it does)
6. `npm run build:lib` — produces valid output with `.d.ts` declarations

---

## Summary Table

| Phase | Scope | Files | Key Changes |
|-------|-------|-------|-------------|
| **1** | Leaf type files | 6 | JSDoc `@typedef` → TS `interface`; `TextMeasurer` interface |
| **2** | Operations | 2 | Discriminated union `EditorOperation` with generic `Operation<T,P>` |
| **3** | Document & State | 3 | Typed factories; `EditorState` interface; typed `SelectionService` |
| **4** | Runtime & Reducer | 2 | Typed class members; `dispatch(op: EditorOperation)`; exhaustiveness |
| **5** | Composition & Pagination | 4 | `ComposedParagraph`, `LineBrokenResult`, typed pipeline |
| **6** | Bridge | 2 | `BrowserTextMeasurer implements TextMeasurer`; typed Rust stub |
| **7** | UI | 4 | Typed overlays, `PageLayer`, `PageViewport` with `Map<>` generics |
| **8** | App | 7 | Controller, View, Presenter, DOM, Services; `ControllerDeps` / `ViewEventBindings` |
| **9** | Verify | — | Zero `@ts-nocheck`, `tsc`, lint, tests, build |
