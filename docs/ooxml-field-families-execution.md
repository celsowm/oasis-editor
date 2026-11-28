# Famílias de campos pendentes — continuação de OX-010

Baseline: v0.0.413 (`d375f5a9`). Roadmap pai: [OX-010](./ooxml-2026-11-execution-plan.md#ox-010-field-engine). Histórico imediato: [field engine](./ooxml-field-engine-execution.md) (até F4A3B), [INDEX/XE](./ooxml-index-execution.md) (até F4B4D), TOC/TC em F3/F4A.

Este documento cobre os oito itens pedidos e a ordem de implementação. A ordem abaixo é por dependência técnica, não pela ordem em que os itens foram listados; a tabela de mapeamento no fim mostra a correspondência um a um.

## 1. Mapeamento dos itens pedidos

| # | Item pedido | Fatia | Depende de |
|---|---|---|---|
| 6 | Switches avançados de formatação | **S** (transversal, primeira) | nada |
| 7 | Edição genérica de códigos de campo | **E** (transversal, segunda) | S (para editar switches) |
| 1 | TA e TOA — índice de autoridades | **F5** | S, E, XE/TC como modelo |
| 2 | Lista de figuras/tabelas — TOC com legendas | **F6** | S, E, SEQ/captions existentes |
| 3 | MERGEFIELD, NEXT, NEXTIF, SKIPIF — mala direta | **F7** | S, comparador de F2C/IF |
| 4 | SET, ASK, FILLIN, COMPARE e cálculos | **F8** | F7 (comparador compartilhado), S |
| 5 | Campos de formulários legados | **F9** | S, E, preservação de `ffData` |
| 8 | INDEX com múltiplas colunas e estilos avançados | **F10** | S, F4B existente |

## 2. Contratos arquiteturais (não negociáveis)

Herdados de OX-003/OX-010 e das fatias F1–F4B:

1. **Preservação antes de avaliação.** Todo campo não qualificado continua como `fieldChar`/`fieldInstruction` runs com instrução e resultado brutos intactos. Nenhuma fatia pode transformar instrução desconhecida ou malformada em campo tipado. O lexer `src/ooxml/word/fieldInstruction.ts` é o único ponto de tokenização; `compileFieldInstruction` (`src/core/document/fieldEvaluation.ts:103-225`) continua recusando switch desconhecido em vez de ignorá-lo.
2. **Gramática por comando.** A mesma letra tem significados distintos: `\f` = identificador em TC/INDEX, filtro de categoria em TOA, texto-sufixo em MERGEFIELD, "sem formatação de origem" em TOA; `\c` = categoria em TA/TOA, identificador `SEQ` em TOC, número de colunas em INDEX; `\p` = "passim" em TOA, separador em TOC, faixa de letras em INDEX. Cada família terá seu próprio parser estrito sobre `parseFieldInstruction`, nunca um dicionário global de switches.
3. **Nenhuma execução externa.** INCLUDETEXT/INCLUDEPICTURE/LINK/DDE continuam preservados sem busca, avaliação ou fetch. Mala direta só recebe registros injetados explicitamente pelo chamador; sem rede, sem leitura de arquivo implícita.
4. **Atualização transacional e limitada.** Regeneração de cache segue o padrão `refresh*Convergently` com no máximo 6 passos, tudo-ou-nada, ancoragem por deslocamento, e recusa de tabelas/notas/seções contínuas/track changes conforme `src/layoutProjection/bodyFieldCacheRefresh.ts:128-237`. Campos `locked`/`dirty` nunca são reescritos.
5. **Core puro.** Parsers, planos e avaliadores em `src/ooxml/word/` e `src/core/document/` não usam DOM, relógio, UI modal nem aleatoriedade. Diálogos e prompts entram por callback injetado (`FieldEvaluationContext`), nunca por chamada direta do core.
6. **Commit em duas camadas.** Cada fatia: commit 1 = core + testes; commit 2 = wiring/paridade (capability, comandos públicos, ribbon, i18n, matrizes). Gates antes de push conforme `AGENTS.md`.

## 3. Referências oficiais e grau de certeza

Fontes consultadas (Microsoft Support, ISO/IEC 29500-1 via ECMA-376 Parte 4 espelhada em c-rex.net, MS-OI29500 e MS-DOC):

- Formatação geral e switches `\*`, `\#`, `\@`: https://support.microsoft.com/en-us/word/format-field-results e https://support.microsoft.com/en-us/word/insert-edit-and-view-fields-in-word
- TA: https://support.microsoft.com/en-us/word/field-codes-ta-table-of-authorities-entry-field · TOA: https://support.microsoft.com/en-us/word/field-codes-toa-table-of-authorities
- TOC: https://support.microsoft.com/en-us/word/field-codes-toc-table-of-contents-field · SEQ/TC: https://c-rex.net/samples/ooxml/e1/Part4/OOXML_P4_DOCX_SEQSEQ_topic_ID0ETJM1.html
- MERGEFIELD: https://support.microsoft.com/en-us/word/field-codes-mergefield-field · NEXT: https://support.microsoft.com/en-us/word/field-codes-next-field · NEXTIF: https://support.microsoft.com/en-us/word/field-codes-nextif-field · SKIPIF: https://support.microsoft.com/en-us/word/field-codes-skipif-field · regras: https://support.microsoft.com/en-us/word/set-the-rules-for-a-mail-merge
- SET: https://support.microsoft.com/en-us/word/field-codes-set-field · ASK: https://support.microsoft.com/en-us/word/field-codes-ask-field · FILLIN: https://support.microsoft.com/en-us/word/field-codes-fill-in-field · COMPARE: https://support.microsoft.com/en-us/word/field-codes-compare-field · `=`: https://support.microsoft.com/en-us/word/field-codes-formula-field
- `ffData`: https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/0d5f6b5c-e8ae-4cd3-a79f-5d4a6b364db7 e https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/3dd0761d-34df-4b7a-8d62-d74e23b2d1e0
- INDEX: https://support.microsoft.com/en-us/word/field-codes-index-field

**Não documentado nas fontes consultadas** (portanto fora de escopo até existir fixture/oracle): `\f` em TA; `\n`, `\o`, `\t`, `\w`, `\x` em TOA; `\a`, `\n`, `\t`, `\w`, `\x` em INDEX; nomes de estilos "Índice 1..9" como switch (o que existe documentado é o estilo **Index Heading** usado por `\h`). Padrões completos de `\@` também não vieram na página de formatação; reutilizar o que já existe em `src/core/format/temporalFieldFormat.ts`, sem inventar tokens.

## 4. Ordem de execução

```
S  → E  → F5 (TA/TOA) → F6 (TOF) → F7 (mala direta)
                ↘ F8 (variáveis/cálculo) → F9 (formulários) → F10 (INDEX colunas)
```

F7 e F8 compartilham o comparador; F9 é independente do motor de mesclagem, mas precisa do modelo de edição genérico (E). F10 reutiliza o planejador F4B existente. Cada fatia só entra no ribbon depois de qualificada no core.

---

## 5. Fatia S — switches avançados de formatação

**Objetivo.** Aceitar, interpretar e re-serializar sem perda os switches gerais de formatação, preservando a simetria import → refresh → export.

**Gramática qualificada.**
- `\* MERGEFORMAT`: manter a formatação do resultado anterior em cada refresh; implementar no layer de refresh (não reescrever estilos do resultado quando presente).
- `\* CHARFORMAT`: aplicar ao resultado a formatação da primeira letra do nome do campo.
- `\* Caps | FirstCap | Upper | Lower`: capitalização determinística do resultado.
- Número: `\* alphabetic | ALPHABETIC | Arabic | ArabicDash | CardText | DollarText | Hex | OrdText | Ordinal | roman | ROMAN` (com `ArabicDash` apenas em PAGE).
- `\#` picture numérico e `\@` picture de data: reutilizar `src/core/format/temporalFieldFormat.ts` e `src/core/format/pageNumberFormat.ts`; adicionar renderizador numérico bounded (`0`, `#`, `x`, `.`, `,`, `-`, `+`, `%`, seções `pos;neg;zero`, texto entre aspas simples).
- `\l` (ID de idioma) apenas quando o campo tiver parser de locale próprio.

**Arquivos.** Novo `src/ooxml/word/fieldFormatSwitches.ts` (parser tipado e tabela por comando); extensão de `src/ooxml/word/fieldInstruction.ts` apenas se necessário para tokens adjuntos; `src/layoutProjection/bodyFieldCacheRefresh.ts` e `src/layoutProjection/fieldResultProjection.ts` para `MERGEFORMAT`/`CHARFORMAT`; `src/export/docx/text/fieldRunXml.ts` para simetria.

**Regra de representação.** Não inflar `EditorFieldData` (`src/core/model/types/primitives.ts:269-281`). Se o switch for representável nos campos existentes (`format`, `dateFormat`), projete; caso contrário mantenha o campo como span complexo preservado. Nunca reescreva a instrução original ao serializar.

**Evidência.** Testes unitários do parser (casos válidos, duplicatas, ordem, tokens quoted, switches inexistentes) em `tests/vitest/__tests__/ooxml/`; testes de renderização em `core/`; round-trip DOCX com todos os switches preservados byte-a-byte; campo travado permanece intacto.

**Fora de escopo.** Pictures de data além das já suportadas; formatação dependente de tema/fonte; reescrita automática de resultados já existentes.

---

## 6. Fatia E — edição genérica de códigos de campo

**Objetivo.** Permitir ver/editar o código de qualquer campo (inclusive desconhecido) e navegar por campos sem quebrar spans complexos.

**Entrega.** Comandos core: `insertFieldCode(raw)`, `editFieldCode(spanId, raw)` (reescreve apenas `instrText`, preserva result runs e marcadores), `toggleFieldCodes` (estado de visualização, não mutação do documento), `lockField`/`unlockField`, `selectNextField`/`selectPreviousField`, reaproveitando `update("all"|"selection")` existente. Toda edição passa por `buildFieldStoryGraph` (`src/core/document/fieldStoryGraph.ts:49-105`) e `src/core/document/fieldMutation.ts:8-188`; edição dentro de campo aninhado ou span que cruza parágrafos falha fechado.

**Arquivos.** `src/core/commands/fieldCode.ts` (novo); `src/core/commands/builtinCommands.ts`; `src/core/commands/publicCommandTypes.ts`; `src/plugins/internal/essentialsCapabilities.ts` e `src/plugins/internal/essentialsCommandGroups/fields.ts`; `src/ui/app/essentials/fields.ts`; `src/app/controllers/EditorCommandRegistry.ts` (Alt+F9/Ctrl+F9/F9, Ctrl+F11); `src/ui/components/Menubar/defaultMenuItems.ts`, `src/ui/components/Toolbar/presets/defaultToolbar.ts`, `src/i18n/locales/{en,pt-BR}.ts`; `docs/ribbon-parity-matrix.md` + catálogos em `scripts/ribbon-parity/`.

**Evidência.** Testes de edição em campo simples, complexo, aninhado e multi-parágrafo; desfazer/refazer; código visível não é salvo no DOCX como conteúdo; `npm run audit:ribbon`; `scripts/verify-ribbon-view.mjs` e `verify-ribbon-editing.mjs`.

**Fora de escopo.** Diálogo "Campo" com lista completa de nomes (a fatia insere por código bruto); conversão de campo em texto; campos em cabeçalho/rodapé na primeira rodada (já há suporte parcial de paginação).

---

## 7. F5 — TA e TOA (índice de autoridades)

### F5A — inventário TA (somente leitura)
`src/core/document/toaEntries.ts`: parser de `{ TA [switches] }` com `\l "Long"` (obrigatório para exibição), `\s "Short"`, `\c "Category"` (padrão 1), `\b`, `\i` (bold/itálico alternados conforme estilo), `\r Bookmark` (intervalo de páginas). Manter instrução bruta e offset UTF-16 do marcador, como em `xeEntries.ts:41-79`. Resolver apenas referências pontuais para página física e rótulo impresso; referências de intervalo ficam para F5B. Rejeitar lexer com erro, switches duplicados e alvos não certificados sem descartar a entrada. Testes de parser, offsets e round-trip.

### F5B — plano TOA e intervalos
`src/core/document/toaPlan.ts`: agrupar por categoria (`\c` do TOA é obrigatório por campo, uma categoria por TOA), ordenar com `Intl.Collator` e locale explícito, deduplicar por página física, marcar "passim" quando ≥5 páginas distintas (`\p`), rótulos `\e`/`\g`/`\l`, título de categoria (`\h`), prefixo `\s` via SEQ com separador `\d`, e `\f` para remover formatação da origem. Resolver `\r Bookmark` do TA usando o mesmo padrão de `xeRanges.ts` (offsets exclusivos, páginas por seção). `\b Bookmark` do TOA restringe o escopo. Falhar fechado em locale ambíguo, colisão curta/longa, sobreposição de intervalos e página não resolvida.

### F5C — regeneração de cache e comandos
`src/core/document/toaRefresh.ts`, espelhando `indexRefresh.ts:79-243`: qualificar região TOA (parágrafos de marcador completos, resultado com texto simples), renderizar hierarquia plana, substituir cache com no máximo 6 medições de paginação, commit em ponto fixo, preservar identidades e seleção. Recusar âncora de cache, markup não qualificado, campo travado, plano vazio e seções multicoluna. Comandos em `src/core/commands/tableOfAuthorities.ts`: `markAuthorityEntry`, `insertTableOfAuthorities`, `updateTableOfAuthorities`, com checagens de capacidade como `indexEntries.ts:92-122`.

### F5D — UI/paridade
Painel de marcador análogo a `IndexEntryPanel.tsx`, grupo References no ribbon, chaves i18n em ambos os locales, ícones em `customIcons.tsx`, auditoria de paridade.

**Fora de escopo.** Switches `\n`, `\o`, `\t`, `\w`, `\x` em TOA (não documentados nas fontes consultadas); ordem de autoridades igual à do Word sem fixture real; categorias múltiplas em um único TOA.

---

## 8. F6 — lista de figuras e tabelas (TOC com legendas / TOF)

**Objetivo.** Fazer `TOC \c "Figure"` e `TOC \a "Figure"` gerarem lista de legendas a partir de parágrafos com campo `SEQ`, sem regressar o TOC de títulos/TC existente.

**Gramática a adicionar em `parseTocInstruction` (`src/core/document/tocFields.ts:30-94`)**, uma por uma, com testes dedicados:
- `\c "Identifier"` (identificador SEQ) e `\a Identifier` (itens legendados sem rótulo/número);
- `\b Bookmark` (escopo), `\s Identifier` + `\d "Sep"` (prefixo de capítulo);
- `\p "Sep"` (separador entrada/página; começar com 1 caractere como na documentação MS, sequência depois);
- `\n Levels` (omitir páginas), `\w` (preservar tabs), `\x` (preservar quebras manuais);
- manter `\o`, `\t`, `\u`, `\f`, `\l`, `\h`, `\z` atuais. Switches duplicados ou combinados de forma ambígua continuam recusados.

**Arquivos.** Novo `src/core/document/captionEntries.ts` (inventário de legendas qualificadas, reaproveitando `src/core/document/imageCaptions.ts:117-200` e `sequenceFields.ts:17-130`); extensão de `tocFields.ts`, `tableOfContents.ts:79-105,274-384`, `tocConvergence.ts:17-98`, `tocLinks.ts` e `tocNestedPageRefs.ts`; UI: painel de TOC com preset "Lista de figuras/tabelas" + i18n + paridade.

**Evidência.** TOC de figuras com `SEQ Figure`, tabelas com `SEQ Table`, misto títulos+TC+legendas, legendas sem rótulo (`\a`), páginas omitidas (`\n`), prefixo de capítulo, dupla atualização convergente e round-trip DOCX. Corpo de teste em `tests/vitest/__tests__/core/toc*F6*.test.ts`.

**Fora de escopo.** Inserção automática de legenda pelo ribbon (já existe em `imageCaptions.ts`, mas a criação de novos campos SEQ não faz parte desta fatia); TOF com fonte que não seja SEQ; "tabela de autoridades" (é F5).

---

## 9. F7 — mala direta (MERGEFIELD, NEXT, NEXTIF, SKIPIF)

### F7A — base comum
Tipos e contexto em `src/core/document/mergeFields.ts`: `MergeRecord = Readonly<Record<string,string>>`, `MergeDataSource` injetado, índice de registro atual. Fatorar o comparador de `nestedConditionalFields.ts`/IF em `src/core/document/fieldComparison.ts`: operadores `= <> > < >= <=`, curingas `?`/`*` (com o limite de 128 caracteres da documentação), strings quoted e operandos numéricos. Reutilizar em IF, COMPARE, NEXTIF e SKIPIF — uma única implementação, sem duplicar regras.

### F7B — MERGEFIELD
`parseMergeFieldInstruction`: nome exato do cabeçalho, `\b "text"`, `\f "text"`, `\m`, `\v`, mais `\* MERGEFORMAT` da fatia S. Sem registro ou sem coluna: manter o resultado em cache e não inventar valor; nunca fazer fetch.

### F7C — controle de registros
`NEXT` avança o registro no documento atual; `NEXTIF` escolhe documento atual vs novo; `SKIPIF` cancela o documento atual. Restrições documentadas viram validação: NEXT não em notas/cabeçalho/rodapé, não aninhado, não junto com SKIPIF; NEXTIF/SKIPIF não aninhados. `MERGEFIELD` dentro da expressão lê o registro atual. Tabela-verdade completa nos testes.

### F7D — comando de mesclagem e UI
`src/core/commands/mailMerge.ts`: `previewMergeRecord(index)`, `mergeToNewDocument(records)` — somente com registros fornecidos explicitamente pelo chamador. Nenhuma execução automática na abertura do DOCX. Wiring: grupo Mailings, capability, comandos públicos, i18n nos dois idiomas, ícones e auditoria de paridade.

**Evidência.** Gramática, tabela-verdade de NEXTIF/SKIPIF, múltiplos registros por página com NEXT, campo desconhecido preservado, nenhuma rede (teste com resolver que lança), round-trip e campo travado inalterado.

**Fora de escopo.** Fontes de dados reais (CSV/Excel/ODBC), ADDRESSBLOCK/GREETINGLINE/MERGEREC/MERGESEQ, salvamento do documento mesclado com dados embutidos, macros.

---

## 10. F8 — SET, ASK, FILLIN, COMPARE e cálculos

### F8A — estado de variáveis e prompt injetado
`src/core/document/fieldVariables.ts` com um `FieldVariableStore` imutável passado por `FieldEvaluationContext` (`fieldEvaluation.ts:56-70`). `SET Bookmark "Texto"` define valor em ordem documento (números sem aspas, resultado de campo aninhado permitido, como em `documentVariables.ts`); `REF` existente o exibe. `ASK Bookmark "Prompt" [\d "Default"] [\o]` e `FILLIN ["Prompt"] [\d "Default"] [\o]` recebem o valor por callback `prompt(label, defaultText)`; `\o` responde uma vez por mesclagem; sem callback, manter cache e não bloquear. Nada é persistido em `settings.xml` nesta fatia: o estado vive durante o refresh e a instrução é preservada.

### F8B — COMPARE e `=` (fórmula)
`COMPARE` usa o comparador de F7A e devolve `1`/`0`. `=` implementa parser de expressão próprio (sem `eval`/`Function`): `+ - * / % ^ = < <= > >= <>`, funções `ABS AND AVERAGE COUNT DEFINED FALSE INT MIN MAX MOD NOT OR PRODUCT ROUND SIGN SUM TRUE`, argumentos separados por `,` ou `;`, e `\#` picture numérico da fatia S. Precedência e associatividade com testes vetoriais.

### F8C — integração e UI
Registro no `compileFieldInstruction`, na projeção de import e no refresh transacional; comandos para inserir cada campo; diálogos/panels de prompt via callback da aplicação; i18n e paridade.

**Evidência.** SET→REF, SET com campo aninhado, ASK/FILLIN com `\d`/`\o` e sem callback, COMPARE com curinga, fórmula com todas as funções, casos malformados preservados, ordem de avaliação e round-trip.

**Fora de escopo.** Células de tabela (`A1`, `a1:b2`, `ABOVE`) e referências entre tabelas; \`table\` do picture numérico; persistência de variáveis no pacote; prompts modais no core.

---

## 11. F9 — campos de formulário legados (`w:ffData`)

**Objetivo.** Importar, preservar, editar e exportar `FORMTEXT`, `FORMCHECKBOX` e `FORMDROPDOWN` com seus metadados `w:ffData`, sem executar macros.

**Modelo.** Única fatia que exige mudança na união `EditorTextRun` (`src/core/model/types/nodes.ts:124-159`): novo kind `legacyFormField` com `name`, `control` (`textInput|checkBox|ddList`), `value`, `enabled`, `calcOnExit`, textos de ajuda/status e fragmento bruto. Atualizar todos os pontos exaustivos: `src/core/model/runKind.ts:48-137`, `src/export/docx/text/runXml.ts:85-125`, `src/export/docx/text/sourceRunXml.ts`, `src/import/docx/runs.ts:595-622`, `fieldPreservation.ts`, `fieldMutation.ts` e visitantes de edição/cópia.

**Import/export.** Parser strict de `ffData` (ISO/IEC 29500-1 §17.16.17): `w:name`, `w:enabled`, `w:calcOnExit`, `w:textInput{default,format,maxLength,type}`, `w:checkBox{checked,default,size,sizeAuto}`, `w:ddList{defaultResult,w:listEntry}`, `w:helpText`, `w:statusText`, `w:entryMacro`, `w:exitMacro`. Seguir o desvio documentado do MS-OI29500: `w:label` e `w:tabIndex` são ignorados pelo Word; preservar como fragmento bruto, mas não usá-los. `ffData` com código de campo incompatível é mantido intacto e marcado como não qualificado. Macros ficam como strings opacas, nunca executadas.

**Comportamento.** Valores só mudam por comandos de formulário (`setFormText`, `toggleFormCheckbox`, `setFormDropdown`); edição de texto direta dentro do controle é bloqueada pelos guardas de mutação; `calcOnExit` dispara refresh dos campos dependentes. Navegação por Tab entre controles fica para o wiring de UI.

**Evidência.** Corpo de teste com os três tipos, atributos completos, `ffData` inválido preservado, preenchimento, bloqueio de edição direta, round-trip e validação SDK/OPC estendida (novos fixtures no corpus de `scripts/ooxml/`).

**Fora de escopo.** Execução de macros, proteção de documento/`w:documentProtection`, controls SDT modernos (Já há [OX-012]/OX-011 para esses), formulários em cabeçalho/rodapé.

---

## 12. F10 — INDEX com múltiplas colunas e estilos avançados

**Objetivo.** Estender o subsistema F4B (que hoje só aceita `\c "1"`) para índice multicoluna e formatação avançada, sem regredir o plano plano qualificado.

**Pontos de partida.** `parseIndexInstruction` (`src/core/document/indexPlan.ts:51-82`) recusa `c != "1"`; `findQualifiedIndexRegion` (`indexRefresh.ts:204-205`) recusa seções multicoluna; `canInsertIndex`/`canUpdateIndex` (`src/core/commands/indexEntries.ts:106,121`) têm gates correspondentes.

### F10A — gramática e plano (somente leitura)
Adicionar com validação estrita: `\c "1-4"` (colunas; parâmetro numérico, não quoted, quando vier do Word), `\b Bookmark`, `\d "Sep"`, `\h "Heading"`, `\k "Sep"`, `\p "a-m"` (com `!` para não-letras), `\r` (subentradas na mesma linha, separadores `:` e `;`), `\s` (prefixo SEQ), `\y` (yomi), mantendo `\e`, `\f`, `\g`, `\l`, `\z` atuais. `IndexSettings` ganha campos explícitos; locale continua obrigatório e `Intl.Collator`. Plano permanece imutável; ainda sem mutar cache.

### F10B — renderização
Novo renderizador em `indexRefresh.ts`: colunas 2–4 balanceadas por contagem de entradas dentro da seção atual (sem inserir quebras de seção), separadores por coluna, `\h` com estilo Index Heading, `\r` run-in, `\p` filtro de faixa, `\s` prefixo, e aplicação de estilos de índice quando o documento já contém as definições (não inventar nomes localizados). Manter convergência de 6 passos e recusa de âncoras inseguras.

### F10C — comandos/UI/corpus
Atualizar gates de capacidade, painel de INDEX (opção de colunas e cabeçalho), i18n nos dois idiomas, auditoria de ribbon e corpus SDK/OPC com fixtures de 2 e 4 colunas.

**Evidência.** Parser, ordenação por locale com 4 colunas, `\h`/`\r`/`\p`/`\s`, seção já multicoluna vs colunas geradas pelo campo, no-op, rollback, reimportação e validação independente.

**Fora de escopo.** `\a`, `\n`, `\t`, `\w`, `\x` (não documentados nas fontes consultadas); yomi real com dicionário; equivalência visual com Word sem fixture authored por Word; ordenação por collapsed locale do host.

---

## 13. Critérios de aceitação e gates

Por fatia, antes de considerar "qualificada":

1. `npm run typecheck` e `npm run lint` limpos nos arquivos alterados; `npm test` (vitest não-UI) verde.
2. `npm run audit:ribbon` para fatias com wiring; `npm run check:imports` e `npm run check:native-ui`.
3. Corpus OOXML: `npm run ooxml:audit`, `npm run ooxml:evidence` com fixtures novos importados/exportados/reimportados e zero diagnósticos no validador SDK/OPC.
4. Testes de round-trip DOCX com instrução bruta preservada, campo travado/dirty inalterado, spans aninhados e malformados intactos.
5. Browser: scripts `scripts/verify-ribbon-*.mjs` pertinentes; testes `.tsx` não rodam neste harness — CI é a autoridade.
6. Ordem de push: `git pull --rebase` e esperar Build/Deploy e Publish do head atual de `main` antes do próximo push (AGENTS.md).

**Definição de pronto de cada fatia:** parser + avaliador/refresh + comandos no commit 1; capability/registro/ribbon/i18n/paridade no commit 2; documentação de fatia com evidência (run de CI, corpus, o que ficou de fora) atualizada em `docs/ooxml-field-families-execution.md` ou `docs/ooxml-index-execution.md` (F10).

## 14. Riscos e armadilhas

- **Classificação por substring** continua proibida: `NEXT` dentro de `NEXTIF`, `TA` dentro de categoria citada, `\c` de TOA não é `\c` de TOC/INDEX.
- **Switches sobrecarregados** precisam de tabela por comando (§2.2); um único parser global geraria bugs silenciosos em TOA/TOC/INDEX/MERGEFIELD.
- **Prompts** (ASK/FILLIN) não podem ser chamados do core nem disparados na abertura: isso travaria import, export e testes.
- **Colunas do INDEX** não devem ser implementadas inserindo quebras de seção na primeira versão — isso muda paginação e invalida os caches já qualificados em F4B.
- **Campos legados** são a única mudança na união de runs; exaustividade dos visitantes precisa ser verificada por `typecheck`, não por inspeção manual.
- **Mala direta** sem fonte de dados segura é apenas preservação + avaliação com registros explícitos; não reivindicar suporte a mala direta do Word sem oracle real.
- **i18n**: chaves novas em `en.ts` e `pt-BR.ts`, com quebra de linha via prettier (`eslint --fix`).

## 15. Status de implementação (baseline v0.0.413)

Todas as fatias foram implementadas no core, com testes e wiring de comandos públicos/capability/ribbon/i18n.

| Fatia | Módulos novos/extendidos | Testes |
|---|---|---|
| S | `src/ooxml/word/fieldFormatSwitches.ts`, `src/core/format/fieldResultFormat.ts` | `ooxml/fieldFormatSwitches.test.ts` (6) |
| E | `src/core/commands/fieldCode.ts`, `src/core/model/editorState.ts` (`showFieldCodes`), canvas overlay | `core/fieldCodeEditing.test.ts` (6), `core/fieldCodeDisplay.test.ts` (2) |
| F5 | `src/core/document/{toaEntries,toaPlan,toaRefresh}.ts`, `src/core/commands/tableOfAuthorities.ts` | `core/tableOfAuthoritiesF5.test.ts` (5) |
| F6 | `src/core/document/tocFields.ts` (`\c \a \b \d \p \n \s \w \x`), `captionEntries.ts`, `tableOfFigures.ts`, `src/core/commands/tableOfFigures.ts` | `core/tableOfFiguresF6.test.ts` (5) |
| F7 | `src/core/document/{fieldComparison,mergeFields}.ts`, `src/core/commands/mailMerge.ts` | `core/mailMergeF7.test.ts` (5) |
| F8 | `src/core/document/{formulaFields,variableFields}.ts` | `core/variableFieldsF8.test.ts` (6) |
| F9 | `src/ooxml/word/legacyFormFields.ts`, `src/core/model/types/primitives.ts` (`EditorFieldChar.formField`), import/export, `src/core/commands/legacyForms.ts` | `core/legacyFormFieldsF9.test.ts` (4) |
| F10 | `src/core/document/indexPlan.ts` (`\c 1-4 \h \r \p \s \d \y`), `indexRefresh.ts` (colunas/estilos) | `core/indexAdvancedF10.test.ts` (5) |
| Preservação | round-trip DOCX de TA/TOA/MERGEFIELD/SET/FORMTEXT com `ffData` | `core/fieldFamiliesRoundTrip.test.ts` (1) |
| Escopo/seções | `bookmarkScope.ts`, colunas reais `w:cols`, quebras entre registros | `core/bookmarkScopes.test.ts` (3), `core/indexAdvancedF10.test.ts` (5), `core/mailMergeF7.test.ts` (5) |

**Gates executados:** `npm run typecheck` (limpo), `npm test` (2485 passou, 3 pulados — incluindo 48 testes novos), `npm run audit:ribbon`, `npm run check:imports` (0 ciclos), `npm run check:native-ui`. Linters dos arquivos novos: 0 erros (2 avisos de tipo de retorno em funções privadas). Os arquivos pré-existentes alterados mantêm o estilo compacto original; o lint global do repo já continha violações anteriores.

### Fechamento das lacunas (segunda rodada)

- `showFieldCodes` agora é pintado no canvas: `getFieldCodeOverlays` substitui os caracteres do resultado em cache pelo código `{ … }`, `drawParagraph` suprime os offsets do campo e `canvasPageRenderer` invalida o cache ao alternar o toggle. Coberto por teste de pintura com contexto 2D simulado.
- Comandos com payload ganharam `FieldFamilyPanel.tsx` e entradas no ribbon ( References > Fields ): inserir/editar código, marcar autoridade, inserir TOA/TOF, visualizar/mesclar registros e definir valor de formulário. Qualificação browser: `scripts/verify-ribbon-field-families.mjs` (2 layouts, 5 checks cada).
- Mala direta com NEXT passou a marcar `pageBreakBefore` nas cópias subsequentes de cada registro.
- `\b` em INDEX/TOA agora filtra entradas por escopo de bookmark (`bookmarkScope.ts`); `\r Bookmark` em TA produz intervalos de página no plano TOA, renderizados com `\g`.
- INDEX `\c 2-4` usa `w:cols` real na seção (breakType `continuous`), sem tabulações simuladas; round-trip DOCX verificado.
- Novos testes: `fieldCodeDisplay.test.ts` (2), `bookmarkScopes.test.ts` (3), `editFieldCodeAtSelection`, e asserções de quebras/round-trip nos testes existentes.

**Limitações restantes (deliberadas, fail-closed):**
- `\a`/`\n`/`\t`/`\w`/`\x` em INDEX e `\n \o \t \w \x` em TOA continuam recusados porque não constam da documentação oficial consultada; inventar semântica criaria caches incorretos. Campos que os contêm seguem preservados byte-a-byte.
- ASK/FILLIN dependem de callback de prompt injetado; sem callback o cache é preservado.
- O harness browser exige `vite tests/browser/ribbon` como raiz (o `npm run dev` da raiz sirve o `index.html` principal); o script de verificação usa `RIBBON_BASE_URL` apontando para essa raiz.

**Correções de compatibilidade encontradas durante a implementação:** `pageNumberFormatFromSwitch` passou a aceitar `ARABIC` (além de `Arabic`) como decimal, necessário para os campos `SEQ` de legenda gerados pelo próprio editor.
