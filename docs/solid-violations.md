# SOLID Violations — Oasis Editor

> Varredura severa em **2026-04-27**. Cada item é referenciado com arquivo, linha e
> evidência verificada no código atual. Princípios são checados na ordem clássica:
> **S**RP, **O**CP, **L**SP, **I**SP, **D**IP.
>
> Severidade: 🔴 alta · 🟠 média · 🟡 baixa.

---

## Sumário

| # | Princípio | Local principal | Severidade |
|---|---|---|---|
| 1 | SRP | [OasisEditorController](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts) (654 linhas) | 🔴 |
| 2 | SRP | [OasisEditorView](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts) (690 linhas) | 🔴 |
| 3 | SRP | [DocumentRuntime](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/DocumentRuntime.ts) acumula state + history + listeners + serialização + layout + log | 🟠 |
| 4 | SRP | [Operations](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/operations/OperationFactory.ts) — “god object” com 60+ factories | 🟠 |
| 5 | SRP | [BlockLayoutEngine.measureTextBlocks](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/pagination/BlockLayoutEngine.ts#L13-L70) mede 4 tipos diferentes de bloco | 🟠 |
| 6 | SRP | [TextFragment](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L18-L148) decide marcadores, estilos, revisões, fields, links, footnotes | 🟠 |
| 7 | OCP | [handleTableAction](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L566-L617) — switch de 11 cases | 🔴 |
| 8 | OCP | Adicionar novo `OperationType` exige tocar 4–5 arquivos | 🔴 |
| 9 | OCP | Adicionar novo `block.kind` exige editar dezenas de switches espalhados | 🔴 |
| 10 | OCP | Atalhos de teclado em cascata `if/else if` em [OasisEditorView.bind](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L164-L223) | 🟠 |
| 11 | LSP | [`EditorCommand.execute(...args: any[])`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/commands/EditorCommand.ts#L11-L13) | 🔴 |
| 12 | LSP | [`OperationHandler<T = any>`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/OperationHandlers.ts#L11-L14) + handlers com `op: any` | 🔴 |
| 13 | LSP | `(run as any).field` / `(run as any).footnoteId` em [FragmentRenderer](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L107-L141) — subtipos com campos ocultos | 🟠 |
| 14 | LSP | [`transformContainerDeepForMerge(container: any)`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/document/DocumentMutationUtils.ts#L206-L235) reflete sobre forma desconhecida | 🟠 |
| 15 | ISP | [`ViewEventBindings`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/events/ViewEventBindings.ts) — interface gorda com ~40 callbacks | 🔴 |
| 16 | ISP | [`ControllerDeps`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L32-L44) com 11 dependências passadas em massa | 🟠 |
| 17 | ISP | [`IFontManager`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/typography/FontManager.ts#L8-L13) mistura preocupações de UI e layout | 🟡 |
| 18 | DIP | Controllers e Commands dependem da **classe concreta** `DocumentRuntime` | 🔴 |
| 19 | DIP | [`OasisEditorController`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L77-L133) instancia 8 sub-controllers via `new` | 🟠 |
| 20 | DIP | [`Logger`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/utils/Logger.ts) é singleton estático global, importado em 30+ módulos | 🟠 |
| 21 | DIP | UI importa diretamente de `core/document`, `core/composition`, `core/utils` | 🟡 |
| 22 | DIP | `setStore("events", events)` global em [OasisEditorView](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L146-L151) — store SolidJS concreto | 🟡 |

---

## SRP — Single Responsibility Principle

### 1. 🔴 `OasisEditorController` faz tudo

[src/app/OasisEditorController.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts) (654 linhas) — apesar dos sub-controllers extraídos, ainda concentra:

- Bootstrap e wiring de **8 sub-controllers** (`FormatPainterController`, `MouseController`, `ZoneClickController`, `WordSelectionController`, `ImportExportController`, `TableDragController`, `CursorPositionCalculator`, `DropTargetService`).
- Registro de comandos (`registerCommands` linhas 137–159).
- Bind de **40+ eventos da view** (linhas 161–404).
- Operações imperativas que duplicam o `CommandBus`: `setColor`, `setFontFamily`, `undo`, `redo`, `insertText`, `deleteText`, `insertParagraph`, `moveCaret`, `setTemplate`, `setAlign`, `setStyle`, `toggleBullets`, `toggleNumberedList`, `decreaseIndent`, `increaseIndent`, `insertImage`, `resizeImage`, `selectImage`, `updateImageAlt`, `insertTable`, `insertField`, `insertEquation`, `insertBookmark`, `insertFootnote`, `enterFootnote`, `insertEndnote`, `insertComment`, `toggleTrackChanges` (linhas 407–565).
- Lógica de tabela (`handleTableAction`, linhas 566–617).
- Composição de layout (`refresh`, linhas 645–653).
- Gestão de listeners de janela (linhas 67, 629–632, 637–643).

Há **dois caminhos paralelos** para a mesma operação: `commandBus.execute("bold")` **e** `controller.bold()` que existem lado a lado. A própria controller tanto usa `commandBus.execute` quanto chama `runtime.dispatch` direto (linhas 169, 172–176, 184, 206…), revelando que o *Command Pattern* foi parcialmente aplicado.

**Sugestão:** mover métodos imperativos para comandos do `CommandBus`; transformar `OasisEditorController` em pura `EventOrchestrator` (apenas binding de eventos da view → `commandBus.execute`).

---

### 2. 🔴 `OasisEditorView` mistura DOM, eventos, overlays e estado

[src/app/OasisEditorView.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts) (690 linhas) responde por:

- Bind de teclado (linhas 164–223) — 25+ ramos `if/else if`.
- Detecção de single/double/triple click (linhas 226–280) — máquina de estado embutida com `lastMouseDownTime` e `clickCount`.
- Drop indicator (linhas 109–141).
- Gestão do overlay de imagem (`updateImageOverlay`, linhas 502–564).
- Renderização do *alt input* da imagem (linhas 566–613) — calcula posição absoluta via inline styles.
- Conversão de `File` → `dataURL` (`handleImageFile`, linhas 615–632).
- Ciclo de vida (`destroy`, RAF tracking, listener tracking).
- Gestão de toolbar de tabela e move-handle.

Cada responsabilidade caberia numa classe própria. A view atual é simultaneamente **renderer**, **event router**, **overlay manager** e **file reader**.

---

### 3. 🟠 `DocumentRuntime` mistura state, history, layout, serialização e log

[src/core/runtime/DocumentRuntime.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/DocumentRuntime.ts):

- Mantém `state`, `history`, `future`, `listeners`. (4 estados → 4 classes em potencial.)
- Guarda referência para `latestLayout` (acoplamento com camada de layout, linhas 56–62).
- Implementa `exportJson` (linhas 106–117) — serialização não pertence ao runtime.
- Faz logging direto via `Logger.debug` (linhas 78, 86) — preocupação de observabilidade entrelaçada com o despacho.
- `dispatch` mistura `history.push`, `reduce`, `setState`, `emit` num único método.

**Sugestão:** quebrar em `StateContainer`, `HistoryStack`, `Subject`/`EventBus`, `DocumentSerializer`.

---

### 4. 🟠 `Operations` é um *god object* de 60+ factories

[src/core/operations/OperationFactory.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/operations/OperationFactory.ts) — um único objeto literal exportado contém todas as 50+ factories de operação (texto, marcas, imagem, tabela, lista, indent, footnote, comment, equation, bookmark, field, page break, track changes…). Toda nova operação modifica este arquivo.

Além disso, **mistura geração de IDs** (`genId("block")`, `genId("run")`, etc.) com construção da operação. Os handlers ficam dependentes de IDs pré-alocados pelas factories, o que é uma forma sutil de acoplamento temporal: o handler espera que `payload.newRunIds` exista com tamanho correto.

**Sugestão:** separar por domínio (`TextOperations`, `TableOperations`, `ListOperations`…) e injetar a estratégia de geração de IDs.

---

### 5. 🟠 `BlockLayoutEngine.measureTextBlocks` mistura tipos

[src/core/pagination/BlockLayoutEngine.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/pagination/BlockLayoutEngine.ts#L13-L70):

```ts
if (block.kind === "image")        { … }
else if (block.kind === "equation") { … }
else if (block.kind === "chart")    { … }
else if (block.kind === "paragraph" || "heading" || "list-item" || "ordered-list-item") { … }
```

A função “mede blocos” mas precisa conhecer **todos** os tipos de bloco. Cada novo tipo (e.g. `tableOfContents`) requer modificar a função (também viola OCP).

**Sugestão:** dispatch via `Strategy` por `block.kind` — já existe esboço em [`BlockLayoutStrategies.ts`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/pagination/BlockLayoutStrategies.ts), mas a engine principal **não usa**.

---

### 6. 🟠 `TextFragment` mistura múltiplas decisões visuais

[src/ui/pages/FragmentRenderer.tsx:18-148](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L18-L148) decide simultaneamente:

- Cálculo de `indent`, `displayRuns` (linhas 19–30).
- Renderização de bullets/numeração (linhas 50–69).
- Geração do estilo CSS de cada run (linhas 73–88).
- Tratamento de `revision` (linhas 90–105) — lê propriedade não declarada no tipo (`(run as any).revision`).
- Tratamento de `field` (linhas 107–114) — `(run as any).field`.
- Renderização de `link` (linhas 115–131).
- Renderização de `footnoteId` (linhas 132–141) — `(run as any).footnoteId`.

Cada `Match` deveria ser um sub-componente.

---

### Outros sintomas SRP menores

- `OasisEditorController.insertFootnote` (linhas 517–535) tanto despacha a operação quanto re-posiciona a seleção.
- `OasisEditorController.handleTableAction` cuida de roteamento + validação de seleção.
- `transformContainerDeepForMerge` em [DocumentMutationUtils.ts:206-235](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/document/DocumentMutationUtils.ts#L206-L235) faz reflexão sobre `for (const key in result)` e ainda decide se elementos são blocos por `"kind" in value[0] && "id" in value[0]` — duck typing dentro de utilitário “puro”.

---

## OCP — Open / Closed Principle

### 7. 🔴 `handleTableAction` — switch de 11 cases

[src/app/OasisEditorController.ts:566-617](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L566-L617):

```ts
switch (action) {
  case "insertRowAbove":      …
  case "insertRowBelow":      …
  case "insertColumnLeft":    …
  …
  case "toggleFirstColumn":   …
}
```

Adicionar uma nova ação de tabela exige modificar o controller. Todas as ações têm a mesma forma (`runtime.dispatch(Operations.tableX(...))`) — é o caso clássico para um *map* (`Record<string, (id, sel) => Operation>`).

---

### 8. 🔴 Adicionar um novo `OperationType` toca 4–5 arquivos

Para criar `INSERT_FOO` é preciso, *na ordem*:

1. Adicionar enum em [OperationTypes.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/operations/OperationTypes.ts).
2. Declarar `InsertFooPayload` e `InsertFooOp`.
3. Criar factory em [OperationFactory.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/operations/OperationFactory.ts).
4. Implementar handler com `op: any` (e.g. [annotationHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/annotationHandlers.ts)).
5. Registrar via `registerHandler(OperationType.INSERT_FOO, handler)` em algum `registerXHandlers()`.
6. Possivelmente também: factory de comando, registro no `CommandBus`, callback em `ViewEventBindings`, handler na view, método no controller.

A arquitetura é “quase” aberta para extensão (existe registry), mas **na prática** cada operação distribui código por toda a stack. O registry está sendo subutilizado.

---

### 9. 🔴 `block.kind` em switch espalhado por todo lugar

Cada novo tipo de bloco força mudanças nos seguintes pontos confirmados:

| Local | Linha |
|---|---|
| [BlockLayoutEngine.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/pagination/BlockLayoutEngine.ts#L24-L40) | 24, 28, 32, 37–40 |
| [DocumentMutationUtils.recalculateListSequences](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/document/DocumentMutationUtils.ts#L14-L49) | 14, 49 |
| [formatHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/formatHandlers.ts#L58-L68) | 58, 68 |
| [imageHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/imageHandlers.ts#L86) | 86 |
| [listHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/listHandlers.ts#L20-L238) | 20, 22, 36, 38, 238 |
| [markHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/markHandlers.ts#L182-L212) | 182, 204, 212 |
| [moveHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/moveHandlers.ts#L21-L61) | 21, 61 |
| [sharedHelpers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/sharedHelpers.ts#L11-L42) | 11, 33, 42 |
| [ParagraphComposer.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/composition/ParagraphComposer.ts#L33-L75) | 33, 55, 56, 75 |
| [FragmentRenderer.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx) | 20–24, 50, 64 |

Alguns blocos (`page-break`, `chart`, `math`/`equation`) são tratados em alguns lugares e ignorados em outros — sintoma direto da violação. **Não existe uma única função `BlockBehavior.lookup(kind)` para centralizar.**

**Sugestão:** trocar `if (block.kind === ...)` por *visitor* (`BlockVisitor`/`BlockBehavior`) com uma entrada por bloco. O arquivo [`BlockVisitor.ts`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/document/BlockVisitor.ts) já existe e é parcialmente usado para *transform*, mas não para *behavior*.

---

### 10. 🟠 Atalhos de teclado em cascata

[src/app/OasisEditorView.ts:164-223](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L164-L223) tem 18+ ramos `if (ke.key === ...)`. Adicionar um novo atalho (e.g. Ctrl+Shift+K) requer editar este bloco. Pediria uma tabela `KeyBinding[]` registrada via `bind`.

---

## LSP — Liskov Substitution Principle

### 11. 🔴 `EditorCommand.execute(...args: any[])`

[src/app/commands/EditorCommand.ts:11-13](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/commands/EditorCommand.ts#L11-L13):

```ts
export interface EditorCommand {
  execute(context: CommandContext, ...args: any[]): void;
}
```

Todos os comandos implementam a **mesma assinatura**, mas:

- `ToggleBoldCommand.execute(ctx)` — zero argumentos.
- `InsertTextCommand.execute(ctx, text: string)` — uma string.
- `SetAlignmentCommand.execute(ctx, align: "left"|"center"|"right"|"justify")`.
- `IndentCommand.execute(ctx, dir: "increase"|"decrease")`.
- `MoveCaretCommand.execute(ctx, key: string)`.

Qualquer cliente do `CommandBus` pode chamar `commandBus.execute("bold", 5)` ou `execute("indent", "🚀")` sem erro de tipos. **Subtipos não respeitam o contrato do supertipo** — clássico LSP.

---

### 12. 🔴 `OperationHandler<T extends EditorOperation = any>`

[src/core/runtime/OperationHandlers.ts:11-14](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/OperationHandlers.ts#L11-L14):

```ts
export type OperationHandler<T extends EditorOperation = any> = (
  state: EditorState, operation: T,
) => EditorState;
```

E confirmado em vários handlers (auditoria de 2026-04-27):

- [structureHandlers.ts:10](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/structureHandlers.ts#L10) — `handleInsertParagraph(state, op: any)`.
- [annotationHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/annotationHandlers.ts) — 6 handlers com `op: any`.
- [inlineHandlers.ts:11,32,178](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/inlineHandlers.ts#L11) — `handleSetSelection`, `handleInsertText`, `handleDeleteText` com `op: any`.

Conceitualmente o registry diz “qualquer handler é substituível”, mas cada handler **só funciona** com sua operação específica. O contrato não é honrado em runtime — se o registry mapear a chave errada, o `op.payload.text` virará `undefined`.

---

### 13. 🟠 `(run as any).field` / `(run as any).footnoteId`

[src/ui/pages/FragmentRenderer.tsx:107-141](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L107-L141):

```tsx
<Match when={(run as any).field}> … {(run as any).field.type} … </Match>
<Match when={(run as any).footnoteId}> … {(run as any).footnoteId} … </Match>
```

`TextRun` é o supertipo, mas “runs” especiais (campos, footnotes) carregam dados extras que **violam o contrato** declarado em [BlockTypes.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/document/BlockTypes.ts). O renderer precisa de `as any` para detectar discriminantes que deveriam ser parte do tipo.

**Sugestão:** transformar `TextRun` em união discriminada (`{ kind: "text" } | { kind: "field", field: FieldInfo } | { kind: "footnoteRef", footnoteId: string }`).

---

### 14. 🟠 `transformContainerDeepForMerge(container: any, ...)`

[src/core/document/DocumentMutationUtils.ts:206-235](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/document/DocumentMutationUtils.ts#L206-L235) — assina `any` e faz reflexão:

```ts
for (const key in result) {
  const value = result[key];
  if (Array.isArray(value)) {
    if (value.length > 0 && "kind" in value[0] && "id" in value[0]) { … }
  }
}
```

Qualquer subtipo de `container` é aceito (até `null`, `undefined`, `Date`). O contrato é nulo. Ao chamar com forma inesperada, o resultado é inconsistente em vez de erro de tipo.

---

## ISP — Interface Segregation Principle

### 15. 🔴 `ViewEventBindings` é uma interface gorda

[src/app/events/ViewEventBindings.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/events/ViewEventBindings.ts) força ~40 callbacks em um único objeto: bold, italic, underline, strike, super, sub, link, color, highlight, font, undo/redo, template, text, delete, enter, escape, arrows, mouse down/move/up, dblclick, tripleclick, align, style, lists, indent, image, import/export, page break, track changes, resize, drop, drag etc.

- Componentes que só precisam reagir a eventos de tabela (e.g. `TableFloatingToolbar`) implementam um subset (`TableToolbarEvents`) — isso é bom — mas o agregado `ViewEventBindings` continua exigindo que **toda** view implemente o conjunto inteiro.
- A controller registra todos com `view.bind({ … })` em **um único objeto literal de 200+ linhas** (linhas 163–404 de [OasisEditorController.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts)).

**Sugestão:** segmentar em `FormattingEvents`, `EditingEvents`, `ImageEvents`, `TableEvents`, `ImportExportEvents` — view recebe subset.

---

### 16. 🟠 `ControllerDeps` com 11 dependências

[src/app/OasisEditorController.ts:32-44](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L32-L44):

```ts
export interface ControllerDeps {
  runtime, layoutService, presenter, view, measurementService,
  importer, exporter, pdfExporter, domHitTester, fontManager, dragState,
}
```

Sub-controllers (que recebem subsets) não precisam de tudo isso, mas o objeto precisa ser construído todo de uma vez. Tipico “interface inflada”.

---

### 17. 🟡 `IFontManager` mistura UI e layout

[src/core/typography/FontManager.ts:8-13](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/typography/FontManager.ts#L8-L13):

```ts
export interface IFontManager {
  resolveFontFamily(req?): string;          // usado por composição
  getDefaultFont(blockKind, isHeading?): string;  // usado por composição
  getTypographyForBlock(blockKind): BlockTypography; // usado por layout
  getAvailableFonts(): string[];            // usado pela toolbar (UI)
}
```

`MenuBar`/`Toolbar` precisa apenas de `getAvailableFonts`; `BlockLayoutEngine` precisa de `getTypographyForBlock`. Quem usa um é forçado a depender de tudo.

**Sugestão:** dividir em `FontCatalog` (UI) + `BlockTypographyResolver` (layout).

---

### Outros sintomas ISP

- `DocumentExporter` exige `exportToBlob` *e* `exportToBuffer`; alguns consumidores usam só um (`ImportExportController.exportPdf`).
- `OasisEditorPresenter.present` retorna `EditorViewModel` único — qualquer mudança em qualquer parte do view-model invalida a memoização global.

---

## DIP — Dependency Inversion Principle

### 18. 🔴 Controllers e Commands dependem da classe concreta `DocumentRuntime`

Todos os controllers importam **a classe**, não uma interface. Confirmado em:

- [OasisEditorController.ts:3](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L3)
- [EditorCommand.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/commands/EditorCommand.ts#L1)
- [FormatPainterController.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/FormatPainterController.ts#L1)
- [ImportExportController.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/ImportExportController.ts#L1)
- [MouseController.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/MouseController.ts#L1)
- [TableDragController.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/TableDragController.ts#L1)
- [WordSelectionController.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/WordSelectionController.ts#L1)
- [ZoneClickController.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/ZoneClickController.ts#L1)

A camada `app/` (alto nível) depende de `core/runtime` (baixo nível) **sem abstração**. Há `IFontManager` para fontes, `DocumentImporter`/`DocumentExporter` para IO, mas *não* há `IDocumentRuntime`/`IDispatcher`/`IStateStore`. Testes ficam difíceis de isolar — toda execução exige uma instância real de `DocumentRuntime`.

---

### 19. 🟠 `OasisEditorController` instancia 8 sub-controllers via `new`

[OasisEditorController.ts:77-133](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L77-L133) usa `new` para criar:

- `DropTargetService`, `FormatPainterController`, `CursorPositionCalculator`, `MouseController`, `ZoneClickController`, `WordSelectionController`, `ImportExportController`, `TableDragController`, `CommandBus`.

Um “alto-nível” fabricando “baixo-níveis” concretos é DIP invertido. O ideal seria receber esses controllers já construídos via `ControllerDeps` (ou, melhor, via factories).

---

### 20. 🟠 `Logger` é singleton estático global

[src/core/utils/Logger.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/utils/Logger.ts) exporta um objeto literal congelado e:

- Lê `window.OASIS_DEBUG` (acoplamento direto com globais do browser).
- É importado por 30+ módulos (`grep -l "from .*utils/Logger" src` listaria DocumentRuntime, OasisEditorController, OasisEditorView, MouseController, controllers, view bindings, etc.).
- Não é injetável; testes não conseguem capturar logs sem monkey-patching de `console.warn`/`console.error`.

**Sugestão:** definir interface `ILogger` e injetar no construtor. Em produção, `BrowserConsoleLogger`. Em testes, `MemoryLogger`/`NoopLogger`.

---

### 21. 🟡 UI importa diretamente de `core/document`, `core/composition`, `core/utils`

Exemplos verificados:

- [FragmentRenderer.tsx:2-8](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L1-L8) importa de `core/layout/LayoutFragment`, `core/document/ListUtils`, `core/composition/ParagraphComposer`, `core/utils/sanitizeUrl`.
- [Toolbar.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/Toolbar.tsx) e [MenuBar.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/MenuBar.tsx) importam de `core` para constantes.

UI deveria depender de uma fachada (`EditorPort`/`ViewModel`), não “escavar” internamente o `core`. Hoje qualquer rename em `core/composition` quebra a UI.

---

### 22. 🟡 `setStore("events", events)` global em `OasisEditorView`

[src/app/OasisEditorView.ts:146-151](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L146-L151) e [src/ui/EditorStore.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/EditorStore.tsx) — store SolidJS módulo-singleton. Componentes em `ui/` importam o store diretamente, criando uma dependência **circular conceitual** (app → ui store → app).

---

### Outros pontos de DIP (DIP-adjacent)

- [createOasisEditorApp.tsx:35-65](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/bootstrap/createOasisEditorApp.tsx) é a única raiz de composição correta — bom — mas instancia tipos concretos (`new DocxImporter()`, `new DocxExporter(fontManager)`, `new DocumentRuntime()`). Não há **container DI** nem fábricas.
- [OasisEditorController.ts:302](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L302) — `onPrint: () => window.print()` chama API do navegador diretamente.
- `Logger` lê `window.OASIS_DEBUG` em tempo de carga ([Logger.ts:2](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/utils/Logger.ts#L2)).
- [DocumentRuntime.ts:78,86](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/DocumentRuntime.ts#L78) — chama `Logger` global dentro de um “core” puro.

---

## Recomendações priorizadas

1. **Tipar handlers** — substituir `op: any` por união discriminada `EditorOperation` + `match` exaustivo (corrige LSP #12 e a maioria dos `as any` de produção).
2. **Tipar comandos** — `EditorCommand<TArgs>` paramétrico em vez de `...args: any[]` (LSP #11, ISP #15).
3. **Visitor de blocos** — centralizar `block.kind` em uma única tabela de comportamento (OCP #9, SRP #5).
4. **Quebrar `OasisEditorController`** — mover métodos imperativos para comandos, deletar duplicações com o `CommandBus` (SRP #1).
5. **Extrair `IDocumentRuntime`** — interface mínima (`getState`, `subscribe`, `dispatch`, `undo`, `redo`) e fazer todos os controllers/commands dependerem dela (DIP #18).
6. **Injetar `ILogger`** — remover singleton global (DIP #20).
7. **Segmentar `ViewEventBindings`** em interfaces por feature (ISP #15).
8. **Separar `IFontManager`** em `FontCatalog` + `BlockTypographyResolver` (ISP #17).
9. **Mapear `handleTableAction`** com `Record<string, …>` ou comandos próprios (OCP #7).
10. **Tipar runs especiais** (`field`, `footnoteId`, `revision`) como união discriminada em `BlockTypes` (LSP #13).
