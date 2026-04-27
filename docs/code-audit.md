# Code Audit — Oasis Editor

> Auditoria original em 2026-04-27, **revisada em 2026-04-27** após verificação contra o código atual.
> Itens marcados com ✅ já foram resolvidos; ⚠️ permanecem; 🆕 são novos.
> Problemas organizados por severidade.

---

## Resolvidos desde a auditoria anterior

- ✅ **DropdownManager singleton** implementado em [src/ui/components/DropdownManager.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/DropdownManager.ts) e adotado por `ColorPicker`, `HighlightColorPicker`, `MenuBar` e `TablePicker`. O bug de múltiplos dropdowns abertos está fechado.
- ✅ **`Logger.log/debug/trace` gated por flag** (`OASIS_DEBUG`). Em produção, apenas `warn`/`error` chegam ao console; o impacto de performance descrito no item #12 é hoje muito menor — mas continua havendo overhead de chamada/curto-circuito no caminho quente.
- ✅ **`FormatPainterController` extraído** para [src/app/controllers/FormatPainterController.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/FormatPainterController.ts) (era código colado dentro do controller principal).

---

## CRÍTICO

### 1. ⚠️ `as any` massivo — **137 ocorrências** em código de produção, **78** em testes

TypeScript continua virando JavaScript glorificado. Operações, handlers, parsers, comandos — tudo passa `any`. Renames, refactorings e bugs de tipo passam silenciosamente.

**Exemplos confirmados (verificados em 2026-04-27):**
- [src/core/runtime/handlers/structureHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/structureHandlers.ts#L10) — `handleInsertParagraph`, `handleAppendParagraph`, `handleInsertPageBreak` continuam com `op: any`.
- [src/core/runtime/handlers/annotationHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/annotationHandlers.ts) — 6 handlers (`handleInsertField`, `handleInsertEquation`, `handleInsertBookmark`, `handleInsertFootnote`, `handleInsertEndnote`, `handleInsertComment`) com `op: any`.
- [src/core/runtime/handlers/inlineHandlers.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/inlineHandlers.ts) — 3 handlers com `op: any`.
- [src/core/operations/OperationTypes.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/operations/OperationTypes.ts) — `value?: any` em payloads de mark.
- [src/app/commands/EditorCommand.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/commands/EditorCommand.ts#L12) — `execute(...args: any[])`.
- [src/engine/opc/parsing/WMLParser.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/engine/opc/parsing/WMLParser.ts#L59-L60) — stubs `as any` para bypass de notas/comentários.
- [src/ui/pages/FragmentRenderer.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L106-L131) — 5x `(run as any).field` / `(run as any).footnoteId`. O modelo `Run` não tipa esses ramos.

**Impacto:** Qualquer rename de propriedade em operações/blocos só é descoberto em runtime.

---

### 2. ⚠️ SolidJS misturado com manipulação DOM manual

Continuam existindo **6 mini-apps SolidJS independentes** rodando simultaneamente, cada um criado via `render()` imperativo em containers DOM:

| Componente | Local | Linha de `render()` |
|---|---|---|
| ColorPicker | [src/ui/components/ColorPicker.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/ColorPicker.tsx#L159) | 159 |
| HighlightColorPicker | [src/ui/components/HighlightColorPicker.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/HighlightColorPicker.tsx#L166) | 166 |
| TablePicker | [src/ui/components/TablePicker.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/TablePicker.tsx#L100) | 100 |
| PageLayer | [src/ui/pages/PageLayer.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/PageLayer.tsx#L120) | 120 |
| Ruler | [src/ui/ruler/Ruler.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/ruler/Ruler.tsx#L154) | 154 |
| TableFloatingToolbar | [src/ui/selection/TableFloatingToolbar.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/TableFloatingToolbar.tsx#L113) | 113 |

Eles não compartilham estado reativo. A comunicação é feita via props/callbacks, não via contexto SolidJS.

**Manipulação DOM imperativa convive com o SolidJS:**
- [src/ui/pages/PageViewport.ts:102,137](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/PageViewport.ts#L102) — `pageEl.appendChild(overlayContainer)` dentro de área renderizada pelo SolidJS.
- [src/ui/selection/ImageResizeOverlay.ts:130,151,267,270](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/ImageResizeOverlay.ts) — 4x `appendChild` manual (handles, badge, ring, overlay).
- [src/ui/selection/TableMoveHandle.ts:21](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/TableMoveHandle.ts#L21) — `handle.innerHTML = "⠿"`.
- [src/app/controllers/TableDragController.ts:77](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/TableDragController.ts#L77) — `document.body.appendChild(this.tableGhost)`.
- [src/app/OasisEditorView.ts:149,476,652](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts) — `appendChild` para drop indicator, editing mode banner e image alt input.

---

### 3. ⚠️ XSS via links não sanitizados — **continua aberto**

[src/ui/pages/FragmentRenderer.tsx:114-122](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L114-L122) — links são renderizados sem validar protocolo:

```tsx
<a href={marks.link} target="_blank" ...>
```

Se um usuário inserir `javascript:alert(1)` como link, o navegador executará. Adicionalmente, `target="_blank"` continua **sem `rel="noopener noreferrer"`**, permitindo tabnabbing e acesso ao `window.opener`.

[src/ui/OasisEditor.tsx:41](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/OasisEditor.tsx#L41) — `prompt("Enter link URL:")` continua sem validação de URL antes de chamar `onInsertLink`.

**Vetor de ataque pendente** — deveria estar no topo da fila.

---

### 4. ⚠️ Cleanup faltando em vários pontos

> ❗ **Correção da auditoria anterior:** o item “onCleanup chamado dentro de `onMount`” *não é antipattern em SolidJS*. `onCleanup` é registrado no escopo reativo atual; quando declarado dentro de `onMount`, o cleanup é executado quando o componente é desmontado. Removido da lista.

| Local | Problema |
|---|---|
| [src/app/OasisEditorView.ts:405-409](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L405-L409) | `requestAnimationFrame` aninhado sem `cancelAnimationFrame` — se a view for descartada antes do callback, há vazamento. |
| [src/ui/ruler/Ruler.tsx:40-47](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/ruler/Ruler.tsx#L40-L47) | Drag listeners sem cleanup se componente desmontar durante drag. |
| [src/ui/selection/ImageResizeOverlay.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/ImageResizeOverlay.ts) | Listeners de mousedown nos handles sem cleanup explícito. |
| Classes com `render()` (vide tabela do item 2) | `destroy()` só é chamado se explicitamente invocado — sem garantia se a hierarquia é desmontada por SolidJS. |

---

## ALTO

### 5. ⚠️ ~40 métodos DOM nunca usados em [OasisEditorDom.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/dom/OasisEditorDom.ts)

195 linhas de getters (`getBoldButton`, `getItalicButton`, `getMenuFileElement`, `getZoomSelect`, etc.) — **nenhum chamado fora do próprio arquivo**. O controller bypassa a classe e usa `querySelector` diretamente quando precisa.

**Imports/exports não usados:**
- [src/ui/utils/dom.ts:63](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/utils/dom.ts#L63) — `export function fragment()` definida mas nunca importada em nenhum lugar.
- [src/ui/OasisEditor.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/OasisEditor.tsx) — `Show` importado mas não usado diretamente.

---

### 6. ⚠️ Error handling silencioso em import/export

[src/app/controllers/ImportExportController.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/controllers/ImportExportController.ts) — 3 catches que apenas logam o erro:

```ts
} catch (e) {
  Logger.error("Failed to import DOCX:", e);
}
```

O usuário clica em "Import DOCX" e nada acontece. Sem feedback visual, sem retry, sem estado de erro.

[src/main.ts:18](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/main.ts#L18) — `document.fonts.ready.then(...)` sem `.catch()`. Se o loading de fontes falhar, o editor nunca inicializa e o spinner fica eterno.

---

### 7. ⚠️ Re-render sem throttle/debounce no caminho quente

- [src/app/OasisEditorController.ts:626-628](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L626) — `refresh()` faz layout compose completo + presenter + view.render a cada state change. **Cada letra digitada dispara isso.** Não há debounce.
- [src/ui/components/Toolbar.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/Toolbar.tsx) — `measureOverflow()` faz `getBoundingClientRect()` em todos os filhos. É chamado por (1) `setTimeout(50ms)`, (2) `document.fonts.ready`, (3) `ResizeObserver` — que dispara dezenas de vezes durante resize.
- Repositório inteiro sem nenhuma utilidade de `throttle`/`debounce` (`grep throttle|debounce` retorna 0 ocorrências).

---

### 8. ⚠️ `createIcons()` chamado em 7 pontos

> ⚙️ **Atualização:** `MenuBar.tsx` não chama mais `createIcons` (a chamada foi removida). Em compensação, `main.ts` e `Toolbar.tsx` (2x) continuam executando `createIcons` repetidamente.

Lucide reprocessa todos os ícones a cada chamada:

| Arquivo | Linha |
|---|---|
| [src/main.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/main.ts#L18) | 18 |
| [src/ui/OasisEditor.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/OasisEditor.tsx#L9) | 9 |
| [src/ui/components/Toolbar.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/Toolbar.tsx#L61) | 61, 69 |
| [src/ui/components/ColorPicker.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/ColorPicker.tsx#L37) | 37 |
| [src/ui/components/HighlightColorPicker.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/HighlightColorPicker.tsx#L58) | 58 |
| [src/ui/selection/TableFloatingToolbar.tsx](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/TableFloatingToolbar.tsx#L29) | 29 |

Pelo menos os pickers passam o ícone só quando abertos — mas Toolbar dispara duas vezes em cada montagem.

---

## MÉDIO

### 9. ⚠️ CSS duplicado ~95% entre ColorPicker e HighlightColorPicker

[ColorPicker.css](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/styles/components/ColorPicker.css) (135 linhas) e [HighlightColorPicker.css](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/styles/components/HighlightColorPicker.css) (138 linhas) são praticamente idênticos exceto nomes de classe, tamanho do grid (10 colunas vs 8) e tamanho do swatch. Deveria ser uma classe base compartilhada com overrides.

---

### 10. ⚠️ 5 nomes diferentes para a mesma operação de tabela

| Camada | Nome |
|---|---|
| UI ([TableFloatingToolbar](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/TableFloatingToolbar.tsx)) | `onAddRowAbove` |
| View ([ViewEventBindings](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/events/ViewEventBindings.ts)) | `onInsertRowAbove` |
| Controller ([OasisEditorController:278](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L278)) | `handleTableAction("addRowAbove", …)` |
| Factory ([OperationFactory:144](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/operations/OperationFactory.ts#L144)) | `tableAddRowAbove` |
| Enum ([OperationTypes:21](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/operations/OperationTypes.ts#L21)) | `TABLE_ADD_ROW_ABOVE` |

Mesmo padrão se repete para todas as ações de tabela.

---

### 11. ⚠️ Magic numbers espalhados

| Local | Valor | Uso |
|---|---|---|
| [OasisEditorView.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts) | `500` | Threshold "just dropped" |
| OasisEditorView.ts | `350`, `15` | Double-click detection |
| Toolbar.tsx | `50` | setTimeout delay |
| ColorPicker.tsx | `10000` | z-index arbitrário |
| HighlightColorPicker.tsx | `10000` | Mesmo z-index, **não compartilhado** |
| FragmentRenderer.tsx | `20` | Fallback de altura |
| FragmentRenderer.tsx | `10px` | Font size de footnote |
| ImageResizeOverlay.ts | `20` | Mínimo de resize |
| `e2e/image.spec.ts` | `96` | Margem hardcoded no teste |

---

### 12. ⚠️ Debug code em produção (parcialmente mitigado)

> ⚙️ **Mitigação parcial:** `Logger` agora gateia `log/trace/debug` por `window.OASIS_DEBUG` ([Logger.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/utils/Logger.ts#L1)). Em produção esses logs viram no-ops, mas as chamadas continuam sendo despachadas (overhead de função + curto-circuito).

**Problemas que ainda precisam de ação:**
- [src/ui/components/MenuBar.tsx:62-98](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/MenuBar.tsx#L62-L98) — 4× `console.log` cru como stubs (`"New document"`, `"Open document"`, `"Download"`, `"Insert HR"`). Não passam pelo `Logger`, então **aparecem no console mesmo em produção**.
- [OasisEditorController.ts:180,185-186,240,259,270,481](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts) — 6 `Logger.log` no caminho quente (input, enter, drop, drag start, insertImage) e 1 `Logger.trace("onEnter stack trace")` em todo Enter.

---

## BAIXO

### 13. ⚠️ Testes com `as any` massivo — 78 ocorrências

Os testes unitários continuam atravessando interfaces internas com `as any`. [`FullIntegration.test.ts`](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/__tests__/ui/FullIntegration.test.ts) usa muitos mocks — não é integração, é unidade disfarçada.

### 14. ⚠️ Sem cobertura de testes para:
- Drag and drop real (E2E tenta mas usa dispatches sintéticos)
- Undo/redo com documentos complexos
- Import/export roundtrip com documentos reais
- Format painter
- Table move/drag
- Footnote/endnote editing
- Track changes

### 15. ⚠️ `document.execCommand("cut/copy/paste")` em [MenuBar.tsx:81-83](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/MenuBar.tsx#L81-L83)

Deprecated e bloqueado pela maioria dos browsers modernos. `execCommand("paste")` não funciona em praticamente nenhum browser atual.

### 16. ⚠️ `parseXml()` duplicada

- [src/engine/opc/parsing/XmlUtils.ts:3](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/engine/opc/parsing/XmlUtils.ts#L3)
- [src/engine/opc/OPCGraphBuilder.ts:35](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/engine/opc/OPCGraphBuilder.ts#L35)

Duas implementações independentes — `OPCGraphBuilder` deveria importar de `XmlUtils`.

### 17. 🆕 TODO esquecido em runtime

[src/core/runtime/handlers/inlineHandlers.ts:186](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/inlineHandlers.ts#L186) — `return state; // Range delete TODO`. `handleDeleteText` retorna sem alterar o estado quando há range — isso significa que delete de seleção pode falhar silenciosamente em algum caminho.

### 18. 🆕 Logger silencia type-safety com `any[]`

[Logger.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/utils/Logger.ts) — todas as funções aceitam `...args: any[]`. É possível restringir o tipo a `unknown[]` sem perder ergonomia.

### 19. 🆕 `OasisEditorView` e `OasisEditorController` muito grandes

- [OasisEditorView.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts) — 679 linhas.
- [OasisEditorController.ts](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts) — 635 linhas, gerencia 7+ controllers internos.

Continuam sendo god objects. Fatores diferentes (selection, drag, table, viewport, banner, alt input) deveriam ser extraídos para subviews/subcontrollers do tipo já existente em `controllers/`.

---

## 🪤 Gambiarras / cheiros encontrados na 2ª passada

São padrões pequenos isolados que individualmente não pesam, mas no conjunto descrevem o estilo "JS dos anos 2000" do projeto.

### G1. Listeners globais em `window` sem cleanup
[OasisEditorController.ts:315,319](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts#L315-L321) e [OasisEditorView.ts:299-337](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L299-L337) registram `mousemove`, `mouseup`, `dragenter`, `dragleave`, `dragover`, `dragend`, `drop` no `window` e **nunca chamam `removeEventListener`**. Cada `new OasisEditorController()`/`View()` em hot-reload ou em testes acumula listeners. Em produção é leak permanente; em dev é fonte de bugs absurdos ("o evento dispara duas vezes").

### G2. `as EventListener` recorrente para enganar o tipo
[OasisEditorController.ts:312, 328, 357](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorController.ts) — cast `((e: CustomEvent) => {...}) as EventListener`. Solução correta é declarar o evento via `interface DocumentEventMap`/`HTMLElementEventMap` augment, não cast.

### G3. `as unknown as Node` para forçar contains()
[PageViewport.ts:83, 120](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/PageViewport.ts#L83) — `document.body.contains(existingOverlay.container as unknown as Node)`. O `container` JÁ é `HTMLElement`. Cast inútil que mascara erro real (provavelmente import wrong).

### G4. Non-null assertion `!` espalhado em UI
27+ ocorrências de `viewModel.selection!`, `page.headerRect!`, `props.rect!`, `rev!.type`, `current!.basedOn`, etc.:
- [OasisEditorView.ts:493](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L493)
- [PageLayer.tsx:35-65, 84-85](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/PageLayer.tsx#L35-L65) — 8 `!.x` consecutivos
- [FragmentRenderer.tsx:97-101](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/FragmentRenderer.tsx#L97-L101)
- [TableFloatingToolbar.tsx:64-65](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/TableFloatingToolbar.tsx#L64)
- [DropTargetService.ts:67](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/services/DropTargetService.ts#L67) — `bestFragment.getAttribute("data-block-id")!`
- [RunWriter.ts:143](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/engine/opc/writing/RunWriter.ts#L143)

Cada `!` é uma promessa para o compilador que pode quebrar em runtime.

### G5. `delete (x as any)[key]` ao invés de imutabilidade
[OasisEditorPresenter.ts:127](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/presenters/OasisEditorPresenter.ts#L127), [inlineHandlers.ts:73](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/inlineHandlers.ts#L73), [markHandlers.ts:256, 273, 285, 291](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/runtime/handlers/markHandlers.ts).

Em runtime imutável, `delete` é mutação direta — quebra o contrato de "estado imutável" que o nome `EditorState` sugere. `const { [key]: _, ...rest } = obj` resolve.

### G6. `pdfMake.vfs = pdfFonts` como side-effect de import
[PdfExporter.ts:33](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/engine/export/PdfExporter.ts#L33) — mutação de variável global no top-level do módulo. Importar `PdfExporter.ts` para qualquer fim (lint, type, test) injeta vfs de pdfmake no bundle. Deveria estar dentro do construtor com lazy init.

E o [`@ts-ignore` da linha 55](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/engine/export/PdfExporter.ts#L55) é cego — sem comentário do erro que está sendo silenciado.

### G7. Duplicação literal entre `getOrCreateCaretOverlay` e `getOrCreateSelectionOverlay`
[PageViewport.ts:76-145](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/PageViewport.ts#L76-L145) — 35 linhas idênticas com substituição de `caretOverlays` por `selectionOverlays` e `CaretOverlay` por `SelectionOverlay`. Copy-paste cru. Generic helper resolveria.

### G8. `(window as any).OASIS_DEBUG` não declarado
[Logger.ts:1](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/core/utils/Logger.ts#L1) — variável global tipada via cast. Não há declaração `interface Window { OASIS_DEBUG?: boolean }` em nenhum `.d.ts`. Não está documentada em README. Quem descobre? Lendo o source.

### G9. Inline styles JS via `Object.assign(el.style, {...})`
[ImageResizeOverlay.ts:110, 122, 135, 201](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/ImageResizeOverlay.ts) — 4× blocos com 8-15 propriedades CSS inline, sem CSS file dedicado. Mistura de "tem CSS modular pra picker, mas overlay de imagem é estilo no JS". Inconsistência de regra interna.

Mesmo padrão em [OasisEditorView.ts:440-466](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L440-L466) — banner do editing mode tem 13 props inline.

### G10. `handle.innerHTML = "⠿"` em vez de `textContent`
[TableMoveHandle.ts:21](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/selection/TableMoveHandle.ts#L21) — caractere literal injetado via `innerHTML`. Funciona, mas é exatamente o vetor de XSS que se evita por convenção. Se alguém um dia parametrizar isso ("ícone customizado por tema"), vira injeção. Use `textContent`.

### G11. Querry-by-className em vez de cachear referência
[PageViewport.ts:96, 131](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/pages/PageViewport.ts#L96) — a cada `getOrCreateXxxOverlay()` faz `pageEl.querySelector(".oasis-selection-layer")`. Em uma página com 200 fragmentos, dispara em todo refresh. Manter o ref no `Map<pageId, container>` é O(1).

### G12. `dt.files` filtrado por `f.type.startsWith("image/")` aceita só uma imagem
[OasisEditorView.ts:333-336](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/app/OasisEditorView.ts#L333-L336) — `Array.from(dt.files).find(...)`. Drop de múltiplas imagens? Só insere a primeira. Se o usuário arrastar uma pasta? Comportamento indefinido.

### G13. Sem `interface CustomEventMap` para eventos do editor
Existem `image-resize-request`, `oasis-textinput`, etc. emitidos como `CustomEvent` puro. Sem augment do TS, todos chegam como `Event` e precisam ser cast manualmente em cada consumidor (ver G2).

### G14. Padrão "fallback se for ${chamada da função opcional}"
[OasisEditor.tsx:32](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/OasisEditor.tsx#L32) — `events.onPrint?.() || window.print()`. Se `onPrint()` retornar `undefined` (que é o que faria), **`window.print()` é chamado em sequência** — print duplicado. O operador `||` não é guarda contra "definido": é guarda contra falsy.

Mesmo bug em [MenuBar.tsx:70](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/MenuBar.tsx#L70).

### G15. `setTimeout(measureOverflow, 50)` em [Toolbar.tsx:86](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/src/ui/components/Toolbar.tsx#L86)
"Esperar 50ms pra medir layout porque às vezes o browser ainda não pintou" é o smell clássico de race condition. `requestAnimationFrame` ou `ResizeObserver` (que já existe ali!) deveria bastar.

### G16. Logger gateado mas com 7 chamadas no caminho quente
Mesmo com `OASIS_DEBUG` off, **a função é chamada e os argumentos são montados** (`text.substring(0, 50) + "..."`). O custo é menor que `console.log` mas não é zero. `if (DEBUG) Logger.log(...)` ou macro de build seria melhor.

### G17. `vite.log` no working tree (não versionado, mas frequentemente recriado)
[/vite.log](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/vite.log) — não rastreado pelo Git, mas aparece toda vez que o dev sobe o vite com redirecionamento. Não está em `.gitignore`, então uma hora alguém commita por engano.

### G18. `e2e-debug-final.png` versionado no repositório
[/e2e-debug-final.png](file:///media/celso/D20057C00057AA6D/Users/celso/Documents/projetos/oasis-editor/e2e-debug-final.png) — `git ls-files` confirma que está rastreado. Artefato de debug do Playwright nunca deveria estar no repo. Remover e adicionar `*-debug-*.png` no `.gitignore`.

### G19. `dist/` e `dist-app/` lado a lado na raiz
Dois diretórios de build separados sem README explicando a diferença. Inferir pelo nome. Se um dos dois é vestigial, está ocupando espaço; se ambos são válidos, falta documentação.

---

## Sugestão de prioridade revisada (maior ROI)

1. ⚠️ **Sanitizar links + adicionar `rel="noopener noreferrer"`** — rápido, fecha vetor XSS em aberto há um ciclo.
2. ⚠️ **Tipar operações** — substituir `op: any` nos 12 handlers por tipos union discriminados a partir de `OperationType`.
3. ⚠️ **Extrair CSS compartilhado dos pickers** — rápido, resolve duplicação de ~270 linhas.
4. ⚠️ **Implementar feedback de erro real em Import/Export** — UX hoje é “clica e nada acontece”.
5. ⚠️ **Remover `console.log` crus de `MenuBar.tsx` e `Logger.log`/`Logger.trace` do caminho quente.**
6. ⚠️ **Resolver TODO de range delete** em `handleDeleteText` (item 17) — risco de bug silencioso em produção.
7. ⚠️ **Consolidar `parseXml`** — trivial, alta clareza.
8. ⚠️ **Quebrar `OasisEditorView`/`Controller`** em subcomponentes coesos.
9. ⚠️ **Consolidar SolidJS renders** — unificar em um único app root com portals (mais esforço, mas mata bug-class inteiro).
