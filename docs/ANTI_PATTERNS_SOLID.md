# Relatório de Anti-Patterns e Violações SOLID — Oasis Editor

## Sumário Executivo

| Top problema | Impacto | Esforço |
|---|---:|---:|
| **`OasisEditorApp.tsx` é um "composition root" com lógica demais**: estado, histórico, layout, comandos, plugins, IO, clipboard, dialogs, context menu e renderização no mesmo componente. | Alto: qualquer feature toca um arquivo crítico de ~1.700 linhas e aumenta risco de regressão. | **L** |
| **Layout/paginação centralizado em `documentPagination.ts`**: texto, tabelas, headers/footers, footnotes, cache e paginação misturados. | Alto: difícil evoluir layout Word-like sem alterar função enorme e parâmetros longos. | **L/XL** |
| **Contratos de plugin inconsistentes**: interface permite hooks assíncronos, mas runtime rejeita ou ignora `Promise`. | Alto para extensibilidade pública: plugins válidos pelo tipo podem quebrar em runtime. | **M** |
| **Acoplamento de camadas e dependências concretas**: core acessa DOM em clipboard/parser HTML, export PDF depende de `ui/layoutProjection`, persistência usa singleton concreto. | Médio/alto: reduz testabilidade, SSR/worker e portabilidade. | **M/L** |
| **OCP fraco para novos tipos/formatos**: muitos `if (block.type === ...)`, `switch` de underline/list/field, comandos hardcoded e unions espalhadas. | Médio/alto: adicionar bloco/estilo/export novo exige shotgun surgery. | **M/L** |

---

## 1. Violações de SRP

### 1.1 `OasisEditorApp` concentra estado, wiring, comandos, IO, plugins e UI

- **`src/ui/OasisEditorApp.tsx:167-1721`** — componente principal com ~1.500 linhas de lógica após imports.
- Exemplos lidos:
  - Inicialização de estado/app: `createEditorAppState(props)` em **linhas 173-177**.
  - Histórico/transações/layout invalidation em **linhas 280-347**.
  - Instanciação de vários controllers em **linhas 377-539**.
  - Criação do plugin Essentials com dezenas de callbacks inline em **linhas 541-808**.
  - Registro de plugins/toolbar/menubar em **linhas 810-851**.
  - Clipboard programático/context menu em **linhas 1257-1416**.
  - Renderização completa e overlays em **linhas 1445-1721**.

**Por que viola SRP:** o componente é simultaneamente composition root, application service, command adapter, plugin adapter, controller de dialogs, controller de clipboard, controller de layout e view.

**Impacto:** alta chance de conflitos e regressões; features simples como novo comando, dialog, menu ou estado de toolbar exigem modificar o mesmo arquivo crítico.

**Refatoração sugerida:** extrair sem mudar arquitetura:
1. `useEditorRuntimePlugins(...)` para criar `essentialsPlugin`, `runtimeEditor`, registry de toolbar/menubar e cleanup.
2. `useEditorClipboardMenu(...)` para `programmaticCopy/Cut/Paste` e context menu.
3. `useFontDialogBridge(...)` para `openFontDialog` e `applyFontDialogValues`.
4. Deixar `OasisEditorApp` apenas como composition root fino.

---

### 1.2 `documentPagination.ts` mistura projeção de parágrafo, tabela, header/footer, footnote e paginação

- **`src/ui/layoutProjection/documentPagination.ts:37-49`** — constantes de fonte, página, tabela, footnote e grid no mesmo módulo.
- **`src/ui/layoutProjection/documentPagination.ts:103-197`** — `projectParagraphLayout` mede campos `PAGE/NUMPAGES`, cria fragments, mede linhas e cacheia.
- **`src/ui/layoutProjection/documentPagination.ts:439-635`** — cálculo de chrome, largura e altura de células/tabelas.
- **`src/ui/layoutProjection/documentPagination.ts:929-1048`** — footnote reservations e aplicação em páginas.
- **`src/ui/layoutProjection/documentPagination.ts:1140-1479`** — `projectBlocksLayout` pagina parágrafos e tabelas.
- **`src/ui/layoutProjection/documentPagination.ts:1481-1711`** — `projectDocumentLayout` resolve seções, headers/footers, footnotes e itera layout.

**Por que viola SRP:** um arquivo único cuida de medição, cache, paginação, tabelas, footnotes, headers/footers e adaptação legacy.

**Impacto:** evolução de uma parte do layout exige entender todas as outras; grande risco de bugs cruzados entre footnotes, tables e headers.

**Refatoração sugerida:** dividir em módulos pequenos mantendo API pública:
- `paragraphLayout.ts`: `projectParagraphLayout`, `estimateParagraphBlockHeight`.
- `tablePagination.ts`: altura/segmentação de tabelas.
- `footnoteLayout.ts`: reservations/aplicação.
- `sectionPagination.ts`: `projectDocumentLayout`.
- Manter `documentPagination.ts` como façade exportando os mesmos símbolos.

---

### 1.3 `CanvasEditorSurface.tsx` mistura componente Solid, scheduler RAF, canvas painter, cache de imagens, listas e tabela

- **`src/ui/components/CanvasEditorSurface.tsx:25-35`** — cache global de imagens.
- **`src/ui/components/CanvasEditorSurface.tsx:95-139`** — componente Solid projeta layout.
- **`src/ui/components/CanvasEditorSurface.tsx:141-407`** — `CanvasPage` gerencia RAF, canvas size, DPR, pintura de margens, header/body/footer/footnotes.
- **`src/ui/components/CanvasEditorSurface.tsx:409-505`** — renderização de blocos e footnotes.
- **`src/ui/components/CanvasEditorSurface.tsx:508-627`** — desenho de parágrafos, imagens, highlights, decorações.
- **`src/ui/components/CanvasEditorSurface.tsx:785-832`** — desenho de tabelas.
- **`src/ui/components/CanvasEditorSurface.tsx:890-1009`** — numeração de listas e conversores romano/alpha.

**Por que viola SRP:** a camada de view controla ciclo de pintura e contém lógica de domínio visual/listas.

**Impacto:** difícil testar renderização isoladamente; mudanças em lista, underline ou tabela exigem mexer no componente visual.

**Refatoração sugerida:** extrair painters puros:
- `CanvasPagePainter`
- `drawParagraph`
- `drawTable`
- `drawTextDecoration`
- `listNumbering.ts`

---

### 1.4 `useEditorTableOperations.ts` é um god hook/service de tabelas

- **`src/app/controllers/useEditorTableOperations.ts:67-1131`** — função única retorna mais de 30 operações.
- Mistura:
  - resolução de seleção de células em **linhas 80-216**;
  - ranges horizontais/verticais em **linhas 218-331**;
  - merge/split em **linhas 348-570**;
  - insert/delete row/column em **linhas 572-966**;
  - aplicação de comandos em multi-cell selection em **linhas 982-1064**.

**Por que viola SRP:** seleção, mutação estrutural, validação e aplicação transacional estão no mesmo módulo.

**Impacto:** operações de tabela ficam frágeis; qualquer mudança em span/merge/selection pode afetar comandos não relacionados.

**Refatoração sugerida:** já existem `tableOpsSelectionNavigation.ts`, `tableOpsMutationCommands.ts`, `tableOpsGuards.ts`; continuar a extração:
- `tableSelectionResolver.ts`
- `tableMergeSplitCommands.ts`
- `tableRowColumnCommands.ts`
- manter `createEditorTableOperations` como façade.

---

### 1.5 `FontDialog.tsx` mistura formulário, parsing, validação, preview e mapeamento para modelo

- **`src/ui/components/Dialogs/FontDialog.tsx:13-69`** — interfaces enormes de initial/apply values.
- **`src/ui/components/Dialogs/FontDialog.tsx:130-214`** — parsing e conversores CSS/OpenType.
- **`src/ui/components/Dialogs/FontDialog.tsx:223-504`** — estado, validação, preview e conversão final.
- **`src/ui/components/Dialogs/FontDialog.tsx:506-1269`** — JSX extenso dos dois tabs.

**Por que viola SRP:** componente visual conhece regras de conversão de OpenType, validação numérica, preview CSS e DTO de aplicação.

**Impacto:** evoluir UI ou modelo tipográfico acopla view e domínio.

**Refatoração sugerida:** extrair:
- `fontDialogModel.ts` com parsing/validation/DTO;
- `FontTab.tsx` e `AdvancedFontTab.tsx`;
- manter `FontDialog` como orquestrador visual.

---

### 1.6 `core/model.ts` mistura modelo, defaults, resolução de estilos, page geometry e índices

- **`src/core/model.ts:1-321`** — tipos de domínio.
- **`src/core/model.ts:390-447`** — defaults efetivos de texto/parágrafo.
- **`src/core/model.ts:449-557`** — resolução de estilos nomeados/efetivos.
- **`src/core/model.ts:673-787`** — page settings e geometria de página.
- **`src/core/model.ts:790-1092`** — seções, blocos, paragraph index/cache e table location.

**Por que viola SRP:** o módulo de modelo virou também query service, style resolver e layout/page utility.

**Impacto:** importações de `model.ts` viram dependência "universal"; mudanças pequenas em layout/estilo recompilam muitos consumidores.

**Refatoração sugerida:** separar sem alterar tipos:
- `model/types.ts`
- `model/styles.ts`
- `model/pageSettings.ts`
- `model/documentIndex.ts`
- manter `model.ts` reexportando para compatibilidade.

---

### 1.7 `core/commands/utils.ts` acumula clonagem, seleção, HTML, parsing DOM e navegação

- **`src/core/commands/utils.ts:58-160`** — clone/normalize.
- **`src/core/commands/utils.ts:248-348`** — substituição de parágrafos em blocos/seções/footnotes.
- **`src/core/commands/utils.ts:650-903`** — serialização HTML/CSS.
- **`src/core/commands/utils.ts:912-1164`** — parsing DOM/CSS de clipboard.
- **`src/core/commands/utils.ts:1188-1268`** — navegação vertical/horizontal.

**Por que viola SRP:** utilitário "catch-all" de comandos com responsabilidades não relacionadas.

**Impacto:** baixo isolamento; core de comandos passa a depender de DOM/HTML e de navegação.

**Refatoração sugerida:** dividir em `cloneUtils`, `selectionTransforms`, `htmlSerializer`, `htmlClipboardParser`, `navigationCommands`.

---

### 1.8 `useEditorDocumentIO.ts` mistura import/export, download DOM, progress, imagens e layout

- **`src/app/controllers/useEditorDocumentIO.ts:18-23`** — importa export DOCX/PDF, import worker, UI geometry e file reader.
- **`src/app/controllers/useEditorDocumentIO.ts:39-48`** — mapa de progresso por fase.
- **`src/app/controllers/useEditorDocumentIO.ts:89-96`** — cria `<a>` para download.
- **`src/app/controllers/useEditorDocumentIO.ts:182-232`** — lê arquivo, base64, `new Image()`, calcula tamanho e insere imagem.
- **`src/app/controllers/useEditorDocumentIO.ts:242-250`** — export DOCX/PDF.

**Por que viola SRP:** IO documental, UI/browser download, progress e inserção de imagem estão acoplados.

**Impacto:** difícil testar sem browser; inserir imagem arrasta dependências de export/import.

**Refatoração sugerida:** extrair serviços simples:
- `DocumentExporter`
- `DocumentImporter`
- `ImageInsertionService`
- `downloadBlob` injetável.

---

## 2. Violações de OCP

### 2.1 Type-tagging repetido em `EditorBlockNode`

- **`src/core/model.ts:216`** — `EditorBlockNode = EditorParagraphNode | EditorTableNode`.
- Exemplos de branches por tipo:
  - **`src/core/model.ts:845-850`** — `getBlockParagraphs` decide paragraph/table.
  - **`src/core/model.ts:936-974`** — `getDocumentParagraphIndex` repete loops para paragraph/table em header/main/footer.
  - **`src/export/docx/exportEditorDocumentToDocx.ts:263-281`** — export DOCX alterna table/paragraph.
  - **`src/ui/components/CanvasEditorSurface.tsx:421-438`** — render alterna paragraph/table.
  - **`src/ui/layoutProjection/documentPagination.ts:1200-1348`** — pagination alterna paragraph/table.

**Por que viola OCP:** adicionar um novo tipo de bloco exigirá editar model, layout, canvas, export DOCX/PDF, clipboard e comandos.

**Impacto:** shotgun surgery e risco alto de comportamento inconsistente entre render/export/import.

**Refatoração sugerida:** criar registry/visitor por tipo de bloco:
```ts
interface BlockHandler {
  type: EditorBlockNode["type"];
  collectParagraphs(block): EditorParagraphNode[];
  projectLayout(...): EditorLayoutBlock[];
  renderCanvas(...): void;
  exportDocx(...): string;
}
```
Começar só com helper `visitBlock(block, handlers)` para reduzir branches duplicados.

---

### 2.2 Funções de layout têm extensão por alteração, não por composição

- **`src/ui/layoutProjection/documentPagination.ts:1140-1153`** — `projectBlocksLayout` recebe muitos parâmetros e implementa fluxo único.
- **`src/ui/layoutProjection/documentPagination.ts:1481-1487`** — `projectDocumentLayout` mistura overload legacy com documento completo.
- **`src/ui/layoutProjection/documentPagination.ts:1671-1697`** — footnotes são acopladas ao loop de paginação.

**Por que viola OCP:** novas regras de paginação exigem editar a função central em vez de plugar uma etapa.

**Impacto:** regras Word-like acumulam condicionais e parâmetros opcionais.

**Refatoração sugerida:** pipeline simples:
1. `projectSections`
2. `applyHeadersFooters`
3. `paginateBlocks`
4. `applyFootnotes`
5. `resolveTotalPagesFields`

---

### 2.3 Mapeamentos de estilos tipográficos duplicados/hardcoded

- Underline:
  - **`src/core/commands/utils.ts:746-771`** — `underlineStyleToCssDecorationStyle`.
  - **`src/ui/components/CanvasEditorSurface.tsx:699-766`** — `drawUnderlineWithStyle`.
  - **`src/export/pdf/draw/drawFragment.ts:136-169`** — underline PDF.
  - **`src/export/docx/textXml.ts:189`** — DOCX usa `underlineStyle ?? "single"`.
- Ligatures/numeric:
  - **`src/core/commands/utils.ts:773-814`** — CSS.
  - **`src/ui/components/Dialogs/FontDialog.tsx:172-214`** — preview CSS.
  - **`src/export/docx/textXml.ts:52-96`** — DOCX.

**Por que viola OCP:** nova opção tipográfica exige modificar múltiplos switches/helpers.

**Impacto:** inconsistência entre UI, canvas, clipboard, PDF e DOCX.

**Refatoração sugerida:** criar `src/core/textStyleMapping.ts` com tabela canônica:
```ts
const UNDERLINE_RENDERING = {
  double: { css: "double", pdfDash: null, canvas: ... },
  dotted: { css: "dotted", pdfDash: [1.5, 2.5] },
};
```

---

### 2.4 Comandos/toolbar/menus internos são hardcoded no Essentials

- **`src/plugins/internal/createEssentialsPlugin.ts:4-116`** — `EssentialsPluginDeps` lista dezenas de operações concretas.
- **`src/plugins/internal/createEssentialsPlugin.ts:177-426`** — todos os comandos são registrados manualmente em um objeto gigante.
- **`src/ui/OasisEditorApp.tsx:541-808`** — implementação inline de todos os callbacks do Essentials.

**Por que viola OCP:** adicionar/remover comandos internos exige alterar a interface de deps, a implementação do plugin e o app.

**Impacto:** dificulta plugins menores e composição incremental.

**Refatoração sugerida:** agrupar deps por capability (`history`, `formatting`, `paragraph`, `table`, `io`) e permitir contribuições parciais.

---

### 2.5 Keyboard handling ainda tem switch central para teclas

- **`src/app/controllers/useEditorKeyboard.ts:238-335`** — `switch (event.key)` para Backspace/Delete/Tab/Arrows.
- **`src/app/controllers/EditorCommandRegistry.ts:65-286`** — keybindings default hardcoded em array.

**Por que viola OCP:** novos comportamentos de tecla exigem editar controlador central ou array default interno.

**Impacto:** conflitos de keymap e customização limitada.

**Refatoração sugerida:** migrar gradualmente os casos do `switch` para `EditorCommandRegistry`, com prioridades e predicates.

---

## 3. Violações de LSP

### 3.1 Interface de plugin permite async, runtime rejeita/ignora async

- **`src/core/plugin.ts:72-75`**:
  - `init?: (editor) => void | Promise<void>`
  - `afterInit?: ... Promise<void>`
  - `destroy?: ... Promise<void>`
- **`src/core/plugins/PluginCollection.ts:85-88`** — lança erro se `afterInit` retorna Promise.
- **`src/core/plugins/PluginCollection.ts:106-108`** — lança erro se `init` retorna Promise.
- **`src/core/plugins/PluginCollection.ts:126-130`** — chama `destroy?.(...)` sem aguardar Promise.
- **`src/core/pluginHost.ts:25-34`** — `PluginHost` chama `init/install/afterInit` sem validação/await.

**Por que viola LSP:** um plugin que obedece ao tipo `OasisPlugin` retornando `Promise<void>` não é substituível no runtime síncrono.

**Impacto:** extensibilidade pública enganosa; plugin válido por TypeScript falha em execução.

**Refatoração sugerida:** escolher um contrato:
- Simples: tornar hooks estritamente síncronos na interface.
- Ou: tornar `PluginCollection.initializeAll()` async e o bootstrap aguardar.

---

### 3.2 `canExecute` aceita payload no contrato, mas implementação ignora

- **`src/core/plugin.ts:35-36`** — `execute(name, payload?)` e `canExecute(name, payload?)`.
- **`src/core/Editor.ts:66-75`** — `canExecute(name, _payload?)` ignora payload e chama só `command.refresh()`.
- **`src/app/controllers/EditorCommandRegistry.ts:46-52`** — keybinding checa `canExecuteCommand?.(binding.command)` sem payload.

**Por que viola LSP:** consumidores podem esperar que comandos payload-dependent sejam validados com payload, mas o runtime não preserva esse contrato.

**Impacto:** comandos como `insertTable` ou value commands podem parecer executáveis mesmo com payload inválido.

**Refatoração sugerida:** ou remover payload de `canExecute`, ou permitir `refresh(payload)`/`canExecute(payload)` no comando.

---

### 3.3 `EditorSurfaceProps` promete callbacks que o renderer canvas não usa

- **`src/ui/editorUiTypes.ts:61-96`** — `EditorSurfaceProps` inclui callbacks de paragraph/image/table/revision.
- **`src/ui/components/CanvasEditorSurface.tsx:125-132`** — `CanvasPage` recebe apenas `onSurfaceMouseDown`, `onSurfaceClick`, `onSurfaceMouseMove`, `onSurfaceDblClick`.
- **`src/ui/OasisEditorEditor.tsx:230-246`** — repassa muitos callbacks para `CanvasEditorSurface`.

**Por que é um problema substitutivo:** um "surface" que recebe `EditorSurfaceProps` parece suportar eventos de imagem/tabela/revisão, mas o canvas surface ignora parte do contrato.

**Impacto:** novas implementações de surface ou handlers podem não funcionar sem erro de tipo.

**Refatoração sugerida:** separar `CanvasSurfaceProps` de `DomSurfaceProps`, ou dividir eventos por capability.

---

## 4. Violações de ISP

### 4.1 `OasisEditorAppProps` é ampla demais

- **`src/ui/OasisEditorApp.tsx:138-165`** — props misturam chrome, shell, locale, viewport, state, persistence, layout, loading, plugins e toolbar customization.

**Por que viola ISP:** consumidores que só querem montar o editor veem uma API única com muitas preocupações.

**Impacto:** API pública cresce sem agrupamento; opções relacionadas ficam soltas.

**Refatoração sugerida:** agrupar em:
```ts
ui?: { showChrome; shell; variant; titleBar; menubar; toolbar; outline }
document?: { initialDocument; initialState; onStateChange }
runtime?: { plugins; persistenceEnabled; layoutMode }
```
Mantendo props antigas como aliases temporários.

---

### 4.2 `OasisEditorEditorProps` é uma interface fat de view + controller

- **`src/ui/OasisEditorEditor.tsx:20-94`** — dezenas de accessors, refs e callbacks.
- Exemplos:
  - estado/layout/selection em **linhas 21-31**;
  - import/toolbar/persistence em **linhas 32-47**;
  - refs em **linhas 52-56**;
  - eventos de drag/mouse/input/clipboard em **linhas 57-93**.

**Por que viola ISP:** o componente recebe callbacks de muitas features mesmo quando só renderiza alguns overlays.

**Impacto:** qualquer mudança em input/drag/import altera assinatura do componente editor.

**Refatoração sugerida:** agrupar props:
- `layout`
- `overlays`
- `refs`
- `inputHandlers`
- `surfaceHandlers`
- `fileHandlers`

---

### 4.3 `EssentialsPluginDeps` exige quase todo o app

- **`src/plugins/internal/createEssentialsPlugin.ts:4-116`** — deps incluem seleção, estilo, histórico, IO, link, imagem, parágrafo, seção e tabela.

**Por que viola ISP:** o plugin Essentials depende de capacidades demais; é difícil usar só uma parte.

**Impacto:** acoplamento alto entre UI app e plugin; comandos internos não são modularizáveis.

**Refatoração sugerida:** quebrar em plugins menores:
- `HistoryPlugin`
- `TextFormattingPlugin`
- `ParagraphPlugin`
- `TablePlugin`
- `DocumentIOPlugin`

---

### 4.4 `EditorKeyboardDeps` é um objeto de dependências grande e heterogêneo

- **`src/app/controllers/useEditorKeyboard.ts:32-79`** — inclui estado, readOnly, comandos, seleção, history, navigation, table navigation, find/replace, command registry bridge.

**Por que viola ISP:** keyboard controller conhece operações de todas as features.

**Impacto:** atalhos novos aumentam a interface; testes precisam mockar muitas funções.

**Refatoração sugerida:** usar registry de keybindings com handlers que recebem apenas `KeyboardContext`, ou subcontextos (`navigation`, `editing`, `commands`, `history`).

---

### 4.5 `FontDialogInitialValues`/`ApplyValues` são DTOs gigantes

- **`src/ui/components/Dialogs/FontDialog.tsx:13-69`** — 25+ campos duplicados entre initial/apply.

**Por que viola ISP:** callers precisam entender todos os campos mesmo aplicando poucos.

**Impacto:** adicionar uma propriedade tipográfica altera dialog, app, toolbar, command e export mappings.

**Refatoração sugerida:** usar `Partial<EditorTextStyle>` para valores aplicados e manter estado interno específico do dialog.

---

## 5. Violações de DIP

### 5.1 Persistência depende de singleton concreto

- **`src/app/controllers/useEditorPersistence.ts:3`** — importa `persistenceService` concreto.
- **`src/app/services/PersistenceService.ts:53`** — exporta singleton `new PersistenceService()`.
- **`src/app/services/PersistenceService.ts:4-7`** — DB/store/key/version hardcoded.

**Por que viola DIP:** controller de alto nível depende de implementação IndexedDB concreta.

**Impacto:** testes e ambientes alternativos precisam mockar módulo; difícil trocar storage.

**Refatoração sugerida:** injetar interface:
```ts
interface DocumentPersistence {
  saveDocument(doc): Promise<void>;
  loadDocument(): Promise<EditorDocument | null>;
}
```

---

### 5.2 Core de clipboard depende de DOM/browser

- **`src/core/commands/clipboard.ts:62-68`** — `parseEditorClipboardHtml` checa `document` e cria `<template>`.
- **`src/core/commands/clipboard.ts:86-109`** — usa `Node.TEXT_NODE`, `Node.ELEMENT_NODE`, `Element`.
- **`src/core/commands/utils.ts:912-913`** — `parseInlineStyles(element: Element)` faz cast para `HTMLElement`.
- **`src/core/commands/utils.ts:1098-1099`** — `parseParagraphStyle(element: Element)` depende de `HTMLElement.style`.

**Por que viola DIP:** camada `core` depende diretamente de DOM; o domínio não fica independente de ambiente.

**Impacto:** uso em worker/Node/SSR fica limitado; testes de core precisam DOM.

**Refatoração sugerida:** mover parsing HTML para `app`/`ui/clipboard` e fazer core receber `EditorClipboardParagraphSpec[]`.

---

### 5.3 Plugin Essentials depende de globais browser

- **`src/plugins/internal/createEssentialsPlugin.ts:266-269`**:
  - `window.print()`
  - `document.execCommand("copy")`

**Por que viola DIP:** plugin de comando depende de `window/document` diretamente.

**Impacto:** quebra em ambientes não-browser; difícil testar.

**Refatoração sugerida:** injetar `browserActions: { print(); copy(); }` ou mover para adapter de UI.

---

### 5.4 Export PDF depende de módulo UI

- **`src/export/pdf/exportEditorDocumentToPdf.ts:9`** — importa `FOOTNOTE_MARKER_GUTTER_PX` e `projectDocumentLayout` de `../../ui/layoutProjection.js`.

**Por que viola DIP/camadas:** export deveria depender de layout/core abstrato, não de `ui`.

**Impacto:** export PDF acopla pipeline de export ao renderer UI; mudanças de UI podem afetar export.

**Refatoração sugerida:** mover layout projection para `core/layout` ou `layout/` compartilhado, e deixar UI/PDF dependerem dele.

---

### 5.5 `Editor` core depende de Solid store e `any`

- **`src/core/Editor.ts:1`** — importa `createStore` de `solid-js/store`.
- **`src/core/Editor.ts:15-16`** — `private stateStore: EditorState; private setState: any`.
- **`src/core/Editor.ts:26-30`** — cria store Solid e `PluginCollection`.

**Por que viola DIP:** runtime core depende de framework reativo específico.

**Impacto:** `Editor` não é um core puro; difícil reutilizar em wrappers não-Solid sem carregar Solid.

**Refatoração sugerida:** aceitar `stateAdapter` injetável ou usar estado simples no core e adaptar reatividade na UI.

---

### 5.6 `OasisEditorApp` cria runtime concreto em vez de receber abstração

- **`src/ui/OasisEditorApp.tsx:815-818`** — `const runtimeEditor = new Editor(...)`.
- **`src/ui/OasisEditorApp.tsx:541-808`** — cria `EssentialsPlugin` diretamente.

**Por que viola DIP:** UI app depende diretamente da implementação de editor/plugin interno.

**Impacto:** difícil testar runtime isolado e trocar command engine.

**Refatoração sugerida:** criar `createEditorRuntime(...)` fora do componente e injetar/adaptar no app.

---

## 6. Outros Anti-Patterns

### 6.1 God Objects/Hooks

| Arquivo | Evidência |
|---|---|
| **`src/ui/OasisEditorApp.tsx:167-1721`** | God component/composition root com estado, controllers, plugins, clipboard, dialogs, overlays. |
| **`src/ui/layoutProjection/documentPagination.ts:37-1711`** | God file de layout/paginação. |
| **`src/ui/components/CanvasEditorSurface.tsx:95-1009`** | Componente + painter + list numbering + cache + tabelas. |
| **`src/app/controllers/useEditorTableOperations.ts:67-1131`** | God hook/service de tabelas. |
| **`src/ui/components/Dialogs/FontDialog.tsx:223-1269`** | Dialog monolítico com dois tabs e regras. |
| **`src/core/model.ts:1-1092`** | Tipos + queries + defaults + style resolution + page geometry. |
| **`src/core/commands/utils.ts:58-1268`** | Utilitário guarda-chuva de comandos, HTML, DOM, navegação. |

---

### 6.2 Long Parameter Lists / Data Clumps

- **`src/ui/layoutProjection/documentPagination.ts:1140-1153`** — `projectBlocksLayout` tem 13 parâmetros, muitos opcionais correlacionados (`measuredHeights`, `measuredParagraphLayouts`, `styles`, `pageOffset`, `totalPages`, `existingPages`, `layoutMode`, `measurer`, `reservedHeightByPageIndex`).
- **`src/ui/layoutProjection/documentPagination.ts:103-111`** — `projectParagraphLayout` tem 8 parâmetros.
- **`src/ui/components/CanvasEditorSurface.tsx:785-796`** — `drawTable` recebe 11 parâmetros.
- **`src/export/pdf/exportEditorDocumentToPdf.ts:107-118`** — `drawFootnoteBlockList` recebe 11 parâmetros.
- **`src/app/controllers/useEditorTableResize.ts:18-33`** — estado `resizing` contém muitos campos opcionais dependentes de `type`.
- **`src/ui/OasisEditorEditor.tsx:20-94`** — props com dezenas de callbacks/accessors.

**Sugestão:** converter para objetos de contexto nomeados (`LayoutContext`, `PageProjectionContext`, `CanvasDrawContext`, `ResizeState` discriminado).

---

### 6.3 Magic Numbers / Strings

Exemplos representativos:

- **Layout/paginação**
  - `DEFAULT_FONT_SIZE = 15`, `DEFAULT_PAGE_HEIGHT = 920`, `FOOTNOTE_SEPARATOR_HEIGHT = 10`, `MAX_FOOTNOTE_LAYOUT_ITERATIONS = 4` em **`documentPagination.ts:37-49`**.
  - `FAST_IMPLICIT_DOC_GRID_RATIO = 0.86` em **`documentPagination.ts:45`**.
- **Canvas**
  - DPR via `window.devicePixelRatio || 1` em **`CanvasEditorSurface.tsx:197`**.
  - alphas hardcoded para zonas em **`CanvasEditorSurface.tsx:246-250`**.
  - dimensões de guias e linhas em **`CanvasEditorSurface.tsx:326-331`**, **linhas 774-776**.
- **UI/editor**
  - viewport default `"min(72vh, 920px)"` em **`OasisEditorEditor.tsx:102-103`**.
  - status zoom fixo `100%` em **`OasisEditorEditor.tsx:548-550`**.
- **Eventos**
  - double/triple click: `450` ms e `6` px em **`useEditorSurfaceEvents.ts:263-266`**.
- **Import progress**
  - ranges hardcoded em **`useEditorDocumentIO.ts:39-48`**.
- **Tabelas resize**
  - thresholds/min sizes em **`useEditorTableResize.ts:79-87`**.

**Sugestão:** agrupar em `layoutConstants`, `interactionConstants`, `tableResizeConstants`, com comentários de origem/calibração.

---

### 6.4 Primitive Obsession

- IDs como strings com prefixos:
  - **`src/core/editorState.ts:51-57`** — `run:${nextRunId}`.
  - **`src/core/editorState.ts:71-78`** — `paragraph:${nextParagraphId}`.
  - **`src/core/editorState.ts:133-141`** — `table:${nextTableId}`.
  - **`src/core/commands/utils.ts:496`** — `run:${Math.random()...}`.
- Dimensões como `number | string`:
  - **`src/core/model.ts:166`** — `EditorTableCellStyle.width?: number | string`.
  - **`src/core/model.ts:190`** — `EditorTableRowStyle.height?: number | string`.
  - **`src/core/model.ts:202`** — `EditorTableStyle.width?: number | string`.
- Cores como `string` em vários estilos:
  - **`src/core/model.ts:49-50`**, **`src/core/model.ts:158-162`**.
- Comandos como strings:
  - **`src/plugins/internal/createEssentialsPlugin.ts:177-426`**.
  - **`src/app/controllers/EditorCommandRegistry.ts:65-286`**.

**Impacto:** validação espalhada e casts frequentes.

**Sugestão:** introduzir tipos leves/brands só onde dói: `EditorId`, `CssColor`, `LengthPt | LengthPercent`, `CommandName`.

---

### 6.5 Switch/Type-tagging Smells

- **`src/export/pdf/OasisPdfWriter.ts:173-180`** — `switch (resource.kind)`.
- **`src/core/footnotes.ts:115-132`** — `switch (format)`.
- **`src/core/commands/utils.ts:749-770`** — underline para CSS.
- **`src/core/commands/utils.ts:773-788`** — ligatures para CSS.
- **`src/ui/components/CanvasEditorSurface.tsx:709-759`** — underline canvas.
- **`src/ui/components/CanvasEditorSurface.tsx:936-948`** — list ordinal format.
- **`src/app/controllers/useEditorKeyboard.ts:238-335`** — `switch (event.key)`.
- Vários `if (block.type === "paragraph") / "table"` em model/export/canvas/layout.

**Sugestão:** para enums estáveis e pequenos, switches são aceitáveis; para block rendering/export/layout, preferir visitor/registry.

---

### 6.6 Vazamento de Camadas

- **Core → DOM**
  - **`src/core/commands/clipboard.ts:62-68`** — usa `document.createElement`.
  - **`src/core/commands/utils.ts:912-913`**, **1098-1099** — casts para `HTMLElement`.
- **Export → UI**
  - **`src/export/pdf/exportEditorDocumentToPdf.ts:9`** — usa `../../ui/layoutProjection.js`.
- **Plugin → Browser global**
  - **`src/plugins/internal/createEssentialsPlugin.ts:266-269`** — `window.print()` e `document.execCommand`.
- **App controller → UI**
  - **`src/app/controllers/useEditorDocumentIO.ts:22-23`** — importa `../../ui/imageGeometry.js` e `../../ui/clipboardImage.js`.

**Sugestão:** mover adapters DOM para `ui`/`app`, e layout compartilhado para `core/layout` ou `layout/`.

---

### 6.7 Uso de `any` / Type Assertions

Exemplos de produção encontrados:

- **`src/core/Editor.ts:16`** — `private setState: any`.
- **`src/core/model.ts:319`** — metadata index `[key: string]: any`.
- **`src/core/model.ts:390-418`** e **422-445** — `undefined as unknown as ...` nos defaults.
- **`src/core/engine.ts:13`** — `resolveRenderedLineHeightPx(styles: any, ...)`.
- **`src/core/commands/table.ts:422`** — `const nextStyle = { ...(table.style ?? {}) } as any`.
- **`src/app/controllers/EditorCommandsController.ts:65`** — `selectedImageRun: () => any`.
- **`src/app/controllers/useEditorKeyboard.ts:59`** — `selectedImageRun: () => any`.
- **`src/app/controllers/useEditorTableOperations.ts:373`, `428-430`, `538`** — casts `cell: any`, `paragraph: any`.
- **`src/import/docx/paragraphs.ts:50`** — propriedade transiente `__importedFootnoteRef` via `as any`.
- **`src/import/docx/importDocxToEditorDocument.ts:288`** — `(doc as any).sections = sections`.
- **`src/import/docx/importDocxToEditorDocument.ts:331-335`** — lê/deleta `__importedFootnoteRef` via `as any`.
- **`src/ui/OasisEditorEditor.tsx:499`, `565`** — `t(... as any)`.
- **`src/utils/performanceMetrics.ts:224`, `268`** — `(window as any).__OASIS_*`.

**Sugestão:** criar tipos específicos:
- `SelectedImageRun`
- `ImportedFootnoteRefRun extends EditorTextRun`
- `WindowWithOasisDebug`
- `MetadataValue = string | number | boolean | null | ...`

---

### 6.8 Duplicação

- Resolução/serialização de underline e OpenType duplicada entre clipboard, FontDialog, canvas, PDF e DOCX:
  - `utils.ts:746-814`
  - `FontDialog.tsx:172-214`
  - `CanvasEditorSurface.tsx:699-766`
  - `drawFragment.ts:136-169`
  - `textXml.ts:52-96`
- Conversão de medidas `pt/px` duplicada:
  - **`documentPagination.ts:507-531`** — parse row height.
  - **`useEditorTableResize.ts:96-124`** — parse size to pt.
  - **`core/commands/table.ts:318-344`** — parse width to pt.
- Lógica de `resolveTableCellRangeSelection`/seleção de células aparece em:
  - **`useEditorTableOperations.ts:80-216`**
  - **`core/commands/table.ts:31-123`**

**Sugestão:** centralizar `lengthUnits.ts`, `textStyleMappings.ts`, `tableSelection.ts`.

---

### 6.9 Mutação de Estado Compartilhado / Side Effects

- Caches globais:
  - **`CanvasEditorSurface.tsx:25`** — `imageCache`.
  - **`CanvasEditorSurface.tsx:890`** — `listOrdinalsCache`.
  - **`documentPagination.ts:79-83`** — WeakMaps de cache de parágrafo.
  - **`documentPagination.ts:538-541`** — cache de geometria de tabela.
  - **`model.ts:916-917`** — caches de índice/parágrafos.
- IDs globais mutáveis:
  - **`editorState.ts:33-39`** — counters globais.
  - **`footnotes.ts:12-21`** — counter global adicional de footnotes.
- Mutação de clones/estruturas:
  - **`useEditorTableOperations.ts:376`** — `row.cells.splice(...)`.
  - **`useEditorTableOperations.ts:432-438`** — atribui células/placeholder.
  - **`useEditorTableOperations.ts:742`** — `tableBlock.rows.splice(...)`.
  - **`core/commands/table.ts:742`**, **847-852**, **947-948** — splices/atribuições em tabelas.
- Side effects browser:
  - **`useEditorTableResize.ts:602-624`**, **678-680**, **869-873** — altera `document.body` e listeners globais.
  - **`useEditorImageOperations.ts:200-211`**, **221-232**, **422-467** — injeta `<style>`, altera cursor e listeners globais.

**Impacto:** caches dependem de identidade imutável; mutar objetos errados pode gerar cache stale.

**Sugestão:** documentar invariantes e isolar mutações em helpers de clone/mutation bem testados.

---

### 6.10 TODOs/FIXMEs/HACKs encontrados

- Grep case-sensitive por `TODO|FIXME|HACK` em `src/` **não encontrou ocorrências exatas** em produção.
- Há comentários de futuro sem marcador TODO, por exemplo:
  - **`src/core/model.ts:294-297`** — "Fase futura" em separator/continuation separator de footnotes.

---

### 6.11 Outros

#### Código morto / API duplicada

- **`src/core/pluginHost.ts:3-56`** — `PluginHost` exportado mas grep encontrou apenas a própria definição; runtime atual usa `PluginCollection`.
- **`src/app/controllers/useEditorTableOperations.ts:1082-1092`** — `tableSelectionLabel`, `isInsideTable`, `tableActionRestrictionLabel` retornam sempre `null`/`false` e só são retornadas pela façade.

**Sugestão:** remover se realmente não usados, ou implementar/ligar à UI.

#### Logging direto em core

- **`src/core/commands/block.ts:12`, `41`, `52`, `69`, `94`, `101`** — `console.log/error/warn`.
- **`src/core/commands/table.ts:253-260`, `279-282`, `346-353`, `404-406`, `425-427`** — logs diretos em comandos.
- **`src/app/controllers/useEditorPersistence.ts:35`, `67`** — `console.error` direto.

**Sugestão:** usar `EditorLogger` injetado ou remover logs de debug do core.

---

## 7. Recomendações Priorizadas

| Problema | Prioridade | Esforço | Benefício |
|---|---:|---:|---|
| Extrair runtime/plugins/clipboard/font-dialog bridge de `OasisEditorApp.tsx` | P0 | L | Reduz risco em arquivo central e facilita novas features. |
| Corrigir contrato de plugin async vs sync | P0 | M | Evita quebra de plugins válidos por tipo. |
| Mover parsing DOM de clipboard para `app/ui`, deixando core receber specs | P1 | M | Melhora testabilidade e separação de camadas. |
| Separar `documentPagination.ts` em façade + módulos de parágrafo/tabela/footnote/seção | P1 | L/XL | Layout fica evolutivo e menos arriscado. |
| Criar `textStyleMappings.ts` compartilhado | P1 | M | Remove duplicação em UI/canvas/PDF/DOCX. |
| Quebrar `useEditorTableOperations.ts` em seleção/merge-split/row-column | P1 | L | Reduz complexidade de tabelas. |
| Tipar `SelectedImageRun`, `WindowWithOasisDebug`, transient DOCX ref | P2 | S/M | Reduz `any` e bugs silenciosos. |
| Injetar `PersistenceService` no hook | P2 | S/M | Facilita testes e troca de storage. |
| Trocar long parameter lists por context objects | P2 | M | Melhora legibilidade sem mudança funcional. |
| Remover `PluginHost` e stubs de tabela se não usados | P3 | S | Limpa código morto. |
| Consolidar magic numbers em constants por domínio | P3 | S/M | Melhora manutenção e documentação de calibração. |

---

## 8. Próximos Passos Sugeridos

1. **Correção rápida P0/P1**
   - Ajustar `OasisPlugin` para hooks síncronos ou tornar `PluginCollection` async.
   - Remover/encapsular `any` mais arriscados (`selectedImageRun`, transient footnote ref, `setState`).
   - Trocar logs diretos em core por logger ou remover.

2. **Redução de risco incremental**
   - Extrair `useEditorRuntimePlugins` de `OasisEditorApp.tsx` sem mudar comportamento.
   - Extrair `useEditorContextMenuClipboard`.
   - Extrair `fontDialogModel.ts` com conversão initial/apply.

3. **Separação de camadas**
   - Mover parsing HTML/DOM de `core/commands/clipboard.ts` e `core/commands/utils.ts` para adapter de clipboard em `app/ui`.
   - Mover `ui/layoutProjection` para um módulo compartilhado fora de `ui` para o export PDF.

4. **Preparar extensibilidade**
   - Criar um visitor/registry simples para `EditorBlockNode`.
   - Centralizar mapeamentos tipográficos e unidades.

5. **Depois que os módulos estiverem menores**
   - Dividir `documentPagination.ts`.
   - Dividir `CanvasEditorSurface.tsx` em painters.
   - Dividir `useEditorTableOperations.ts` em serviços menores.
