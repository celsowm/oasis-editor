# Violações de SOLID no Oasis Editor

Análise detalhada de todas as violações dos princípios SOLID encontradas no codebase.

---

## Sumário

| Princípio | Violações | Severidade Geral |
|---|---|---|
| **S** – Single Responsibility | 8 | 🔴 Alta |
| **O** – Open/Closed | 4 | 🟡 Média |
| **L** – Liskov Substitution | 2 | 🟢 Baixa |
| **I** – Interface Segregation | 3 | 🟡 Média |
| **D** – Dependency Inversion | 5 | 🔴 Alta |

---

## S — Single Responsibility Principle (SRP)

> *Uma classe deve ter apenas um motivo para mudar.*

### S1. `OasisEditorController` — God Class 🔴

**Arquivo:** `src/app/OasisEditorController.ts` (~950 linhas)

O controller acumula pelo menos **7 responsabilidades distintas**:

1. **Manipulação de input do teclado** (insertText, deleteText, moveCaret)
2. **Manipulação de mouse** (mouseDown, mouseMove, mouseUp, dblClick, tripleClick)
3. **Cálculo de posição do cursor** (`calculatePositionFromEvent` — ~120 linhas)
4. **Drag & Drop de tabelas** (handleTableDragStart, handleTableDragging, handleTableMouseUp, findDropTarget, showDropIndicator, hideDropIndicator)
5. **Format Painter** (toggleFormatPainter, estado `formatPainterActive/Sticky/Marks/Align`)
6. **Import de DOCX** (importDocx — acessa `DocxImporter` diretamente e monta o estado)
7. **Refresh/orquestração de layout** (refresh — compõe layout, atualiza runtime, renderiza)

```typescript
// Exemplo: o controller gerencia DOM diretamente para drag & drop
private handleTableDragStart(tableId: string, event: MouseEvent): void {
    this.isTableDragging = true;
    this.tableGhost = document.createElement("div"); // DOM direto no controller!
    this.tableGhost.className = "oasis-table-ghost";
    document.body.appendChild(this.tableGhost);
}
```

**Impacto:** Qualquer mudança em drag & drop, format painter, import ou input de teclado exige modificar esta classe.

**Sugestão:** Extrair para:
- `KeyboardInputHandler`
- `MouseInputHandler`
- `TableDragController`
- `FormatPainterController`
- `DocxImportService`

---

### S2. `OperationHandlers.ts` — Arquivo monolítico 🔴

**Arquivo:** `src/core/runtime/OperationHandlers.ts` (~1516 linhas)

Um único arquivo contém **todos** os handlers de operação do editor (INSERT_TEXT, DELETE_TEXT, INSERT_PARAGRAPH, TOGGLE_MARK, SET_MARK, APPLY_FORMAT, INSERT_TABLE, TABLE_ADD_ROW, TABLE_DELETE, MOVE_BLOCK, TOGGLE_LISTS, INDENT, etc.) além de **helpers internos** como `applyMarksInRange`, `tryMergeSiblings`, `stripBlock`, `insertBlock`, `updateDocumentSections`, `recalculateListSequences`.

```typescript
// Helpers misturados com handlers — tudo num único módulo
function recalculateListSequences(blocks: BlockNode[]): BlockNode[] { ... }
function updateDocumentSections(...) { ... }
function applyMarksInRange(...) { ... }  // ~140 linhas
function tryMergeSiblings(...) { ... }
function stripBlock(...) { ... }
function insertBlock(...) { ... }
// + 20 registerHandler() chamadas
```

**Impacto:** Qualquer mudança (ex: corrigir delete dentro de tabela) exige navegar 1500+ linhas.

**Sugestão:** Separar em módulos:
- `handlers/textHandlers.ts` (INSERT_TEXT, DELETE_TEXT, INSERT_PARAGRAPH)
- `handlers/markHandlers.ts` (TOGGLE_MARK, SET_MARK, APPLY_FORMAT)
- `handlers/tableHandlers.ts` (INSERT_TABLE, TABLE_ADD_ROW, etc.)
- `handlers/listHandlers.ts` (TOGGLE_LIST, INDENT)
- `helpers/blockMutations.ts` (stripBlock, insertBlock, tryMergeSiblings)

---

### S3. `OasisEditorView` — Renderização + Binding + DOM 🟡

**Arquivo:** `src/app/OasisEditorView.ts` (~800 linhas)

A View acumula:
1. **Binding de eventos** (bind — ~100 linhas conectando listeners)
2. **Renderização de toolbar** (updateToolbar, updateImageOverlay, updateTableToolbar)
3. **Gerenciamento de menus dropdown** (openMenu, closeMenu, buildMenuItems)
4. **Orquestração de overlays** (imageResizeOverlay, tableToolbar, tableMoveHandle)

```typescript
// Menus construídos inline dentro da View
private buildMenuItems(menuId: string, events: ViewEventBindings): MenuItem[] {
    if (menuId === "oasis-editor-menu-file") return [ ... ];
    if (menuId === "oasis-editor-menu-edit") return [ ... ];
    // ... todos os menus hardcoded aqui
}
```

**Sugestão:** Extrair `MenuManager`, `ToolbarManager`, `OverlayManager`.

---

### S4. `PaginationEngine` — Layout + Paginação + Medição 🟡

**Arquivo:** `src/core/pagination/PaginationEngine.ts` (~456 linhas)

Combina:
1. **Criação de páginas** (createNewPage)
2. **Medição de blocos** (measureBlocks)
3. **Processamento/posicionamento de blocos** (processBlocks)
4. **Layout de tabelas** (medição de células, grid de colunas)
5. **Aplicação de header/footer** (applyHeaderFooter)

O `measureBlocks` duplica lógica de posicionamento de fragmentos que existe em `processBlocks`.

---

### S5. `PageLayer` — Renderização de todos os tipos de fragmento 🟡

**Arquivo:** `src/ui/pages/PageLayer.ts` (~200 linhas)

O método `renderFragment` decide como renderizar imagens, table-cells e text fragments usando `if/else`. Deveria delegar para renderers específicos por tipo.

---

### S6. `DocxImporter` — Parsing + Transformação + Criação 🟡

**Arquivo:** `src/engine/import/DocxImporter.ts` (~279 linhas)

Combina:
1. Chamada ao mammoth (buffer → HTML)
2. Parsing de HTML (DOMParser)
3. Transformação de DOM nodes em `BlockNode[]`
4. Criação de runs/marks/tables

---

### S7. `DocumentRuntime` — State management + Undo/Redo + Serialização 🟢

**Arquivo:** `src/core/runtime/DocumentRuntime.ts`

Mistura:
- Gerenciamento de estado (getState/setState)
- Undo/redo (history/future stacks)
- Serialização (exportJson)
- Armazenamento de layout (setLayout/getLayout)

---

### S8. `DocumentFactory` — Contadores globais mutáveis 🟢

**Arquivo:** `src/core/document/DocumentFactory.ts`

Usa variáveis mutáveis no escopo do módulo (`sectionCounter`, `blockCounter`, etc.) para gerar IDs. Isso é estado global compartilhado e dificulta testes.

```typescript
let sectionCounter = 0;
let blockCounter = 0;
let runCounter = 0;
// ...
const nextBlockId = (): string => `block:${blockCounter++}`;
```

---

## O — Open/Closed Principle (OCP)

> *Entidades devem ser abertas para extensão, fechadas para modificação.*

### O1. `OperationType` enum — Adicionar operação exige modificar múltiplos arquivos 🔴

**Arquivos:** `OperationTypes.ts`, `OperationFactory.ts`, `OperationHandlers.ts`

Para adicionar uma nova operação ao editor:
1. Adicionar valor no `enum OperationType`
2. Criar interface de payload em `OperationTypes.ts`
3. Adicionar ao union type `EditorOperation`
4. Criar factory method em `Operations` (OperationFactory.ts)
5. Registrar handler em `OperationHandlers.ts`

O pattern de `registerHandler` é um bom começo, mas o enum e o union type centralizados forçam modificação dos arquivos centrais.

---

### O2. `renderFragment` — Switch implícito para novos tipos de bloco 🟡

**Arquivo:** `src/ui/pages/PageLayer.ts`

```typescript
private renderFragment(fragment: LayoutFragment): HTMLElement {
    if (fragment.kind === "image" && fragment.imageSrc) { ... }
    if (fragment.kind === "table-cell") { ... }
    // Text fragment (default)
}
```

Adicionar um novo tipo de bloco (ex: code-block, embed) exige modificar este método.

**Sugestão:** Registry de renderers: `Map<FragmentKind, FragmentRenderer>`.

---

### O3. `composeParagraph` — Lógica de tipografia hardcoded 🟡

**Arquivo:** `src/core/composition/ParagraphComposer.ts`

```typescript
const fontSize = firstRun?.marks.fontSize ?? (block.kind === "heading" ? 24 : 15);
const fontWeight = firstRun?.marks.bold || block.kind === "heading" ? 700 : 400;
```

Valores de tipografia default embutidos no código. Adicionar um novo tipo (ex: "code") exige mudar este arquivo.

---

### O4. `processBlocks` — Novo tipo de bloco exige modificar engine 🟡

**Arquivo:** `src/core/pagination/PaginationEngine.ts`

```typescript
if (block.kind === "paragraph" || block.kind === "heading" || 
    block.kind === "list-item" || block.kind === "ordered-list-item") { ... }
if (block.kind === "table") { ... }
```

Chain de `if` para cada tipo de bloco. Não é extensível.

---

## L — Liskov Substitution Principle (LSP)

> *Subtipos devem ser substituíveis por seus tipos base.*

### L1. `BlockNode` union type inconsistente 🟢

**Arquivo:** `src/core/document/BlockTypes.ts`

`BlockNode` inclui `ImageNode` e `TableNode`, que não têm `children: TextRun[]` nem `align` do tipo `"justify"`. Muitos handlers fazem `isTextBlock()` checks para guard, mas vários usam `(block as any)` para contornar:

```typescript
// Em OperationHandlers.ts
return { ...block, kind: "paragraph" } as any;
return { ...block, indentation: newIndent } as any;
```

O uso frequente de `as any` indica que o union type não modela bem a hierarquia.

---

### L2. `PageViewport.normalizeSelection` duplica `SelectionService.normalizeSelection` 🟢

**Arquivo:** `src/ui/pages/PageViewport.ts` vs `src/core/selection/SelectionService.ts`

Ambos normalizam seleção, mas com lógica diferente:

```typescript
// PageViewport — compara por blockId string
return a.blockId < b.blockId ? { start: a, end: b } : { start: b, end: a };

// SelectionService — compara por string composta concatenada
const ak = `${a.sectionId}:${a.blockId}:${a.inlineId}:${a.offset}`;
return ak.localeCompare(bk);
```

Se você substituir uma pela outra, o comportamento muda — violando expectativas de contrato.

---

## I — Interface Segregation Principle (ISP)

> *Clientes não devem depender de interfaces que não usam.*

### I1. `ViewEventBindings` — Interface fat demais 🔴

**Arquivo:** `src/app/OasisEditorView.ts`

```typescript
export interface ViewEventBindings {
    onFormatPainterToggle: () => void;
    onFormatPainterDoubleClick: () => void;
    onBold: () => void;
    onItalic: () => void;
    onUnderline: () => void;
    onColorChange: (color: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onTemplateChange: (templateId: string) => void;
    onTextInput: (text: string) => void;
    onDelete: () => void;
    onEnter: (isShift: boolean) => void;
    onEscape: () => void;
    onArrowKey: (key: string) => void;
    onMouseDown: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseUp: (e: MouseEvent) => void;
    onDblClick?: (e: MouseEvent) => void;
    onTripleClick?: (e: MouseEvent) => void;
    onAlign: (...) => void;
    onToggleBullets: () => void;
    onToggleNumberedList: () => void;
    onDecreaseIndent: () => void;
    onIncreaseIndent: () => void;
    onInsertImage: (...) => void;
    onImportDocx: (file: File) => void;
    onResizeImage: (...) => void;
    onSelectImage: (...) => void;
    onInsertTable: (...) => void;
    onTableAction: (...) => void;
    onTableMove: (...) => void;
    onPrint?: () => void;
}
```

**32 métodos** em uma única interface. Qualquer consumidor precisa implementar/conhecer tudo.

**Sugestão:** Separar em `KeyboardEvents`, `MouseEvents`, `FormattingEvents`, `TableEvents`, `ImageEvents`.

---

### I2. `ViewElements` — 30+ referências DOM obrigatórias 🟡

**Arquivo:** `src/app/OasisEditorView.ts`

A interface `ViewElements` exige 30+ referências a elementos DOM. Se a UI mudar (ex: remover botão de print), a interface inteira precisa ser atualizada.

---

### I3. `LayoutFragment` — Interface genérica para todos os tipos 🟡

**Arquivo:** `src/core/layout/LayoutFragment.ts`

Um `LayoutFragment` tem campos opcionais como `imageSrc`, `imageAlt`, `listNumber`, `indentation` que só fazem sentido para tipos específicos. Deveria ser um union type com interfaces específicas.

---

## D — Dependency Inversion Principle (DIP)

> *Módulos de alto nível não devem depender de módulos de baixo nível. Ambos devem depender de abstrações.*

### D1. `OasisEditorController` depende de implementações concretas 🔴

**Arquivo:** `src/app/OasisEditorController.ts`

```typescript
import { DocxImporter } from "../engine/import/DocxImporter.js";
import { PAGE_TEMPLATES } from "../core/pages/PageTemplateFactory.js";
```

O controller instancia `new DocxImporter()` diretamente e acessa o dicionário global `PAGE_TEMPLATES`. Não há abstração para importação de documentos.

```typescript
async importDocx(file: File): Promise<void> {
    const importer = new DocxImporter(); // Instanciação direta!
    const docModel = await importer.importFromBuffer(arrayBuffer);
}
```

**Sugestão:** Injetar via `ControllerDeps`:
```typescript
interface DocumentImporter {
    importFromBuffer(buffer: ArrayBuffer): Promise<DocumentModel>;
}
```

---

### D2. `DocumentRuntime` cria seu próprio estado inicial 🟡

**Arquivo:** `src/core/runtime/DocumentRuntime.ts`

```typescript
constructor() {
    const doc = createDocument(); // Dependência concreta de factory
}
```

O runtime depende diretamente de `createDocument()` para criar o documento inicial. Deveria receber o estado inicial por injeção.

---

### D3. `PaginationEngine` depende de `PAGE_TEMPLATES` global 🟡

**Arquivo:** `src/core/pagination/PaginationEngine.ts`

```typescript
import { PAGE_TEMPLATES } from "../pages/PageTemplateFactory.js";

const template: PageTemplate =
    PAGE_TEMPLATES[section.pageTemplateId] ??
    PAGE_TEMPLATES["template:a4:default"];
```

Acessa diretamente um dicionário global. Os templates deveriam ser injetados.

---

### D4. `PageViewport` cria `SelectionMapper` internamente 🟢

**Arquivo:** `src/ui/pages/PageViewport.ts`

```typescript
render(...): void {
    this.mapper = new SelectionMapper(layout, this.measurer); // Criação interna
}
```

Cria `SelectionMapper` a cada render em vez de recebê-lo injetado ou via factory.

---

### D5. `OasisEditorController` acessa `document.elementFromPoint` diretamente 🟢

**Arquivo:** `src/app/OasisEditorController.ts`

```typescript
calculatePositionFromEvent(event: MouseEvent): LogicalPosition | null {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    // ...
}
```

E também em `findDropTarget`:
```typescript
const element = document.elementFromPoint(event.clientX, event.clientY);
```

Acoplamento direto com a API DOM do browser. Impossível testar unitariamente.

---

## Problemas Transversais

### Uso excessivo de `any` 🔴

Encontrados em múltiplos arquivos:

| Arquivo | Ocorrências | Exemplo |
|---|---|---|
| `OperationHandlers.ts` | ~15x | `(block as any).indentation`, `return { ...block, kind: "paragraph" } as any` |
| `OasisEditorController.ts` | ~5x | `formatPainterMarks: any`, `tableBlock: any` |
| `PaginationEngine.ts` | ~3x | `section: any` no `PaginationContext` |
| `OasisEditorPresenter.ts` | ~2x | `(tableInfo.table as any).rows[0]` |

### Código duplicado entre `TextMeasurementService` e `PositionCalculator` 🟡

Ambos implementam lógica quase idêntica de medição de texto com justificação:

```typescript
// TextMeasurementService.measureWidthUpToOffset (linhas 17-68)
// PositionCalculator.calculateXOffset (linhas 121-181)
// Ambos: iteração sobre runs, cálculo de extraSpacePerGap, medição por segmento
```

### Lógica de traversal de blocos duplicada ~6x 🔴

O pattern de percorrer todos os blocos (incluindo tabelas) é repetido em:
1. `OperationHandlers.ts` — `applyMarksInRange`
2. `OperationHandlers.ts` — `DECREASE_INDENT` handler
3. `OperationHandlers.ts` — `INCREASE_INDENT` handler
4. `OperationHandlers.ts` — `SET_INDENTATION` handler
5. `OasisEditorController.ts` — `handleTripleClick`
6. `OasisEditorController.ts` — `insertText`

```typescript
// Este pattern aparece em 6+ lugares:
const allBlocks: BlockNode[] = [];
for (const section of doc.sections) {
    const traverse = (blocks: BlockNode[]) => {
        for (const b of blocks) {
            allBlocks.push(b);
            if (b.kind === "table") {
                for (const row of b.rows) {
                    for (const cell of row.cells) {
                        traverse(cell.children);
                    }
                }
            }
        }
    };
    traverse(targetBlocks);
}
```

O `BlockUtils.ts` já tem `getAllBlocks()` e `collectBlocks()`, mas nem todos os callsites o utilizam.

---

## Recomendações Prioritárias

1. **[Alta]** Quebrar `OasisEditorController` em sub-controllers focados
2. **[Alta]** Separar `OperationHandlers.ts` em módulos por domínio
3. **[Alta]** Criar interface `DocumentImporter` e injetar no controller
4. **[Média]** Segregar `ViewEventBindings` em interfaces menores
5. **[Média]** Substituir `any` por tipos discriminados em handlers
6. **[Média]** Unificar traversal de blocos usando `getAllBlocks()` de `BlockUtils`
7. **[Baixa]** Injetar estado inicial no `DocumentRuntime`
8. **[Baixa]** Criar registry de fragment renderers em `PageLayer`
