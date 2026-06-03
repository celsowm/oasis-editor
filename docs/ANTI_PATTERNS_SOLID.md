# Relatório Atual de Anti-Patterns e SOLID — Oasis Editor

## Regra

!!! REGRA SUPREMA: NÃO MANTER NENHUMA RETRO COMPAT !!!

Este documento descreve apenas o estado atual do repositório em 2026-06-03.  
Não registra mais desenho antigo, transições já removidas nem workarounds de compatibilidade que não existem mais no código.

## Sumário Executivo

O projeto já saiu do estágio em que layout, plugins, IO e contratos públicos estavam concentrados em poucos arquivos gigantescos sem separação alguma. Os maiores avanços já consolidados foram:

- runtime de plugins assíncrono e coerente com os tipos;
- `canExecute(name, payload)` corrigido;
- layout compartilhado movido fisicamente para `src/layoutProjection/*`;
- IO documental dividido em importer/exporter/image insertion;
- canvas dividido em painters e com a página reduzida a binding fino;
- contratos públicos de `OasisEditorEditor` e `OasisEditorApp` reorganizados;
- tabela de operações extraída para módulos menores;
- registro do Essentials quebrado por grupos de comandos;
- `EssentialsPluginDeps` substituído por capabilities nomeadas;
- `documentPagination.ts` removido e drenado em módulos de paginação por domínio.

O projeto ainda não terminou a limpeza estrutural. Os hotspots reais remanescentes são:

1. `src/ui/OasisEditorApp.tsx` ainda é um composition root grande demais.
2. Persistência ainda usa um default concreto de IndexedDB no hook, apesar de já aceitar injeção.

## Status Atual

| Item | Status | Situação atual |
|---|---|---|
| Hooks async de plugins | Resolvido | `Editor.create(...)`, `PluginCollection.initializeAll()` e `destroy()` estão coerentes com hooks assíncronos. |
| `canExecute(name, payload)` | Resolvido | O payload é repassado para `refresh(payload)`. |
| Layout compartilhado fora de `ui` | Resolvido | O código vive em `src/layoutProjection/*`. |
| Compat layers de layout | Resolvido | `src/layoutProjection.ts` e `src/ui/layoutProjection.ts` foram removidos. |
| IO documental | Parcial | A façade está fina, mas ainda depende de adapters browser e wiring no app. |
| Canvas painters | Resolvido | Painters extraídos e a orquestração de repaint vive em `canvasPageRenderer.ts`; `CanvasEditorSurface.tsx` virou binding fino (~136 linhas). |
| `OasisEditorEditorProps` | Resolvido | O contrato foi quebrado em `layout`, `overlays`, `refs`, `surfaceHandlers`, `inputHandlers` e `fileHandlers`. |
| `OasisEditorAppProps` | Resolvido | O contrato foi quebrado em `ui`, `document` e `runtime`. |
| Operações de tabela | Parcial | Seleção, guards, spans, row/column e selection-aware já estão separados; a façade ainda agrega tudo. |
| Persistência injetável | Parcial | `useEditorPersistence` aceita `DocumentPersistence`, mas continua com singleton default. |
| Essentials por domínio | Resolvido | `EssentialsPluginDeps` é só composição de capabilities (`gate`, `style`, `history`, `formatting`, `document`, `link`, `image`, `browser`, `paragraph`, `section`, `table`). |
| `documentPagination.ts` | Resolvido | Arquivo removido; lógica drenada em `paragraphPagination`, `tablePagination`, `footnotePagination`, `sectionPagination` e `blocksPagination`. |
| Logs diretos em comandos core | Resolvido | Os pontos já identificados foram limpos. |
| `FontDialog` | Parcial | Modelo e conversões foram extraídos, mas a UI ainda concentra tabs e wiring local. |

## Hotspots Restantes

### 1. `OasisEditorApp.tsx`

Arquivo ainda com alta concentração de responsabilidades.

Hoje ele ainda faz, ao mesmo tempo:

- composição de controllers;
- wiring de estado, histórico e invalidação de layout;
- bootstrap de runtime/plugins;
- coordenação de dialogs e context menu;
- integração com clipboard, navegação, input, imagem e tabela;
- montagem dos shells.

Estado atual:

- o contrato público melhorou;
- bridges auxiliares foram extraídas para `src/ui/app/*` (`useEditorAppState`, `useEditorDialogs`, `useEditorFocus`, `useEditorRuntimePlugins`, `useEditorContextMenuClipboard`, etc.);
- wiring repetido do editor foi consolidado;
- mas o arquivo ainda tem cerca de 1100 linhas.

Diagnóstico SOLID:

- violação principal de SRP;
- risco secundário de OCP baixo, porque novas features continuam entrando no mesmo composition root.

Próximo corte recomendado:

1. extrair um `useEditorRuntimeBootstrap`;
2. extrair um `useEditorInteractionWiring`;
3. deixar o componente final apenas montar shells, overlays e loading state.

### 2. Persistência

`useEditorPersistence` já permite injeção, mas o default concreto ainda é o serviço de IndexedDB (`options.persistence ?? persistenceService`).

Diagnóstico SOLID:

- DIP melhorou, mas ainda não está completo;
- a camada continua opinando sobre uma implementação default concreta.

Próximo corte recomendado:

1. mover a escolha do backend default para bootstrap/app;
2. deixar o hook depender só de `DocumentPersistence`.

## Itens Considerados Resolvidos

Os pontos abaixo não devem mais voltar para a lista principal:

- plugin runtime assíncrono;
- `canExecute(payload)`;
- props públicas largas do editor;
- props públicas largas do app;
- layout compartilhado vivendo em `ui`;
- compatibilidade antiga de layout;
- logging direto nos comandos core já tratados;
- `CanvasPage` como camada de orquestração de repaint (agora em `canvasPageRenderer.ts`);
- `EssentialsPluginDeps` amplo (agora composição de capabilities);
- `documentPagination.ts` como hotspot central (removido e drenado).

## Ordem Recomendada de Ataque

1. reduzir `OasisEditorApp.tsx`;
2. terminar DIP da persistência.

## Critério de Encerramento

Este relatório só deve ser considerado encerrado quando:

- `OasisEditorApp.tsx` deixar de ser o principal concentrador de wiring;
- persistência não depender mais de implementação concreta default no hook.
