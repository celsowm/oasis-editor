# Auditoria de anti-patterns e SOLID — Oasis Editor

> Auditoria refeita em 2026-06-20 sobre o commit `8faf07ed7485ee2aae5a65169f2cb0d247983a77`.
> O inventário contém 446 arquivos TypeScript/TSX em `src/`. As linhas citadas
> correspondem a esse commit. Tamanho de arquivo foi usado como sinal, não como
> prova isolada de problema arquitetural.

## Sumário executivo

Os riscos mais importantes não estão concentrados em um único “god file”. O
problema dominante é o compartilhamento implícito entre instâncias: locale,
geradores de IDs e persistência default vivem em estado de módulo. Em uma página
com dois editores, uma instância pode alterar idioma, sequência de IDs ou
documento persistido da outra.

O segundo grupo de risco são dez componentes fortemente conexos no grafo de
imports. O maior ciclo atravessa `core`, o contrato de plugins, o command bus e o
schema da toolbar. Há ainda ciclos independentes no canvas, nos renderizadores
PDF, nos serializadores DOCX e no parser DOCX. Eles tornam inicialização, testes e
extrações sensíveis à ordem dos módulos.

O terceiro grupo é a concentração de wiring em `OasisEditorApp.tsx` e o uso de
interfaces de dependências muito largas. Extrações anteriores reduziram o
componente, mas ele voltou a 1.001 linhas, possui 56 imports internos e continua
criando ou conectando a maior parte dos controllers do produto.

### Ranking por impacto e esforço

| ID  | Achado confirmado                                                   | Prioridade |                Impacto | Esforço |
| --- | ------------------------------------------------------------------- | ---------: | ---------------------: | ------: |
| G1  | ~~Locale global compartilhado por todas as instâncias~~ ✅ resolvido |          — |                      — |       — |
| G2  | ~~Três geradores globais e independentes de IDs~~ ✅ resolvido       |          — |                      — |       — |
| D1  | ~~`core/plugin.ts` depende de UI e ciclo de 7 módulos~~ ✅ resolvido |          — |                      — |       — |
| D2  | ~~Ciclos nos pipelines canvas, PDF, DOCX export e DOCX import~~ ✅ resolvido |     — |                      — |       — |
| S1  | Composition root com lógica operacional 🟢 lógica extraída em 4 fases (892→471); falta só bundles de view (ver I1) | Baixa | Médio | M |
| D3  | ~~Persistência default é singleton com chave fixa~~ ✅ resolvido     |          — |                      — |       — |
| C1  | ~~Contratos de command bus têm tipagem e `refresh` inconsistentes~~ ✅ resolvido (L2 runtime + `TypedCommandBus`) | — |        — |       — |
| I1  | Dependency bags de 17–38 membros e props drilling                   |      Média |             Médio/alto |       M |
| O1  | Runs são um optional-property bag; 227 decisões por variante 🟡 base feita (getRunKind/visitRun); falta a união discriminada |      Média | Médio/alto |       L |
| O2  | ~~Dispatch de blocos com fallthrough silencioso~~ ✅ resolvido (visitors exaustivos + `assertNever`) | — |             — |       — |
| S2  | ~~Hotspots de paginação, DOCX, texto e snapshot acumulam papéis~~ ✅ resolvido |      — |             — |    — |
| B1  | ~~Barrel `editorCommands.ts` deprecated com 22 consumidores~~ ✅ resolvido |     — |                  — |       — |
| F1  | Bridge de propriedades de tabela conhece e transforma o domínio     |      Média |                  Médio |       M |
| P1  | IDs, nomes de comando e merge keys são `string` intercambiáveis     |      Baixa |                  Médio |       M |
| U1  | ~~Constantes de unidade duplicadas entre camadas~~ ✅ resolvido      |          — |                      — |       — |
| N1  | Footnotes e endnotes repetem aproximadamente 76% da estrutura       |      Baixa |                  Médio |       M |

## Metodologia e limites

- O grafo considerou imports e reexports relativos e imports `@/`, resolvendo
  `.js` para os fontes `.ts`/`.tsx` correspondentes.
- Um ciclo só foi registrado quando as arestas de import existem nos dois
  sentidos dentro de um componente fortemente conexo.
- Foram inspecionados fan-in, fan-out, interfaces largas, listas longas de
  parâmetros, estado mutável em módulo, singletons exportados e branches por
  tipo de bloco/run.
- Não foram adicionadas dependências de análise. A inspeção usou o TypeScript já
  instalado, buscas textuais e leitura manual dos fluxos.
- Métricas são indicadores. Cada classificação abaixo inclui uma consequência
  concreta no código atual.

## Violações SOLID confirmadas

### SRP — Single Responsibility Principle

#### S1. `OasisEditorApp` mistura composição e operação

> **🟡 Chrome extraído (Onda 3, 2026-06-21).** O bloco de _chrome_ (catálogos de
> fonte + os 3 dialog bridges font/paragraph/table + a wiring de context-menu/
> clipboard, ~85 linhas) saiu para `src/ui/app/createEditorChrome.ts`. O app
> agora faz uma única chamada `createEditorChrome({...})` e expõe só as saídas
> usadas pela view (`compute*FontOptions`, `apply*DialogValues`,
> `buildContextMenuItems`, `handleEditorContextMenu`, `closeContextMenu`). As
> factories continuam chamadas de forma síncrona dentro do owner reativo, então
> não há mudança de comportamento. `OasisEditorApp.tsx` 892→830 linhas, 55→50
> imports internos. Gates: `tsc` limpo, `check:imports` 0 ciclos, suíte
> 586✓/1 skip, `build:lib` ok.
>
> **🟡 Keyboard binding extraído (Onda 3, 2026-06-21).** A montagem das 26 deps
> do `createEditorKeyboardController` + o wrapper `handleKeyDown` (reset de
> caret-style, log estruturado e a perf-mark `input-to-layout`) saíram para
> `src/ui/app/createEditorKeyboardBinding.ts`, que recebe os colaboradores
> coesos (transaction, navigation, history, table, find/replace, command
> runtime) e devolve só `{ handleKeyDown }`. `markStart`/`markEnd` deixaram de
> ser importados no app. `OasisEditorApp.tsx` 830→774 linhas. Gates: `tsc`
> limpo, `check:imports` 0 ciclos, suíte 586✓/1 skip, `build:lib` ok.
>
> **🟡 Client host extraído (Onda 3, 2026-06-21).** A wiring imperativa do
> `OasisEditorClient` (get/set document, selection, save, focus, import/export —
> ~37 linhas) saiu para `src/ui/app/connectEditorClientHost.ts`
> (`connectEditorClientHost(controller, deps)`), pura wiring de callbacks sem
> ownership reativo. `createInitialEditorState` deixou de ser importado no app.
> `OasisEditorApp.tsx` 774→747 linhas. Gates: `tsc` limpo, `check:imports` 0
> ciclos, suíte 586✓/1 skip, `build:lib` ok.
>
> **🟡 Command controller extraído (Onda 3, 2026-06-21).** A criação do
> `createEditorCommandsController` + o `keyboardCommandsController`, junto com os
> dialog-openers inline (link/imageAlt/imageCaption) e o label de legenda
> derivado do locale, saíram para `src/ui/app/createAppCommandsController.ts`,
> que devolve `{ commandsController, keyboardCommandsController }`. `state` segue
> sendo o store reativo (leitura de `state.selection` em `selectionCollapsed`
> preservada). `isSelectionCollapsed` e `BooleanStyleKey` deixaram de ser
> importados no app. `OasisEditorApp.tsx` 747→733 linhas, 51→49 imports. Gates:
> `tsc` limpo, `check:imports` 0 ciclos, suíte 586✓/1 skip, `build:lib` ok.
>
> **🟢 Runtime decomposto em fases (Onda 3, 2026-06-21).** O restante da lógica
> operacional foi extraído em quatro fases que rodam síncronas no owner do
> componente, **sem reordenar nenhum signal/effect** (a store é criada no app e
> passada às fases; back-edges entre fases resolvidas por getters tipados):
> `createEditorChangeBroadcast` (effect de mirror de estado, 5a),
> `createEditorDocumentRuntime` (state IO + layout + persistência + transações/
> histórico, 5b), `createEditorInteractionRuntime` (hit/find-replace/table/image/
> textbox ops + style + interaction wiring, 5c) e `createEditorCommandRuntime`
> (command controller + runtime bootstrap + client host + dispatch effect +
> keyboard binding, 5d). As únicas forward-edges (`history→imageOps`,
> `style→commands`) são lazy e explícitas. `OasisEditorApp.tsx` **733→471 linhas**
> (−47% do baseline de 892), **32 imports internos**. Gates por lote: `tsc` limpo,
> `check:imports` 0 ciclos, suíte 586✓/1 skip, `build:lib` ok.
>
> **Container único (5e) deliberadamente adiado.** Juntar as quatro fases num
> `EditorRuntimeContext` exigiria um bag plano de ~50 campos (tudo que
> `buildEditorViewProps` + JSX consomem), pioraria a legibilidade frente aos três
> bags nomeados atuais e renderia só ~60 linhas — sem cruzar <400 (JSX ~110 +
> `buildEditorViewProps` ~50 são intrínsecos do composition root). O caminho que
> de fato reduz e melhora ISP é agrupar `EditorWorkspaceProps`/
> `buildEditorViewProps` em bundles (`runtime`/`chrome`/`view`), que é **I1**.
> S1 considerado substancialmente concluído: a lógica operacional saiu do root.

**Evidência (baseline, commit `8faf07e`):** `OasisEditorApp.tsx` inicializava
client, i18n, estado, opções, foco, zoom, dialogs e IO, instanciava histórico,
hit-testing, operações de tabela/imagem/textbox, estilo, comandos, teclado e
bridges, montava o context menu de tabela e formava 38 entradas para
`buildEditorViewProps`. O arquivo tinha 892 linhas e 55 dependências internas.
Após a Onda 3 são 471 linhas / 32 imports (ver nota acima).

**Por que é violação:** composition root pode conhecer implementações, mas não
deveria também conter regras operacionais, adaptações de payload, callbacks de
tabela e coordenação de ciclo de vida de cada feature.

**Consequência:** uma mudança de UI, transação, plugin ou comando converge no
mesmo arquivo. Isso amplia conflitos e torna a ordem de criação/cleanup parte
implícita do comportamento.

**Refactor:** criar um `EditorRuntimeContext` interno com ports coesos e extrair
bootstrap de documento, interação, comandos e chrome para quatro módulos. O app
deve apenas criar os contextos, registrar cleanup e renderizar `EditorWorkspace`.

**Risco:** alto; Solid exige preservar a criação síncrona de signals/effects e a
ordem atual de inicialização.

#### S2. Hotspots com responsabilidades heterogêneas

Arquivos grandes que foram confirmados como mais que catálogos de dados:

| Arquivo                                               | Evidência de papéis distintos                                                                                                       | Refactor indicado                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ~~`layoutProjection/blocksPagination.ts` (1.237 linhas)~~ ✅ resolvido | slicing → `tableRowSlicing`; colunas → `columnFlow`; cursor de página → `PaginationTrack`; handlers de bloco → `paragraphBlockPagination`/`tableBlockPagination`; `blocksPagination.ts` virou dispatch+driver de 104 linhas | feito (Onda 6, 2026-06-21) |
| ~~`ui/canvas/CanvasLayoutSnapshot.ts` (1.152)~~ ✅ resolvido | tipos → `canvasSnapshotTypes`; readers de inline/floating → `canvasInlineReaders`/`canvasFloatingReaders`; resta o assembler + page reader + vertical-cell lines; 1153→663 | feito (Onda 6, 2026-06-21) |
| ~~`import/docx/tables.ts` (1.104)~~ ✅ resolvido      | property parsers → `tableProperties.ts`; conditional resolver → `tableConditionalFormatting.ts`; tree builder (`parseTableNode`) fica; arquivo 1107→337 | feito (Onda 6, 2026-06-21) |
| ~~`export/docx/exportEditorDocumentToDocx.ts` (880)~~ ✅ resolvido | builders extraídos p/ `docxPackageXml`, `docxNumbering`, `docxBlockVisitor`, `docxDocumentXml`; arquivo 880→447 (só orquestrador + buildPartContext) | feito (Onda 6, 2026-06-20) |
| ~~`core/commands/text.ts` (889)~~ ✅ resolvido        | ~~move/copy, insert, delete, estilo e case~~ → `textEditing`/`textDeletion`/`textFormatting`/`textCase`; `text.ts` virou façade de 23 linhas | feito (Onda 6, 2026-06-20)                                                                       |

`OasisPdfWriter.ts` (1.024 linhas) não foi classificado automaticamente como god
object: ele é um writer de baixo nível e a maior parte das funções serve ao mesmo
motivo de mudança, o formato PDF. A coesão deve ser medida por change coupling
antes de dividi-lo.

### OCP — Open/Closed Principle

#### O1. Extensão de tipos de run exige shotgun surgery

> **🟡 Base segura feita (Onda 6, 2026-06-21).** Introduzido
> `src/core/model/runKind.ts` com `RunKind`, `getRunKind`, `isInlineObjectRun`,
> `RunVisitor` e `visitRun` (dispatch exaustivo com `assertNever`). A precedência
> de `getRunKind` espelha `serializeRun` (footnote → endnote → fieldChar →
> fieldInstruction → field → textBox → image → sym → text). É **derivado** dos
> campos atuais — _não_ muda o wire shape. Consumidores já migrados para
> `isInlineObjectRun`: `paragraphRunQuery`, `paragraphRunBuild` (removeu o
> `isObjectRun` local) e os 4 skip-checks de `verticalText`. Coberto por
> `runKind.test.ts`. Pendente: migrar os demais sites para `visitRun` e, por fim,
> a união discriminada (mudança pública incompatível). Gates: `tsc` limpo,
> `check:imports` ok, suíte 586✓/1 skip, `build:lib` ok.

**Evidência:** `EditorTextRun` armazena `image`, `textBox`, `field`, `fieldChar`,
`fieldInstruction`, `revision`, `footnoteReference` e `endnoteReference` como
campos opcionais (`src/core/model/types/nodes.ts:75-114`). Não existe discriminante
que impeça combinações inválidas. Foram encontradas 227 decisões diretas sobre
`block.type`, `fragment.type` ou variantes opcionais de run nos pipelines
principais.

Exemplos:

- clone e edição: `src/core/cloneState.ts:12-83` e
  `src/core/document/paragraphRunQuery.ts:144-171`;
- layout/canvas: `src/layoutProjection/tablePagination.ts:236-243` e
  `src/ui/canvas/verticalText.ts:143-261`;
- DOCX: `src/export/docx/text/runXml.ts:42-89`;
- PDF: `src/export/pdf/draw/drawFragment.ts:384-412`;
- import: `src/import/docx/paragraphs.ts:42-83`.

**Consequência:** adicionar um novo objeto inline exige alterar clone, seleção,
layout, canvas, PDF, DOCX, HTML e clipboard. Uma camada esquecida produz perda
silenciosa de dados ou diferença entre tela e exportação.

**Refactor:** primeiro introduzir `getRunKind` e `visitRun` exaustivos; depois
migrar `EditorTextRun` para união discriminada (`text`, `image`, `textBox`,
`fieldMarker`, `noteReference`). A mudança de wire shape é incompatível e deve
ser feita como alteração pública deliberada, com migração de fixtures e docs.

#### O2. Dispatch de blocos permanece distribuído

> **✅ Visitors exaustivos (Onda 6, 2026-06-21).** Introduzido o guard de
> exaustividade `src/core/assertNever.ts` (helper local, _não_ um registry
> global). Todos os visitors que antes assumiam "tabela" no `else` — onde uma
> variante esquecida causaria perda silenciosa — agora são `switch (block.type)`
> com `default: assertNever(block)`:
> `cloneState.cloneBlock`, `paragraphWalker.getBlockParagraphs`,
> `documentIndex.indexBlock`, `docxBlockVisitor.visitBlocks`,
> `blocksXml.serializeBlocksXml`, o driver de `blocksPagination`,
> `listNumbering.collectBlocks`, `imageCaptions.renumberBlocks`,
> `document/clone.cloneBlocks`, `endnotes`/`footnotes` (rewrite de marcadores) e
> os loops de PDF `drawBlockList` / `drawTextBoxShape`. Também deduplicado
> `editingZones.getParagraphs` para reusar `getBlockParagraphs`. Adicionar um
> terceiro tipo de bloco é erro de compilação nesses pipelines. Restam apenas os
> sites de dispatch puramente predicativos (filtros booleanos) e a _construção_
> de runs no import, que não precisam de exaustividade. Gates: `tsc` limpo,
> `check:imports` ok, suíte 586✓/1 skip, `build:lib` ok.

O modelo de blocos **já** é uma união discriminada correta
(`src/core/model/types/nodes.ts:134-142`, `:219-229`). O problema não é o tipo,
mas a repetição de dispatch em layout, serialização, import e comandos, por
exemplo `blocksPagination.ts:318-346`, `blocksXml.ts:112-138` e
`documentIndex.ts:106-128`.

**Refactor:** adotar visitors locais por pipeline, com `assertNever`, sem criar
um registry global que acople import, layout e export. Cada pipeline mantém suas
dependências, mas ganha verificação de exaustividade.

### LSP — Liskov Substitution Principle

Não foi encontrada violação clássica entre subclasses: o codebase usa pouca
herança e as implementações de fontes/decoders inspecionadas mantêm contratos
estreitos. Há, porém, duas quebras de contrato comportamental relevantes.

#### L1. `EditorOptions` não é aceito igualmente pelos dois caminhos públicos

> **✅ Resolvido (Onda 6, 2026-06-21).** `EditorOptions` foi removido e
> substituído por `SynchronousEditorOptions` (sem `plugins`, aceito por
> `new Editor(...)`) e `EditorCreateOptions extends SynchronousEditorOptions`
> (adiciona `plugins`, aceito só por `Editor.create`). O throw de runtime no
> construtor foi removido — a pré-condição agora é erro de compilação. O teste
> obsoleto de `.toThrow` foi removido. Gates: `tsc` limpo, `check:imports` ok,
> suíte 579✓/1 skip, `build:lib` ok.

`EditorOptions.plugins` é válido no tipo (`src/core/Editor.ts:12-16`).
`new Editor(options)` rejeita esse mesmo objeto em runtime
(`src/core/Editor.ts:26-34`), enquanto `Editor.create(options)` o aceita e aguarda
inicialização (`src/core/Editor.ts:36-43`). Um consumidor que substitui um
caminho de criação pelo outro preservando `EditorOptions` recebe comportamento
incompatível.

**Refactor:** remover `plugins` do tipo aceito pelo construtor. Criar tipos
distintos `SynchronousEditorOptions` e `EditorCreateOptions`; manter plugins
somente em `Editor.create`. É uma correção pública incompatível no TypeScript,
mas torna a pré-condição explícita.

#### L2. Implementações de command bus não avaliam estado da mesma forma

> **✅ Divergência de runtime resolvida (Onda 6, 2026-06-21).**
> `createEditorCommandBus().state` agora delega a `editor.commands.state(name,
> payload)` em vez de chamar `refresh` direto, igualando os três métodos do bus
> (`execute`/`canExecute`/`state`) e garantindo que `refresh` recebe o
> `OasisCommandContext`. Coberto por `tests/.../core/commandBus.test.ts`.
> Resta a parte de _tipagem_ (genéricos de `execute` por command map), que se
> sobrepõe a **C1** e segue pendente como mudança de tipos pública.
>
> Gates: `tsc` limpo, `check:imports` ok, suíte 580✓/1 skip.

`CommandRegistry.state` passa payload e contexto para `refresh`
(`src/core/commands/CommandRegistry.ts:62-67`). Já
`createEditorCommandBus().state` chama `refresh` diretamente apenas com payload
(`src/core/commands/CommandBus.ts:21-27`). Comandos cujo estado depende de
`OasisCommandContext` podem responder diferente conforme o bus usado.

Além disso, `OasisCommandRegistry.execute<TPayload, TResult>` permite ao chamador
escolher genéricos sem relação com o nome (`src/core/plugin.ts:27-40`) e a
implementação força casts (`src/core/commands/CommandRegistry.ts:16-20`,
`:35-46`). A promessa de substituição tipada não é garantida em runtime.

**Refactor:** fazer todo bus delegar a `editor.commands.state/canExecute/execute`
e tipar built-ins por command map. Comandos de plugin continuam aceitando
`CommandRef<string, unknown>`, explicitamente não tipado.

### ISP — Interface Segregation Principle

#### I1. Controllers dependem de “sacos de callbacks”

> **🟡 Base feita (Onda 6, 2026-06-21).** Criado
> `src/app/controllers/controllerPorts.ts` com os ports de capability
> `EditorTransactionPort`, `FocusInputPort` e `SelectedImageQueryPort`. Os dois
> maiores sacos citados — `EditorKeyboardDeps` e `EditorCommandsControllerDeps` —
> agora **compõem** esses ports em vez de redeclararem os mesmos ~8 membros
> (`apply*`, `focusInput`, `clearPreferredColumn`, `resetTransactionGrouping`,
> `selectedImageRun`); `applyTransactionalState` do teclado passou para a
> assinatura correta com `options?`. Mudança não-quebra (shape plano preservado).
> Pendente: ports mais finos para migrar os ~20 controllers restantes (cada um
> usa um _subconjunto_ diferente — forçar o port inteiro pioraria a ISP) e o
> bundle de view-props `EditorViewPropsContext`.
> Gates: `tsc` limpo, `check:imports` ok, suíte 586✓/1 skip, `build:lib` ok.
>
> **🟡 `EditorWorkspaceProps` agrupado (Onda 3, 2026-06-21).** Os 26 props planos
> viraram 5 de topo (`useComposedShell`, `shellComponent`, `runtime`, `chrome`,
> `view`) — os bundles de capability `EditorWorkspaceRuntime`/`...Chrome`/`...View`
> no boundary do `EditorWorkspace`. O Shell composto e `OasisEditorEditor` não
> mudaram (o workspace ainda repassa plano a eles). Pendente: `EditorViewPropsContext`
> (38 entradas). Gates: `tsc` limpo, `check:imports` 0 ciclos, suíte 586✓/1 skip,
> `build:lib` ok.

- `EditorKeyboardDeps` tem 26 membros e mistura transação, navegação, histórico,
  dialogs, tabela e command bus (`src/app/controllers/EditorKeyboardDeps.ts:22-69`).
- `EditorCommandsControllerDeps` tem 17 membros e mistura estado, transação,
  foco, toolbar e dialogs (`src/app/controllers/EditorCommandsController.ts:64-80`).
- `EditorViewPropsContext` tem 38 entradas
  (`src/ui/app/buildEditorViewProps.ts:37-82`).
- ~~`EditorWorkspaceProps` tem 26 entradas~~ ✅ agrupado em 5 (runtime/chrome/view).

**Consequência:** testes precisam fabricar dependências não usadas pelo cenário;
mudanças pequenas propagam por builders e pelo app root; callbacks relacionados
podem ser conectados de instâncias diferentes sem o tipo detectar.

**Refactor:** agrupar por capability, não apenas para reduzir contagem:
`TransactionPort`, `SelectionNavigationPort`, `FocusPort`, `DialogPort`,
`HistoryPort`, `TableCommandPort` e bundles existentes de view. Cada controller
recebe apenas os ports que efetivamente chama.

#### I2. Contratos públicos largos precisam ser separados de capabilities

`OasisEditorClient` possui 25 membros (`src/app/client/OasisEditorClient.ts:74-108`)
e `OasisCommandPayloads` possui 89 chaves
(`src/core/commands/publicCommandTypes.ts:21-111`). Esses tamanhos podem ser
legítimos para uma façade pública, mas plugins e componentes não devem depender
da façade inteira. O código já usa capabilities em alguns pontos; a regra deve
ser tornada arquitetural e coberta por testes de import.

### DIP — Dependency Inversion Principle

#### D1. Contrato de plugins do core depende da toolbar concreta

> **✅ Resolvido na Onda 2 (2026-06-20).** O vocabulário neutro de contribuição
> (`RIBBON_TABS`, `RibbonTabId`, `RibbonRow`, `RibbonSize`) foi movido para
> `src/core/pluginUiTypes.ts`; `core/plugin.ts` importa de lá e não importa mais
> nada de `src/ui`. A toolbar (`schema/items.ts`) re-exporta os tipos no mesmo
> entrypoint, preservando identidade estrutural para consumidores. O alias
> concreto morto `OasisEditorRuntime = Editor` foi removido (sem consumidores,
> fora do barrel público). Adicionado o gate determinístico
> `scripts/check-import-graph.mjs` (`npm run check:imports`), que falha em
> qualquer import `src/core -> src/ui` e em ciclos fora da allowlist.
>
> Gates: `check:imports` ok, `tsc` limpo, suíte 577✓/1 skip, `build:lib` ok.

`src/core/plugin.ts:5-9` importa `RibbonRow`, `RibbonSize` e `RibbonTabId` de
`src/ui/components/Toolbar/schema/items.ts`. O mesmo arquivo importa a classe
concreta `Editor` (`:3`) apenas para publicar `OasisEditorRuntime = Editor`
(`:154`). Isso cria a direção `core -> ui`.

O grafo confirma um SCC de sete módulos:

```text
core/plugin.ts
  <-> core/Editor.ts
  <-> core/plugins/{PluginCollection,PluginUiRegistry}.ts
  <-> core/commands/{CommandRegistry,CommandBus}.ts
  <-> ui/components/Toolbar/schema/items.ts
```

**Consequência:** carregar tipos de plugin liga core e toolbar; mudanças de
schema podem afetar runtime/commands; a fronteira impede reutilizar o core sem UI.

**Refactor:** mover tipos neutros de contribuição (`RibbonTabId`, row e size)
para `core/pluginUiTypes.ts`, consumidos pela toolbar. Remover o alias concreto
`OasisEditorRuntime` ou fazê-lo apontar para `OasisEditor`. `plugin.ts` deve
depender apenas de contratos do core.

#### D2. Pipelines recursivos dependem circularmente de implementações

> **✅ Resolvido na Onda 2 (2026-06-20).** Todos os nove SCCs foram eliminados;
> `npm run check:imports` reporta **0 ciclos** em `src/` com allowlist vazia.
>
> - **Ciclos type-only (font dialog, teclado, document IO, essentials):** tipos
>   compartilhados extraídos para módulos folha (`FontDialogTypes`,
>   `EditorKeyboardDeps.ts`, `documentIO/importProgress.ts`,
>   `essentialsCapabilities.ts`), re-exportados dos entrypoints antigos.
> - **Toolbar renderers:** `ToolbarItemRenderer` co-locado em `renderers.tsx`
>   (recursão intra-módulo); `ToolbarItemRenderer.tsx` virou re-export.
> - **Pipelines de recursão de documento (DOCX export/import, PDF, canvas):**
>   orchestrator por pipeline com callbacks estreitos injetados nos handlers de
>   paragraph/table/textbox — `SerializeBlocksXml` (blocksXml), `ParseNestedBlocks`
>   via `createNestedBlockParser` (nestedBlocks), `BlockDrawers` (drawBlockList) e
>   `CanvasBlockPainters` (canvasBlockPainter). No canvas, os helpers de fonte
>   puros saíram para `canvasFontResolution.ts` para cortar
>   `verticalText -> canvasParagraphPainter`. Output DOCX/PDF e render canvas
>   inalterados (suíte de snapshots/round-trip verde).
>
> Gates por commit: `check:imports`, `tsc`, suíte 577✓/1 skip; `build:lib` ao
> final.

Foram confirmados os seguintes SCCs:

| Pipeline              | Ciclo confirmado por imports                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas (5)            | `canvasParagraphPainter -> canvasTextBoxPainter -> canvasTablePainter -> canvasParagraphPainter`, com `verticalText` e `CanvasTableLayout` no mesmo SCC |
| PDF (4)               | `drawParagraph -> drawFragment -> drawTextBoxShape -> drawParagraph/drawTable`                                                                          |
| DOCX export (3)       | `blocksXml -> runXml -> textBoxRunXml -> blocksXml`                                                                                                     |
| DOCX import (3)       | `paragraphs -> nestedBlocks -> tables -> paragraphs`                                                                                                    |
| Toolbar renderers (2) | `renderers.tsx <-> ToolbarItemRenderer.tsx`                                                                                                             |
| Teclado (2)           | `EditorCommandRegistry.ts <-> useEditorKeyboard.ts`                                                                                                     |
| Document IO (2)       | `DocumentImporter.ts <-> useEditorDocumentIO.ts`                                                                                                        |
| Font dialog (2)       | `FontDialogTypes.ts <-> FontDialogModel.ts`                                                                                                             |
| Essentials (2)        | `essentialsCommandGroups.ts <-> createEssentialsPlugin.ts`                                                                                              |

Os quatro primeiros ciclos são recursão legítima de documento implementada por
imports concretos. A recursão não precisa desaparecer; a dependência concreta,
sim.

**Refactor:** criar um orchestrator por pipeline e injetar callbacks estreitos
(`paintBlocks`, `drawBlocks`, `serializeBlocks`, `parseBlocks`) nos handlers de
paragraph/table/textbox. Nos ciclos de dois módulos, extrair somente tipos e
helpers compartilhados para um terceiro módulo folha.

#### D3. Persistência default é concreta e global

> **✅ Resolvido na Onda 1 (2026-06-20).** O singleton `persistenceService` e a
> classe `PersistenceService` foram substituídos por uma factory stateless
> `createIndexedDbPersistence({ key, dbName, storeName })`
> (`src/app/services/indexedDbPersistence.ts`), sem instância de módulo. O app
> cria um default **por instância**, chaveado por `documentOptions().persistenceKey`,
> e o reusa no fallback do effect de persistência e no comando de save
> (`src/ui/OasisEditorApp.tsx`). Foi adicionado `persistenceKey?: string` em
> `OasisEditorAppDocumentProps`. Teste de isolamento por chave incluído.
>
> Gates: `tsc` limpo, suíte 577✓/1 skip, `build:lib` ok.
>
> **Pendente (próximo breaking release):** tornar `persistenceEnabled: true` sem
> `persistence` nem `persistenceKey` um erro de configuração, em vez de cair na
> chave default `current-document` compartilhada.

## Catálogo de anti-patterns

### Estado global mutável e singletons

#### G1. Locale global

> **✅ Resolvido na Onda 1 (2026-06-20).** Eliminado o estado de locale global:
>
> 1. `i18n/index.ts` agora expõe `createTranslator(localeAccessor)` e
>    `TranslateFn`; `currentLocale`, `setLocale`, `getLocale` e o `t` global foram
>    removidos. Novo `i18n/I18nContext.tsx` com `I18nProvider`/`useI18n` e um
>    translator default imutável (pt-BR) para componentes renderizados sem
>    provider (testes isolados).
> 2. `OasisEditorApp` cria um translator por instância (lendo o signal de locale)
>    e o fornece via `I18nProvider`; `OasisEditorAppLazy` tem seu próprio provider
>    para o card de loading. Reatividade de troca de locale melhora, pois o
>    translator lê o signal.
> 3. Os 31 componentes `.tsx` migraram de `t()` global para `useI18n()`. Os
>    builders/hooks não-componentes recebem o translator por parâmetro:
>    `createToolbarApi(host, t)`, `createDefaultToolbarPreset(t)`,
>    `buildRibbonGroups(items, tab, t)`, `ribbonGroupLabel(group, t)`,
>    `createEditorContextMenuClipboard({ t })`; `useFontDialogController` usa
>    `useI18n()`.
> 4. **API pública:** `RIBBON_TAB_DEFINITIONS` (const avaliada no import) foi
>    substituída por `buildRibbonTabDefinitions(t)` — mudança incompatível
>    deliberada, sem alias.
>
> Gates: `tsc` limpo, suíte 577✓/1 skip, `build:lib` ok. Testes de dialog passaram
> a renderizar dentro de `I18nProvider` com translator `en`.

#### G2. IDs globais e duplicados

> **✅ Resolvido na Onda 1 (2026-06-20).** O estado mutável de geração de IDs foi
> eliminado:
>
> 1. As autoridades duplicadas de footnote/endnote (`createFootnoteId`/`nextFootnoteId`/
>    `resetFootnoteIds` em `footnotes.ts` e seus equivalentes em `endnotes.ts`) eram
>    código morto e foram removidas. O caminho vivo de footnote passa por
>    `createEditorFootnote -> createEditorFootnoteId`; endnotes importados usam
>    `endnote:imported:N` em `import/docx/endnotes.ts`.
> 2. Os nove contadores de módulo e `resetEditorIds` em `editorState.ts` foram
>    substituídos por uma única função stateless `createEditorNodeId(kind)`
>    (`${kind}:${crypto.randomUUID()}`). O prefixo `kind` permanece só para
>    debug; nenhum código parseia ou ordena por ele (verificado).
> 3. As 17 chamadas `resetEditorIds()` em testes foram removidas e a única
>    asserção de ID sequencial (`editorState.test.ts`) passou a validar
>    prefixo + unicidade.
>
> Gates: `tsc --noEmit` limpo, suíte completa 576✓/1 skip, `build:lib` ok.
> Wire format inalterado (IDs continuam strings opacas), mas deixam de ser
> sequenciais.

#### G3. Registry default global — risco residual, não caminho principal

> **✅ Resolvido na Onda 1 (2026-06-20).** O singleton `defaultMenuRegistry` e a
> populagem por side-effect no import (`defaultMenuItems.forEach(... register)`)
> foram removidos. `Menubar` agora exige `registry` (prop obrigatória); os dois
> usos no `DocumentShell` já passavam o registry por instância criado em
> `useEditorRuntimePlugins`. Removido também o `import "./defaultMenuItems.js"`
> só-por-efeito no `Menubar`. Gates: `tsc` limpo, suíte 577✓/1 skip.

O runtime principal já criava `new MenuRegistry()` por app e copiava os defaults
(`useEditorRuntimePlugins`), então não havia vazamento real de customização entre
instâncias; isto apenas elimina o singleton morto restante.

### Barrels e dependência excessiva

> **✅ B1 resolvido na Onda 3 (2026-06-20).** O barrel deprecated
> `src/core/editorCommands.ts` foi removido. Os 24 consumidores internos tiveram
> os imports reescritos (via codemod com mapa símbolo→módulo determinístico, 0
> colisões) para os módulos de domínio reais em `@/core/commands/*`. Não estava
> no barrel público (`src/index.ts`). Gates: `tsc` limpo, `check:imports` 0
> ciclos, suíte 577✓/1 skip, `build:lib` ok.

- `src/index.ts` tem fan-out 70 e mistura bootstrap, core, plugin API, shells,
  UI pública e primitivas de toolbar (`src/index.ts:3-216`). Como é o entrypoint
  publicado, isso é risco de governança/API e tree-shaking, não violação por si.
- `src/core/model.ts` recebe 312 imports, mas hoje é uma façade de uma linha sobre
  módulos já separados. Mantê-la é compatibilidade razoável; novos imports
  internos devem usar módulos específicos quando isso reduzir acoplamento.
- `src/core/editorCommands.ts` declara-se deprecated (`:1-4`), reexporta 14
  módulos e ainda é usado por 22 arquivos internos. Isso é dívida confirmada:
  novos comandos aumentam recompilação e escondem a dependência de domínio.

**Refactor:** remover consumidores internos do barrel deprecated por domínio e
então apagar o arquivo. Manter `src/index.ts` como lista explícita da API pública,
preferencialmente gerida por subentrypoints já existentes (`./ui`, `./react`,
`./vue`). Não reexportar automaticamente diretórios internos.

### Feature envy

`src/ui/app/useTablePropertiesDialogBridge.ts` não apenas abre o dialog. Ele
encontra a tabela e célula ativas (`:107-131`), serializa unidades (`:133-149`),
deriva estado de bordas/layout (`:151-221`) e aplica mutações de tabela/célula
(`:248-323`). A bridge conhece mais do modelo de tabelas que do dialog.

**Refactor:** mover `resolveActiveTableContext`, DTO mapping e aplicação para
`core/tableProperties` ou um application service. A bridge fica responsável por
open/close/focus e chama `readTableProperties`/`applyTableProperties`.

### Long parameter lists e props drilling

Além das dependency bags de ISP, foram encontradas funções com 9–10 parâmetros
em paginação, header/footer, canvas e PDF. Exemplos:

- `blocksPagination.ts:145` e `:174` — 10 parâmetros;
- `headerFooterProjection.ts:33` — 10;
- `canvasTablePainter.ts:76` — 10;
- `export/pdf/draw/drawBlockList.ts:14` — 10;
- `drawParagraph.ts:94` e `drawFragment.ts:373` — 9.

Nem toda lista longa exige objeto. O refactor deve criar context objects apenas
para valores que viajam juntos pelo pipeline (`LayoutContext`, `CanvasPaintContext`,
`PdfDrawContext`), mantendo coordenadas locais explícitas.

### Primitive obsession

IDs de parágrafo, run e tabela são `string` em modelo, seleção, canvas e
controllers (`model/types/selection.ts:7-8`, `OasisEditorEditor.tsx:101-131`,
`CanvasLayoutSnapshot.ts:50-133`). `mergeKey` e nomes dinâmicos de comando também
são strings livres (`ui/editorHistory.ts:4-8`, `useEditorKeyboard.ts:91-92`).

**Consequência:** `tableId` pode ser passado onde se espera `paragraphId` sem
erro; typos em command/merge keys só aparecem em runtime.

**Refactor:** branded types (`DocumentId`, `ParagraphId`, `RunId`, `TableId`) nas
fronteiras internas, factories de conversão para dados importados e constantes
tipadas para merge keys. O wire format continua string e não muda.

### Duplicação

> **N1 parcialmente resolvido na Onda 6 (2026-06-20).** Os dois pares
> footnote/endnote que eram **byte-idênticos** modulo o nome "footnote/endnote"
> foram deduplicados para parsers/serializadores parametrizados por `kind`:
> `import/docx/notes.ts` (`parseDocxNotesXml`) e
> `export/docx/text/noteRunXml.ts` (`serializeNoteReference`/`serializeNoteRefMarker`);
> os 4 módulos viraram wrappers finos. **Pendente:** os pares
> `export/docx/{footnotesXml,endnotesXml}.ts`, `core/{footnotes,endnotes}.ts` e
> `layoutProjection/{footnotePagination,endnotePagination}.ts` divergem em
> comportamento (a versão de footnote trata casos extras — tabela no primeiro
> slot, scan de seções — que a de endnote não). Deduplicá-los exige primeiro
> reconciliar esse comportamento e validar contra o Word, então fica para um
> lote dedicado, não como refactor mecânico.

- `footnotes.ts` e `endnotes.ts` têm cerca de 76% de linhas normalizadas em
  comum após trocar “footnote/endnote” por “note”; iteradores, marker lookup,
  remoção e renumeração têm a mesma estrutura.
- Conversões `96 / 72`, `72 / 96`, `9525` e `1440` aparecem em módulos de core,
  import, export, layout e UI, apesar de já existirem `import/docx/units.ts`,
  `export/pdf/units.ts`, `layoutProjection/constants.ts` e outros módulos locais.
- Não foram encontrados arquivos exatamente duplicados por hash em `src/`.

**Refactor:** criar algoritmos internos genéricos de note traversal/renumbering,
mantendo façades `footnotes` e `endnotes`. Consolidar unidades em um módulo
neutro (`core/units`) e deixar constantes específicas do formato junto ao
adapter.

### Números mágicos

> **✅ U1 resolvido na Onda 3 (2026-06-20).** As conversões de unidade duplicadas
> (EMU/px, EMU/pt, px/pt, px/inch, twips, px/cm) foram centralizadas em
> `src/core/units.ts`; os módulos de layout, canvas, import e export passaram a
> re-exportar/importar de lá e os literais `9525`/`12700`/`96 / 72`/`72 / 96`/
> `96 / 2.54` inline foram trocados pelas constantes nomeadas. Constantes
> específicas de formato (OOXML/VML/DOCX) permanecem nos seus módulos.

Achados confirmados eram conversões duplicadas, por exemplo EMU por pixel em
`floatingObjects.ts:10`, `CanvasLayoutSnapshot.ts:368`,
`exportEditorDocumentToDocx.ts:257-258` e `commands/textBox.ts:24`.

Proporções em `presetGeometry/families.ts` não foram classificadas como números
mágicos: elas descrevem a geometria das shapes e substituí-las por nomes sem
semântica não melhora manutenção. Defaults `96/48` de página já estão
centralizados em `core/model/pageGeometry.ts:13-18`; ocorrências de fallback no
import devem referenciar esse default, não duplicá-lo.

## Riscos que precisam de medição antes de refactor

1. **`OasisPdfWriter.ts`:** grande, porém coeso. Medir arquivos que mudam juntos
   e tempo de testes antes de separar encoding, resources e page writer.
2. **`presetGeometry/families.ts`:** 1.168 linhas, mas majoritariamente catálogo
   de 187 geometrias. Divisão adicional só é justificável por ownership/testes,
   não por contagem de linhas.
3. **`src/index.ts`:** medir bundle/tree-shaking e frequência de breaking changes.
   Um entrypoint público explícito pode legitimamente ter fan-out alto.
4. **`model.ts`:** fan-in 312 é alto, porém a implementação já foi dividida.
   Medir ciclos e tempo incremental antes de remover a façade estável.
5. **Caches module-level:** caches imutáveis de fonte/geometria podem ser
   compartilháveis. Classificar individualmente pela política de invalidação,
   não por serem globais.

## Achados antigos já corrigidos

Estes itens da auditoria de 2026-06-02 não devem voltar ao backlog:

- `core/model.ts` monolítico foi dividido sob `core/model/`; a façade foi mantida.
- `core/commands/utils.ts` foi removido e suas responsabilidades foram separadas.
- lifecycle assíncrono de plugins agora é aguardado por
  `PluginCollection.initializeAll()` (`PluginCollection.ts:92-100`).
- `FontDialog` possui model, controller, types e tabs separados.
- Document IO já possui `DocumentImporter`, `DocumentExporter` e
  `ImageInsertionService`.
- Canvas já possui painters separados; o problema atual são os imports cíclicos,
  não a ausência de extração.
- Operações de tabela já foram separadas em guards, navigation, mutation,
  row/column e cell-span modules.
- Runtime principal de menubar/toolbar já cria registries por instância.
- Preset geometry já possui façade, dispatcher, primitives e families.

## Roteiro arquitetural completo

Cada onda deve ser entregue em lotes pequenos. Um lote só avança depois de
testes focados, `npx tsc --noEmit` e `npm test`; `npm run build:lib` é obrigatório
quando tipos ou exports públicos mudarem.

### Onda 1 — Isolar estado por instância — ✅ CONCLUÍDA (2026-06-20)

Todos os itens (G1 locale, G2 IDs, G3 menu, D3 persistência) foram entregues em
commits independentes no branch `refactor/onda1-instance-state`, cada um com
`tsc` limpo, suíte 577✓ e `build:lib` quando aplicável. O estado de módulo que
vazava entre instâncias (locale, geradores de ID, persistência default) deixou de
existir. Resta como item futuro o erro de configuração para `persistenceEnabled`
sem key/adapter (ver D3), endereçável no próximo breaking release.

**Pré-requisito (registro histórico):** testes com dois editores montados
simultaneamente.

1. ~~**Locale:** criar translator/context por app; migrar `t()` em componentes,
   toolbar preset e plugins; remover `currentLocale`/`setLocale`.~~ ✅ feito
   (`createTranslator` + `I18nProvider`/`useI18n`; builders recebem `t`).
2. ~~**IDs:** introduzir gerador stateless único por kind; migrar
   `editorState`, footnotes e endnotes; remover os três resets.~~ ✅ feito
   (`createEditorNodeId(kind)` com `crypto.randomUUID()`).
3. ~~**Persistência:** criar factory IndexedDB por chave, adicionar
   `document.persistenceKey` e eliminar `persistenceService` exportado.~~ ✅ feito
   (`createIndexedDbPersistence({ key })`; default por instância).
4. **Menu fallback:** remover `defaultMenuRegistry`; `Menubar` deve receber um
   registry ou construir uma cópia local dos defaults.

**API pública:** `OasisEditorAppDocumentProps` ganha `persistenceKey?: string`.
No próximo breaking release, habilitar persistência sem key/adapter passa a ser
erro. IDs continuam strings, mas deixam de ser sequenciais.

**Aceite:** duas instâncias podem usar locales e documentos persistidos distintos;
10.000 IDs gerados não colidem; desmontar uma não altera a outra.

**Testes:** integração multi-instance, i18n, persistence com fake-indexeddb,
footnotes/endnotes e fixtures que não dependam de IDs numéricos.

**Rollback:** quatro commits independentes (locale, IDs, persistence, menu).

### Onda 2 — Corrigir fronteiras e ciclos — ✅ CONCLUÍDA (2026-06-20)

> Concluída: `D1` e `D2` resolvidos. O checker `scripts/check-import-graph.mjs`
> (`npm run check:imports`) reporta **0 ciclos** em `src/` (allowlist vazia) e
> **nenhum import `src/core -> src/ui`**. Detalhes nas seções D1/D2. Cada SCC foi
> um commit independente; gates verdes a cada passo (`check:imports`, `tsc`,
> 577✓/1 skip) e `build:lib` ok ao final.

**Pré-requisito:** adicionar um checker determinístico do grafo de imports com
allowlist inicialmente vazia para os módulos corrigidos.

1. Mover tipos neutros de contribuição para core e remover `core -> ui`.
2. Remover o alias concreto `OasisEditorRuntime = Editor`.
3. Criar orchestrators de recursion para canvas, PDF, DOCX export e DOCX import;
   handlers recebem callbacks e não importam handlers irmãos.
4. Extrair tipos compartilhados nos ciclos keyboard, Document IO, Font dialog,
   toolbar renderers e essentials.

**API pública:** reexportar tipos movidos nos mesmos entrypoints. A identidade
estrutural permanece; apenas `OasisEditorRuntime` deve ser removido ou alterado
para `OasisEditor`, marcado como breaking se houver consumidor externo.

**Aceite:** zero SCCs com mais de um módulo em `src/`; nenhum import de `src/ui`
por `src/core`; output DOCX/PDF e render canvas permanecem equivalentes.

**Testes:** arquitetura, snapshots canvas, export PDF, round-trip DOCX e imports
de textbox/tabela aninhados.

**Rollback:** um commit por SCC; não quebrar todos os pipelines no mesmo lote.

### Onda 3 — Afinar composition root e interfaces

**Pré-requisito:** ondas 1–2 estabilizadas, para não extrair dependências globais.

1. Criar ports coesos de transaction, focus, dialogs, history, navigation e
   table commands.
2. Dividir keyboard e commands controller por capability.
3. Extrair bootstrap de documento, interaction runtime, command runtime e chrome
   do `OasisEditorApp`.
4. Agrupar `EditorWorkspaceProps` em `runtime`, `chrome` e `view`; manter os
   bundles já existentes de layout/overlays/handlers.
5. Reduzir `buildEditorViewProps` para composição de bundles, sem 38 parâmetros.

**API pública:** nenhuma. Ports e contexts são internos.

**Aceite:** `OasisEditorApp` fica responsável apenas por composição/ciclo de vida
e abaixo de aproximadamente 400 linhas; controllers podem ser testados com 2–5
ports, sem stubs irrelevantes.

**Testes:** app mount/unmount, ready lifecycle, keyboard, undo/redo, dialogs,
context menu e table operations.

**Rollback:** commits por capability; preservar ordem de signals/effects e
cleanup em cada extração.

### Onda 4 — Dispatch e contratos tipados

**Pré-requisito:** ciclos dos pipelines removidos.

1. Introduzir visitors exaustivos por pipeline para `EditorBlockNode`.
2. Introduzir `getRunKind`/`visitRun` e migrar branches espalhados.
3. Converter runs em união discriminada e atualizar import/export/clipboard.
4. Tipar built-in commands por map; plugins usam caminho explicitamente dinâmico.
5. Fazer todos os buses delegarem `state`, `canExecute` e `execute` ao registry.
6. Separar options do construtor síncrono e de `Editor.create`.

**API pública:** mudança incompatível no shape de `EditorTextRun`, nos options de
`Editor` e possivelmente em comandos que hoje exploram genéricos livres. Publicar
como breaking release, atualizar declarations, exemplos e formato documentado.
Não manter dois shapes indefinidamente.

**Aceite:** switches são exaustivos; combinações inválidas de run não compilam;
canvas/DOCX/PDF/HTML tratam todas as variantes; command state é igual em todos os
buses.

**Testes:** type tests, clone/selection, clipboard, DOCX round-trip, PDF/canvas
parity e plugins com comandos customizados.

**Rollback:** visitors primeiro sem mudar shape; mudança do modelo em commit
isolado e reversível.

### Onda 5 — Decompor hotspots restantes

**Pré-requisito:** contexts de layout/draw definidos nas ondas anteriores.

1. `blocksPagination`: row slicing, block flow e column flow.
2. `CanvasLayoutSnapshot`: DOM readers e assembler.
3. `import/docx/tables`: properties, conditional styles e builder.
4. `exportEditorDocumentToDocx`: package, parts e media.
5. `commands/text`: editing, deletion, formatting e case.
6. Avaliar `OasisPdfWriter` apenas com evidência de change coupling.

**API pública:** preservar façades e exports atuais; módulos novos são internos.

**Aceite:** cada módulo extraído tem uma responsabilidade e testes próprios; não
há aumento de fan-out público nem novos ciclos; resultados binários/layout são
equivalentes.

**Testes:** suites focadas de paginação, tabelas DOCX, comandos de texto,
snapshots canvas e `build:lib`.

**Rollback:** um hotspot por lote; nunca mover dois pipelines grandes juntos.

### Onda 6 — Tipos, duplicação e constantes

**Pré-requisito:** interfaces dos pipelines estabilizadas.

1. Introduzir branded IDs internamente, mantendo serialização string.
2. Criar constantes tipadas para merge keys e nomes built-in de comando.
3. Extrair traversal/renumbering genérico de notes, preservando façades.
4. Consolidar unidades neutras e apontar defaults de página para
   `pageGeometry`.
5. Migrar os 22 consumidores e remover `editorCommands.ts`.
6. Definir regra de arquitetura: código interno não importa barrels deprecated;
   entrypoint público continua explícito.

**API pública:** IDs serializados não mudam. Remoção de `editorCommands.ts` é
interna, pois ele não é subpath exportado no `package.json`. Nenhuma façade
pública deve ser removida sem medição e release note.

**Aceite:** IDs incompatíveis não compilam internamente; uma única autoridade de
unidades por domínio; footnotes/endnotes compartilham algoritmo sem perder tipos;
zero imports do barrel deprecated.

**Testes:** TypeScript, notes, unidades DOCX/PDF/layout, import/export e build da
biblioteca.

**Rollback:** commits independentes para IDs, notes, unidades e barrel.

## Critérios globais de conclusão

- Nenhum achado é encerrado apenas por reduzir linhas; a dependência ou estado
  responsável pelo risco precisa desaparecer.
- Cada mudança de arquitetura inclui teste de comportamento e, quando aplicável,
  teste do grafo de imports.
- Façades públicas são preservadas quando ocultam organização interna. Shapes e
  contratos incorretos são alterados explicitamente em release incompatível, sem
  aliases permanentes.
- Canvas, PDF e DOCX devem manter paridade funcional em cada onda.
- O relatório deve ser revalidado após cada onda; números de linha e métricas não
  são tratados como permanentes.
