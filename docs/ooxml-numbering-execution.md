# Numeração e estilos pendentes — OX-011

Baseline: v0.0.413 (`b543b987`). Roadmap pai: [OX-2026-11](./ooxml-2026-11-execution-plan.md#6.6-numbering-completion). Escopo anterior: [field families](./ooxml-field-families-execution.md) (OX-010, concluído).

Este documento cobre numeração jurídica multinível, catálogo completo de `ST_NumberFormat`, marcadores com imagens, reinícios, vinculação a estilos e herança. A ordem abaixo é por dependência técnica; a tabela de mapeamento no fim mostra a correspondência um a um.

## 1. Mapeamento dos itens pedidos

| # | Item pedido | Fatia | Depende de |
|---|---|---|---|
| 1 | Todos os formatos de numeração previstos no OOXML | **N1** | nada |
| 2 | Locale efetivo para formatos dependentes de idioma | **N1** | nada |
| 3 | Serviço único de numeração (Canvas/PDF/SEQ/STYLEREF/notas/listas) | **N1** | nada |
| 4 | Numeração jurídica multinível e `lvlRestart` | **N2** | N1 |
| 5 | Vinculação a estilos e herança | **N5** | N2 |
| 6 | Reinícios e continuação | **N3** | N2 |
| 7 | Marcadores com imagens (`numPicBullet`) | **N4** | N1 |
| 8 | Preservação avançada (`multiLevelType`, `latentStyles`) | **N6** | N1 |

## 2. Contratos arquiteturais (não negociáveis)

1. **Preservação antes de avaliação.** Todo token não qualificado continua com o XML de origem intacto. `src/ooxml/word/numberingMetadata.ts:9` preserva o token cru; fallback nunca destrói a origem.
2. **Core puro.** Parsers, formatadores e planos em `src/ooxml/word/` e `src/core/` não usam DOM, relógio, UI modal ou aleatoriedade (`docs/ooxml-field-families-execution.md:28`).
3. **Serviço único.** Proibido introduzir `toRoman`/`toAlpha` ou tabela de formatos fora de `src/core/format/numberFormat.ts`. Há hoje três cópias: `src/core/model/listNumbering.ts:30-67`, `src/core/format/pageNumberFormat.ts:86-115` e `src/core/footnotes.ts:62-85`.
4. **Locale do documento ≠ locale visual.** A hierarquia é `w:lang` efetivo do conteúdo → idioma padrão do documento → configuração explícita do editor → `pt-BR`. O Ribbon continua lendo `src/i18n/` separadamente.
5. **Preservação ≠ renderização ≠ edição.** Cada formato declara os três níveis; nenhum é somado. Nada de declarar suporte integral para funcionalidade apenas preservada.
6. **Dois commits por fatia.** Commit 1 = core + testes; commit 2 = wiring/paridade. Gates do `AGENTS.md` antes de cada push.

## 3. Referências oficiais e grau de certeza

- ECMA-376 Parte 1 §17.18.41 (`ST_NumberFormat`) e §17.9 (`w:numbering`) — https://ecma-international.org/publications-and-standards/standards/ecma-376/
- MS-OI29500 §2.1.5.1 — https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/
- Matriz autoritativa: `docs/ooxml-coverage-matrix-2026-06.md:245-291,684-690`
- Recorte de escopo: `docs/ooxml-near-full-compatibility-plan.md:403-418`

**Não documentado nas fontes consultadas:** algoritmos de contagem CJK/Thai/Vietnamita (Tier C) ficam em fallback decimal + preservação do token até existir fonte oficial e oracle; `latentStyles`/`lsdException` são preservados sem semântica de edição; `multiLevelType` é preservado sem comportamento próprio.

## 4. Ordem de execução

```
N1 (catálogo + locale + serviço único)
 └→ N2 (multinível jurídico) ─┬→ N5 (estilos e herança)
                             └→ N3 (reinícios)
N4 (picture bullets)  ── depende só de N1
N6 (multiLevelType/latentStyles) ── preservação pura, por último
```

## 5. Fatia N1 — catálogo `ST_NumberFormat`, locale e serviço único

**Objetivo.** Substituir as três implementações duplicadas por um único registro determinístico, cobrindo todos os tokens que possam ser implementados sem locale externo, e registrar `pt-BR`/`en-US` para os formatos textuais.

**Arquivos novos.**
- `src/ooxml/word/numberFormat.ts` — catálogo de tokens e classificação (`counterless | decimal | alphabetic | roman | ordinalText | cardinalText | chicago | hex | ideographic | alphabeticSequence | enclosedDecimal | countingSystem | unknown`). Schema pinado como fonte da verdade; token não listado entra por atualização do inventário OX-001.
- `src/core/format/numberFormat.ts` — `formatNumberValue`, `registerNumberFormatLocale`, `numberFormatToFieldSwitch`, `fieldSwitchToNumberFormat`.
- `src/core/format/resolveNumberingLocale.ts` — hierarquia de locale.

**Regra de representação.** O union de `EditorParagraphListStyle["format"]` (`primitives.ts:108-126`) amplia-se para os tokens Tier A + B. Tokens não renderizáveis continuam fora do union e vivem em `ooxmlNumbering.format`.

**Migração.** `listNumbering.ts`, `pageNumberFormat.ts`, `footnotes.ts`, `SEQ`/`STYLEREF` (`fieldEvaluation.ts:311`, `styleReference.ts:104`), `formatSectionPageLabel` (`pageNumberFormat.ts:140`).

**Evidência.** `tests/vitest/__tests__/core/numberFormat.test.ts` (parametrizado token × locale × valor extremo), `numberingLocale.test.ts` (4 níveis), teste de arquitetura (nenhum `toRoman`/`toAlpha` fora do serviço), `extendedValidationCorpus.test.ts` estendido.

## 6. Fatia N2 — numeração jurídica multinível

`src/core/model/listNumbering.ts:132-186`: formato resolvido pelo **nível referenciado** (`%1` → nível 1), aplicação de `w:lvlRestart` (hoje importado em `numbering.ts:114-119` e ignorado), `w:isLgl` preservado, literais `lvlText` preservados, defaults `%1.`/`%1.%2.`/`%1.%2.%3.`. Contadores por `instanceId` já atravessam tabelas, text boxes e headers (`collectNumberingParagraphs:99-130`) — teste novo.

## 7. Fatia N5 — vinculação a estilos e herança

`EditorParagraphStyle.list` novo em `styles.ts:103`; `parseImportedStyles` passa a receber `numberingMaps` e ler `w:numPr` de `w:style/w:pPr` e `w:style[@type="numbering"]`; `paragraphs.ts` aplica lista do estilo quando não há `numPr` direto; `styleResolution.ts:121-141` faz merge via `basedOn` com detecção de ciclo; `buildStylesXml` emite `w:numPr`.

**Armadilha.** `STYLE_MODELED_CHILD_NAMES` em `wordSingletonSourcePatcher.ts:272-284` precisa deixar de preservar `pPr`/`numPr` de `w:style`, senão o merge duplica o nó.

## 8. Fatia N3 — reinícios e continuação

`src/core/document/listRestart.ts` novo; comandos `restartListAtSelection`/`continueListAtSelection` em `src/core/commands/list.ts`; `docxNumbering.ts:242-266` emite `w:lvlOverride/w:startOverride`. **Corrigir a matriz de cobertura**: `w:pStyle` (281), `w:lvlRestart` (284), `w:startOverride` (320) e resumo 980 já estão implementados no código, mas marcados como "Not supported".

## 9. Fatia N4 — marcadores com imagens

`src/ooxml/word/pictureBullets.ts` novo (parser de `w:numPicBullet` com `w:pict`/`w:drawing`); `bulletPicture?` em `EditorParagraphListStyle`; pintura no Canvas e no PDF; emissão de `w:numPicBullet` + rels. Fail-closed: asset não resolvível → XML preservado. **Armadilha:** `lvlPicBulletId` precisa sair da lista de filhos preservados em `numberingSourcePatcher.ts:146-155`.

## 10. Fatia N6 — preservação pura

`multiLevelType`, `latentStyles`/`lsdException`, `w:lvl/@w:tplc`, `@w:tentative`, `w:legacy`. `nsid`/`tmpl`/`pPr` de `lvl`/extensions **já são preservados** por `numberingSourcePatcher.ts` — apenas testar. Teste de fixture byte-idêntico.

## 11. Critérios de aceitação e gates

- Catálogo cobre 100% dos tokens do schema pinado; cada token classificado como preservar/renderizar/editar na matriz.
- Testes parametrizados de formato × locale × valor extremo, com round-trip DOCX.
- Zero implementação duplicada da primitiva (teste de arquitetura).
- Canvas e PDF produzem o mesmo label (teste de paridade).
- Nenhuma funcionalidade apenas preservada é descrita como suportada.
- Gates: `typecheck`, lint, `npm test`, `audit:ribbon`, `check:imports`, `ooxml:audit`, validação OOXML independente (`OOXML_VALIDATION_CORPUS`), harness browser quando houver UI, `pull --rebase`, push; aguardar Build/Deploy e Publish antes do push seguinte.

## 12. Riscos e armadilhas

1. `MODELED_LEVEL_CHILDREN` (`numberingSourcePatcher.ts:146-155`) — modelar `lvlPicBulletId` sem removê-lo da preservação duplica o nó.
2. `STYLE_MODELED_CHILD_NAMES` (`wordSingletonSourcePatcher.ts:272-284`) — idem para `numPr` em estilos.
3. `ooxmlNumbering` não está declarado em `EditorParagraphListStyle`; é anexado por cast em `numberingMetadata.ts:19`. `cloneParagraphList` copia por spread — metadata sobrevive.
4. `docxNumbering.ts:266` é template string única — N3/N4 a convertem em composição por partes.
5. `FORMAT_MAP` (`numbering.ts:42-49`) e o union do modelo (`primitives.ts:108-114,119-126`) duplicam a mesma lista — N1 unifica.
6. `getEffectiveEditorListOoxmlFormat` (`numberingMetadata.ts:47-59`) só devolve o token cru se o usuário não editou o formato — edição explícita vence.
7. `getAlignedListLabelInset` (`textMeasurement/indentation.ts:88`) mede o label em px — picture bullet muda a métrica.

## 13. Status de implementação (baseline b543b987)

| Fatia | Módulos novos/extendidos | Testes |
|---|---|---|
| N1 | `src/ooxml/word/numberFormat.ts`, `src/core/format/numberFormat.ts`, `src/core/format/resolveNumberingLocale.ts`, migração de `listNumbering.ts`, `pageNumberFormat.ts`, `footnotes.ts`, `numbering.ts`, `commands/list.ts`, seletor da ribbons e i18n | `core/numberFormat.test.ts` (69 parametrizados), `core/numberingLocale.test.ts` (5), `core/numberFormatServiceArchitecture.test.ts` (1) |

N1 concluída: catálogo completo de `ST_NumberFormat`, resolvedor de locale em 4 níveis, serviço único substituindo as três primitivas duplicadas. Tokens de contagem seguem preservados e renderizados como decimal, conforme registrado na matriz.

Gates N1: `npm run typecheck` limpo; `npm test` 2554 passed / 3 skipped.

| N2 | `src/core/model/listNumbering.ts` (formato por nível referenciado, `lvlRestart`, counters de nível pai) | `core/multilevelNumbering.test.ts` (5) |

N2 concluída: rótulos de 3 níveis com formato distinto por nível referenciado, reinício de contadores por `w:lvlRestart`, `isLgl`, literais e continuidade através de tabelas. Matriz de cobertura corrigida para `w:lvlRestart`.

## 14. Limitações restantes (deliberadas, fail-closed)

- Tier C (contagem CJK/Thai/Vietnamita): fallback decimal + token preservado enquanto não houver fonte oficial do algoritmo.
- `ordinal`/`cardinalText`/`ordinalText`/`chicago`: apenas `pt-BR` e `en-US`; demais locales caem no fallback até serem registrados.
- Sem `w:lang` e sem configuração do editor: `pt-BR` (decisão explícita; não é o default do Word).
- `multiLevelType` e latent styles: apenas preservados.
