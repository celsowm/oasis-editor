# Plano para tornar o Oasis Editor plugavel

Este documento propoe um caminho para transformar o Oasis Editor em um editor customizavel e extensivel, com uma API publica inspirada no modelo do CKEditor 5: configuracao declarativa, plugins com ciclo de vida claro, comandos nomeados, extensoes de UI e pontos formais para schema, importacao/exportacao e integracoes de framework.

## Status da implementacao (2026-06-01)

Ja implementado no codigo:

- Contratos tipados em `src/core/plugin.ts`: `OasisEditor`, `OasisPlugin`, `OasisCommand`, `CommandState`.
- Runtime de comandos em `src/core/Editor.ts`: `registerCommand`, `unregisterCommand`, `execute`, `canExecute`.
- Event bus basico em `Editor`: `on`, `once`, `off` e emissao de `change:data` no `dispatch`.
- Ciclo de plugin no `PluginHost`: `init`, `afterInit`, `destroy`, registro/desregistro de comandos e deduplicacao por nome.
- Integracao de comandos nomeados no teclado (`EditorCommandRegistry` + `useEditorKeyboard`).
- Integracao de comandos nomeados em menubar e toolbar (com fallback legado quando necessario).
- Plugin interno inicial `Essentials` via factory: `src/plugins/internal/createEssentialsPlugin.ts`, carregado no `Editor` por `plugins`.

## Objetivos

1. Permitir criar builds customizados do Oasis com conjuntos diferentes de plugins.
2. Expor uma API publica estavel para inicializar, configurar, estender e destruir o editor.
3. Unificar comandos, atalhos, toolbar, menubar e estados de UI em registries extensivas.
4. Permitir plugins de documento, UI, import/export, colaboracao, revisao, comentarios e recursos de negocio.
5. Manter o core independente de React/Solid/Vue sempre que possivel.
6. Preservar compatibilidade com os recursos atuais de DOCX, PDF, layout canvas e shells existentes.

## Situacao atual

As pecas principais de plugin/comando ja estao de pe, com tipagem e integracao funcional no app:

- `src/core/plugin.ts` nao depende mais de `any` para o contrato principal.
- `src/core/Editor.ts` ja funciona como runtime de comandos/eventos e recebe `plugins`.
- `src/core/pluginHost.ts` ja registra comandos de plugin e roda ciclo de vida.
- UI de teclado, menubar e toolbar ja usa comandos nomeados como caminho primario.
- `Essentials` foi iniciado como plugin interno para concentrar comandos centrais.

Gaps atuais:

- `requires` ainda nao e resolvido no `PluginHost`.
- Nao ha `CommandRegistry`/`PluginCollection` dedicados como modulos separados.
- Facade de `model.change(writer)` ainda nao esta pronta.
- Registries de schema/conversao/ui ainda nao estao formalizados como API publica estavel.

## Principios de arquitetura

1. **Editor como runtime**: `Editor` deve ser o centro de estado, comandos, eventos, plugins e modelo.
2. **Plugins como classes ou factories**: suportar `PluginConstructor` e plugins simples por objeto, mas padronizar o contrato interno.
3. **Comandos nomeados**: toda acao relevante deve ser registrada como comando executavel por `editor.execute("commandName", options)`.
4. **Configuracao declarativa**: inicializacao via `createOasisEditor(element, { plugins, toolbar, menu, document, language })`.
5. **Registries publicas**: comandos, atalhos, toolbar, menu, schema, converters e services devem ser acessados por APIs tipadas.
6. **Separacao core/UI**: plugins de modelo e comandos nao devem depender de DOM; plugins de UI podem depender do app/shell.
7. **Extensibilidade sem monkey patching**: extensoes entram por pontos formais, nao por sobrescrita direta de metodos internos.
8. **Compatibilidade incremental**: recursos atuais devem ser adaptados gradualmente para plugins internos.

## API publica desejada

Exemplo de uso em aplicacao:

```ts
import { createOasisEditor } from "oasis-editor";
import { Bold, Italic, Link, Table, Docx, Pdf } from "oasis-editor/plugins";

const editor = await createOasisEditor(document.querySelector("#editor")!, {
  document: initialDocument,
  language: "pt-BR",
  plugins: [Bold, Italic, Link, Table, Docx, Pdf, MyBusinessPlugin],
  toolbar: {
    items: ["undo", "redo", "|", "bold", "italic", "link", "insertTable"],
  },
  menu: {
    enabled: true,
  },
});

editor.execute("bold");
editor.execute("insertTable", { rows: 3, columns: 4 });

editor.on("change:data", () => {
  const data = editor.getDocument();
});

editor.destroy();
```

Exemplo de plugin:

```ts
import type { OasisPluginDefinition } from "oasis-editor";

export const TimestampPlugin: OasisPluginDefinition = {
  name: "Timestamp",
  requires: [],

  init(editor) {
    editor.commands.register("insertTimestamp", {
      execute: () => {
        editor.model.change((writer) => {
          writer.insertText(new Date().toISOString());
        });
      },
      refresh: () => ({
        isEnabled: !editor.selection.isReadOnly,
      }),
    });

    editor.ui.toolbar.register({
      id: "insertTimestamp",
      type: "button",
      label: "Timestamp",
      command: "insertTimestamp",
    });
  },

  destroy(editor) {
    editor.commands.unregister("insertTimestamp");
    editor.ui.toolbar.unregister("insertTimestamp");
  },
};
```

## Contratos principais

### Editor

API minima:

```ts
interface OasisEditor {
  readonly state: EditorState;
  readonly config: OasisConfig;
  readonly plugins: PluginCollection;
  readonly commands: CommandRegistry;
  readonly model: ModelFacade;
  readonly conversion: ConversionRegistry;
  readonly ui: UiFacade;

  execute(commandName: string, payload?: unknown): unknown;
  canExecute(commandName: string, payload?: unknown): boolean;
  on(event: string, callback: EventCallback): Unsubscribe;
  once(event: string, callback: EventCallback): Unsubscribe;
  off(event: string, callback: EventCallback): void;
  getDocument(): EditorDocument;
  setDocument(document: EditorDocument): void;
  destroy(): void | Promise<void>;
}
```

### Plugin

Contrato recomendado:

```ts
interface OasisPluginDefinition {
  name: string;
  requires?: PluginReference[];
  configKey?: string;

  init?(editor: OasisEditor): void | Promise<void>;
  afterInit?(editor: OasisEditor): void | Promise<void>;
  destroy?(editor: OasisEditor): void | Promise<void>;
}
```

Regras:

- `init` registra schema, comandos, services e conversores.
- `afterInit` conecta plugins que dependem de outros plugins ja carregados.
- `destroy` remove listeners, comandos e contribuicoes de UI.
- dependencias em `requires` sao resolvidas antes da inicializacao.
- plugins duplicados devem ser ignorados ou rejeitados com erro claro.

### Comandos

Todos os recursos editaveis devem passar por comandos:

```ts
interface OasisCommand<TPayload = unknown, TResult = unknown> {
  execute(payload?: TPayload): TResult;
  refresh?(): CommandState;
}

interface CommandState {
  isEnabled: boolean;
  isActive?: boolean;
  value?: unknown;
}
```

Beneficios:

- toolbar, menu e atalhos conseguem refletir estado automaticamente.
- plugins externos usam a mesma API dos recursos internos.
- fica mais simples testar comportamento sem UI.

### Modelo e transacoes

Criar uma fachada publica para mutacoes:

```ts
editor.model.change((writer) => {
  writer.insertText("texto");
  writer.setSelection(nextSelection);
});
```

O `writer` deve encapsular funcoes atuais de `editorCommands` e comandos de `src/core/commands/*`, evitando que plugins manipulem `EditorState` diretamente.

Regras:

- toda mutacao gera transacao.
- transacoes alimentam historico, dirty state e eventos `change:data`.
- comandos internos atuais devem migrar para esta camada gradualmente.

### Schema

O Oasis precisa de um schema extensivel para novos tipos de bloco, inline, marks e metadados:

```ts
editor.schema.registerBlock("callout", {
  allowedChildren: ["paragraph"],
  attributes: {
    tone: { default: "info" },
  },
});

editor.schema.registerMark("comment", {
  attributes: {
    threadId: { required: true },
  },
});
```

O schema deve validar:

- onde um elemento pode aparecer.
- quais atributos sao permitidos.
- como clonar, serializar, importar e exportar elementos customizados.

### UI

Separar UI em registries:

- `editor.ui.toolbar.register(item)`
- `editor.ui.menu.register(item)`
- `editor.ui.contextMenu.register(item)`
- `editor.ui.balloon.register(view)`
- `editor.ui.dialogs.register(dialog)`
- `editor.ui.icons.register(name, icon)`

Itens de toolbar e menu devem poder apontar para comandos:

```ts
editor.ui.toolbar.register({
  id: "bold",
  type: "button",
  icon: "bold",
  command: "bold",
  group: "format",
});
```

O estado visual deve vir de `command.refresh()` quando o item usa `command`.

### Conversao, importacao e exportacao

Criar registries para formatos:

```ts
editor.conversion.docx.registerImporter("callout", calloutDocxImporter);
editor.conversion.docx.registerExporter("callout", calloutDocxExporter);
editor.conversion.pdf.registerRenderer("callout", calloutPdfRenderer);
editor.conversion.html.registerUpcast(calloutHtmlImporter);
editor.conversion.html.registerDowncast(calloutHtmlExporter);
```

Isso permite que plugins adicionem recursos sem alterar diretamente `src/import/docx`, `src/export/docx` e `src/export/pdf`.

## Plugins internos recomendados

Migrar recursos atuais para plugins internos, mesmo que continuem no pacote principal:

| Plugin | Escopo |
| --- | --- |
| `Essentials` | undo, redo, selecao, clipboard basico |
| `Paragraph` | paragrafos, alinhamento, espacamento, quebras |
| `TextStyle` | bold, italic, underline, strike, cor, highlight |
| `Font` | familia, tamanho, estilos de fonte |
| `Link` | links e dialogo de link |
| `Image` | imagem, alt text, redimensionamento |
| `Table` | tabela, selecao, resize, operacoes de linha/coluna |
| `List` | bullet, ordered, indentacao |
| `Footnotes` | notas de rodape |
| `FindReplace` | busca e substituicao |
| `Docx` | import/export DOCX |
| `Pdf` | export PDF |
| `DocumentShell` | UI de documento paginado |
| `InlineShell` | UI inline |
| `BalloonShell` | UI compacta/flutuante |

## Estrutura de arquivos proposta

```txt
src/
  core/
    Editor.ts
    config.ts
    events.ts
    commands/
      CommandRegistry.ts
      Command.ts
    model/
      ModelFacade.ts
      Writer.ts
      schema/
        SchemaRegistry.ts
    plugins/
      PluginCollection.ts
      PluginDefinition.ts
  ui/
    registries/
      ToolbarRegistry.ts
      MenuRegistry.ts
      ContextMenuRegistry.ts
      DialogRegistry.ts
  plugins/
    essentials/
    text-style/
    paragraph/
    link/
    table/
    image/
    list/
    docx/
    pdf/
  packages/
    react/
    vue/
```

## Fases de implementacao

### Fase 0 - Contrato publico e limites

Entregas:

- Definir tipos publicos `OasisEditor`, `OasisConfig`, `OasisPluginDefinition`, `OasisCommand`.
- Documentar quais APIs sao estaveis e quais continuam internas.
- Criar testes de tipo para uso externo basico.

Pronto quando:

- `src/index.ts` exporta apenas a API publica pretendida.
- exemplos TypeScript compilam sem depender de caminhos internos.

Status: **parcialmente concluida**.

### Fase 1 - PluginCollection real

Entregas:

- Substituir `PluginHost` por `PluginCollection` tipada.
- Resolver dependencias via `requires`.
- Executar `init`, `afterInit` e `destroy` em ordem previsivel.
- Detectar nomes duplicados e dependencias ausentes.

Pronto quando:

- plugins sao inicializados em ordem correta.
- `destroy` limpa contribuicoes registradas.
- ha testes unitarios para ordem, erro e cleanup.

Status: **parcialmente concluida** (ciclo de vida e deduplicacao ok; `requires` e tratamento de erros ainda pendentes).

### Fase 2 - CommandRegistry unificada

Entregas:

- Criar `editor.commands` no core.
- Expor `editor.execute` e `editor.canExecute`.
- Adaptar atalhos, toolbar e menu para usar comandos.
- Migrar comandos de texto basicos: bold, italic, underline, undo, redo, link.

Pronto quando:

- UI nao chama diretamente metodos especificos para os comandos migrados.
- toolbar reflete `isEnabled`, `isActive` e `value` dos comandos.

Status: **parcialmente concluida** (execucao/canExecute e integracao de UI feitos para comandos principais; falta consolidar registry dedicado e cobertura completa de estado visual).

### Fase 3 - Event bus e ciclo de dados

Entregas:

- Implementar `editor.on/off/once`.
- Emitir eventos como `ready`, `change`, `change:data`, `selectionChange`, `destroy`.
- Padronizar payloads.

Pronto quando:

- apps conseguem salvar automaticamente ouvindo `change:data`.
- plugins conseguem reagir a selecao e documento sem acoplar em Solid/React.

Status: **iniciada** (event bus basico existe; faltam eventos padronizados adicionais).

### Fase 4 - ModelFacade e Writer

Entregas:

- Criar `editor.model.change`.
- Encapsular mutacoes atuais do `EditorState`.
- Integrar historico e agrupamento de transacoes.
- Impedir mutacao direta por plugins publicos.

Pronto quando:

- plugins novos conseguem inserir texto, blocos, imagens e tabelas via writer.
- comandos internos migrados nao manipulam estado diretamente fora da fachada.

### Fase 5 - UI extensivel

Entregas:

- Unificar `ToolbarRegistry` e `MenuRegistry` com unregister, ordem e grupos.
- Adicionar suporte a `command` em itens de toolbar/menu.
- Criar pontos de extensao para context menu, dialogs e balloons.
- Adaptar shells atuais para consumir registries.

Pronto quando:

- um plugin externo adiciona botao, menu e atalho sem alterar componentes internos.
- configuracao permite esconder, ordenar e agrupar itens.

### Fase 6 - Schema extensivel

Entregas:

- Criar `SchemaRegistry` para blocos, inline elements, marks e atributos.
- Validar mutacoes do writer contra schema.
- Definir estrategia para dados desconhecidos importados de DOCX.

Pronto quando:

- plugin consegue registrar um bloco customizado simples.
- serializacao interna preserva atributos customizados suportados.

### Fase 7 - Conversores por plugin

Entregas:

- Criar registries de DOCX import/export.
- Criar registry de PDF renderer.
- Opcionalmente criar HTML import/export se entrar no escopo publico.
- Migrar ao menos um recurso simples para conversores registrados.

Pronto quando:

- um plugin consegue importar/exportar seu dado sem editar diretamente os modulos globais de DOCX/PDF.

### Fase 8 - Pacotes e builds customizados

Entregas:

- Criar entrada `oasis-editor/plugins`.
- Separar plugins internos em exports individuais.
- Permitir build minimo e build completo.
- Revisar `package.json` exports.

Exemplo:

```ts
import { createOasisEditor } from "oasis-editor";
import { Essentials, Paragraph, TextStyle, Docx } from "oasis-editor/plugins";
```

Pronto quando:

- consumidor consegue importar so os plugins que usa.
- bundle final nao inclui plugins nao referenciados, dentro do limite pratico do Vite/Rollup.

### Fase 9 - Adaptadores React e Vue

Entregas:

- Atualizar `src/packages/react` e `src/packages/vue` para aceitar `config`.
- Expor instancia via callback/ref.
- Sincronizar props importantes sem recriar editor quando nao necessario.

Pronto quando:

- React/Vue conseguem montar editor com plugins customizados e chamar `editor.execute`.

### Fase 10 - Documentacao e exemplos

Entregas:

- Guia "Criando um plugin".
- Guia "Configurando toolbar e menu".
- Guia "Criando um build customizado".
- Exemplos de plugins: timestamp, callout, contador de palavras, botao customizado.
- Documentar APIs internas vs publicas.

Pronto quando:

- um desenvolvedor externo consegue criar plugin pequeno seguindo apenas os docs.

## Ordem recomendada

1. Fase 0: fechar contrato publico.
2. Fase 1: tornar plugins confiaveis.
3. Fase 2: centralizar comandos.
4. Fase 3: eventos.
5. Fase 5: UI extensivel.
6. Fase 4: model/writer.
7. Fase 6: schema.
8. Fase 7: conversores.
9. Fase 8: empacotamento.
10. Fase 9 e 10: adaptadores e documentacao final.

A UI extensivel pode vir antes do schema completo porque gera valor rapido: toolbar, menu e atalhos customizados ja resolvem muitos casos de uso.

## Riscos e decisoes importantes

### Compatibilidade com o modelo atual

O modelo atual de documento foi pensado para paridade com Word/DOCX. Plugins customizados podem criar dados que nao existem no DOCX. Decisao necessaria:

- permitir dados customizados apenas no formato Oasis nativo; ou
- criar fallback DOCX/PDF por plugin; ou
- preservar dados desconhecidos em metadados sem renderizacao fiel.

Recomendacao: comecar com formato Oasis nativo como fonte completa e DOCX/PDF como formatos com conversores opcionais.

### Transacoes e historico

Se plugins alterarem estado diretamente, undo/redo e selecao quebram com facilidade. O writer deve ser a unica API publica de mutacao.

### UI dependente de framework

O core deve continuar independente. Plugins de UI podem registrar descritores declarativos, e os shells renderizam esses descritores. Componentes customizados podem ser fase posterior.

### Plugins assincronos

Importadores, IA, colaboracao e assets podem exigir inicializacao assincrona. `createOasisEditor` deve poder retornar `Promise<OasisEditor>`.

### Versionamento da API

Quando a API publica for exposta, mudancas devem seguir semver. Antes disso, marcar os contratos como experimentais.

## Marco de MVP

O MVP de editor plugavel deve entregar:

- `createOasisEditor(element, config)` com `plugins`.
- `PluginCollection` com `init`, `afterInit`, `destroy` e `requires`.
- `editor.commands.register`, `editor.execute` e `editor.canExecute`.
- toolbar/menu consumindo comandos registrados.
- event bus basico.
- pelo menos 3 plugins internos migrados: `Essentials`, `TextStyle`, `Link`.
- um plugin externo de exemplo adicionando comando, toolbar, menu e atalho.

Esse MVP ja permitiria usar o Oasis como editor customizavel em aplicacoes reais, mesmo antes de schema e conversores totalmente plugaveis.

Status atual do MVP:

- `plugins` no `Editor`: **feito**.
- ciclo basico de plugin (`init/afterInit/destroy`): **feito**.
- `editor.execute` e `editor.canExecute`: **feito**.
- teclado/toolbar/menu usando comandos registrados: **feito para comandos principais**.
- event bus basico: **feito**.
- plugins internos migrados: **em andamento** (`Essentials` iniciado).
- plugin externo de exemplo completo: **pendente**.

## Exemplo de configuracao alvo

```ts
const editor = await createOasisEditor(root, {
  language: "pt-BR",
  document: {
    blocks: [],
  },
  plugins: [
    Essentials,
    Paragraph,
    TextStyle,
    Link,
    Image,
    Table,
    Docx,
    Pdf,
    TimestampPlugin,
  ],
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "bold",
      "italic",
      "underline",
      "link",
      "|",
      "insertTable",
      "insertImage",
      "insertTimestamp",
    ],
  },
  menu: {
    enabled: true,
    removeItems: ["file.print"],
  },
});
```

## Checklist inicial de engenharia

- [x] Criar tipos publicos iniciais para plugin/editor/comando em `src/core`.
- [x] Trocar `any` de `OasisPlugin.install(editor: any)` por `OasisEditor`.
- [ ] Implementar unregister em toolbar registry.
- [x] Criar runtime de comandos no core e adaptar `EditorCommandRegistry`.
- [x] Criar `editor.execute`.
- [x] Criar event bus basico (`on/once/off` + `change:data`).
- [x] Iniciar migracao de comandos para plugin interno (`Essentials`).
- [ ] Criar exemplo de plugin em `docs/examples` ou `src/examples`.
- [x] Atualizar exports de tipos publicos no pacote raiz.
- [ ] Adicionar testes unitarios para plugin lifecycle e comandos.
