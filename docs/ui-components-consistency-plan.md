# Plano: Consistência de componentes de UI nos diálogos

## Problema

Existem **duas camadas de UI coexistindo**, usadas de forma inconsistente:

1. **Camada de componentes públicos** (`src/ui/public/`) — `Button`, `IconButton`,
   `TextField`, `Checkbox`, `SelectField`, `DialogFooter`, etc. Padronizam classes CSS
   (`oasis-editor-ui-*`), acessibilidade (`for`/`id` via `createUniqueId`, `aria-invalid`,
   `aria-describedby`), `label`/`description`/`error` e callbacks tipados (`onChange(value)`).
   **Usam design tokens** (`var(--oasis-*)`), então respondem a tema.

2. **HTML/forms na mão** — `<input>`, `<select>`, `<button>`, `<label>` crus, com classes
   `oasis-editor-dialog-*` e `onInput={e => ...e.currentTarget.value}` repetido em cada campo.
   **Usam cores hardcoded** (`#dadce0`, `#1a73e8`, `#70757a`), então não respondem a tema.

A toolbar (`groups/`, `FloatingTableToolbar`) já usa `<Button>` corretamente. Os **diálogos
de formulário** continuam todos no padrão cru.

### Inventário do HTML cru nos diálogos

| Arquivo | input | select | button | tipos de input |
|---|---|---|---|---|
| `font-dialog/FontTab.tsx` | 16 | 5 | 0 | text, checkbox |
| `ParagraphDialog.tsx` | 13 | 3 | 0 | number, checkbox |
| `TablePropertiesDialog.tsx` | 6 | 9 | 0 | number, checkbox, **radio** |
| `font-dialog/AdvancedFontTab.tsx` | 5 | 7 | 0 | checkbox |
| `LineSpacingDialog.tsx` | 3 | 0 | 2 | number |
| `TextInputDialog.tsx` | 1 | 0 | 0 | text |
| `FontDialog.tsx` | 0 | 0 | 2 | — (tabs) |
| `DialogFooter.tsx` | 0 | 0 | 2 | — (já é o componente público) |
| `Dialog.tsx` | 0 | 0 | 1 | — (botão de fechar) |

---

## A questão do CSS

Os dois namespaces são **quase-duplicatas com valores divergentes**. As diferenças não são
intencionais — são drift de duas implementações paralelas:

| Aspecto | `oasis-editor-dialog-*` (cru) | `oasis-editor-ui-*` (público) |
|---|---|---|
| Cor da borda | `#dadce0` (hardcoded) | `rgba(148,163,184,.4)` |
| Cor de foco / accent | `#1a73e8` (hardcoded) | tokens / `--oasis` |
| Fundo do input | (herda) | `var(--oasis-paper)` |
| Raio | `4px` | `var(--oasis-radius)` |
| Label | `font-weight:500; color:#70757a` | `font-weight:600; color:var(--oasis-text)` |
| Altura | padding `8px 12px` | `min-height:34px` |
| Theme-aware | ❌ não | ✅ sim |

### Recomendação: unificar no namespace público (`oasis-editor-ui-*`)

Motivo: o conjunto público é o **superset correto** — usa tokens, é theme-aware, já tem estados
`:focus-visible`, `:disabled` e `[aria-invalid]`. Os estilos `dialog-*` são um subconjunto
inferior com cores fixas. Migrar para os componentes públicos **resolve forma e CSS de uma vez**.

Implicações:
- A aparência dos diálogos **vai mudar** (bordas, alturas, peso da label). É a parte de maior
  atenção da migração — precisa de revisão visual diálogo a diálogo.
- Estilos só de **layout** que não têm equivalente público (`dialog-row`, `dialog-input-group-grow`,
  `dialog-style-row`, grids específicos do font-dialog) **permanecem**, mas passam a envolver
  componentes públicos em vez de `<input>` crus. Renomeação opcional para `oasis-editor-ui-*`
  por consistência, mas não bloqueante.
- Ao final, deletar de `Dialog.css`: `dialog-input`, `dialog-label`, `dialog-button*`,
  `dialog-style-toggle`. Estes ficam órfãos após a migração.

### Alternativa (não recomendada)
Manter `dialog-*` e só trocar as tags por componentes passando `class="oasis-editor-dialog-input"`.
Preserva o visual, mas perpetua a duplicação de CSS e a falta de theme — adia o problema.

---

## Componentes adicionais propostos (mais DRY)

Além de usar os 5 públicos existentes, há padrões repetidos suficientes para justificar
**novos componentes**. Cada um abaixo tem repetição real medida no código:

### 1. `Radio` + `RadioGroup` — **necessário** (bloqueia a tabela)
`TablePropertiesDialog` usa `type="radio"`; não há equivalente público. Modelar como `Checkbox`
(`label`, `description`, `onChange`), com `RadioGroup` gerindo `name`/valor selecionado.

### 2. `NumberField` — **alto retorno**
14 ocorrências de `<input type="number">` com `step`/`min`/`max` espalhadas por `ParagraphDialog`
(7), `LineSpacingDialog` (3), `TablePropertiesDialog` (1+). Hoje cada uma repete
`onInput={e => set(e.currentTarget.value)}` e devolve string. Um `NumberField` (wrapper de
`TextField` com `type="number"` e `onChange(value: number | null)` já parseado) elimina o parse
manual repetido. Alternativa leve: só usar `TextField type="number"` e parsear no callback.

### 3. `FieldRow` — **alto retorno**
`<div class="oasis-editor-dialog-row">` aparece dezenas de vezes como linha flex de campos.
Um `<FieldRow>` (ou `<FormRow>`) encapsula o container e o gap, deixando o JSX dos diálogos
declarativo (`<FieldRow><TextField/><TextField/></FieldRow>`).

### 4. `CheckboxGroup` / `ToggleChip` — **maior ganho isolado**
Os **10 checkboxes de efeitos** em `FontTab` (bold, italic, underline, strike, doubleStrike,
super/subscript, smallCaps, allCaps, hidden) são quase idênticos: `<label class="style-toggle">
<input type=checkbox><span>...`. Um `ToggleChip` (checkbox + label estilizada) reduz ~150 linhas
a uma lista de dados. Vários têm lógica de exclusão mútua (strike↔doubleStrike,
super↔subscript) que continua no callback, mas a marcação some.

### 5. (opcional) `FieldLabel` / `FormSection`
Pequenos helpers de layout para título de seção e agrupamento. Baixa prioridade — só vale se
o padrão se repetir após as migrações acima.

> **Cobertura por reuso vs. novos componentes:** `text`/`number`/`select`/`checkbox`/`button`
> já são cobertos pelos públicos existentes (`type` e atributos passam por `...others`).
> Os novos componentes (`Radio`, `NumberField`, `FieldRow`, `ToggleChip`) atacam a repetição
> *estrutural* que sobra depois — é onde está o grosso do DRY.

---

## Fora dos diálogos: toolbar, overlays e flutuantes

A inconsistência não está só nos diálogos. Há duplicação estrutural na toolbar e nos overlays
que vale extrair — em parte como **hooks**, em parte como **primitivos compartilhados**.

### A. `useSurfaceRect` / `useAnchoredOverlay` — **duplicação literal confirmada**
`FloatingTableToolbar` e `FloatingLayoutOptions` contêm o **mesmo bloco idêntico**: um signal
`surfaceRect`, `scheduleRefresh` com `requestAnimationFrame`, listeners `scroll`(capture)+`resize`
e cleanup, tudo dentro de `onMount`. Hoje é copy-paste. Extrair um hook
`useSurfaceRect(surfaceRef)` (e talvez `useAnchoredOverlay` que já entrega `Portal` + posição
surface-relativa) elimina a repetição e centraliza o rAF/throttle.

> Já existe `usePopoverPosition`, mas ele cobre **só dropdowns portalados com clamp de viewport**
> (ColorPicker, LineSpacing, etc.). Os flutuantes surface-relativos (table/layout) não o usam e
> reimplementam o tracking. O novo hook é o par que falta para esse segundo caso.

### B. `ContextMenu` não reusa o primitivo `Menu` — **convergência**
`ContextMenu` reimplementa do zero menu + `onMount`/`onCleanup` de listeners + CSS próprio
(`ContextMenu.css`), enquanto existe `primitives/Menu`. Vale avaliar fazer o `ContextMenu`
montar sobre `Menu` (ou extrair um `MenuList`/`MenuItem` comum). Reduz duas implementações de
"lista de itens com teclado + dismiss" a uma.

### C. Dois sistemas de `Button` — **decisão consciente, documentar**
Coexistem `public/Button` (`oasis-editor-ui-button`, com `variant`/`size`) e
`primitives/Button` (`oasis-editor-tool-button`, com `active`/`wide`/`ribbonSize`). São casos
de uso distintos (botão de formulário vs. chip de toolbar), mas têm props sobrepostas
(`icon`, `aria-label`, `classList`). Opções: (1) manter separados e **documentar a fronteira**
("toolbar usa ToolbarButton; resto usa Button"); (2) extrair um `BaseButton` headless que os
dois consomem. Recomendado começar por (1) — documentar — e só unificar se a sobreposição crescer.

### D. Dois sistemas de `Select` — mesma situação do Button
`primitives/Select` (combobox de toolbar) vs `public/SelectField` (campo de formulário com label).
Distintos por design; só registrar a fronteira para ninguém criar um terceiro.

### E. Tokens de cor — **dívida de tema transversal**
Cores hardcoded vazam por TSX/SVG fora do CSS: `#1a73e8`, `#9aa0a6`, `#dadce0` em
`FloatingLayoutOptions` (pictogramas `WrapIcon`), inline styles de diálogos, etc. Não é um
componente, mas é o mesmo problema de fundo do CSS dos diálogos: deveria usar `var(--oasis-*)`.
Vale um sweep para trocar hex por tokens (pré-requisito para tema escuro consistente).

### Resumo dos itens fora dos diálogos
| Item | Tipo | Esforço | Prioridade |
|---|---|---|---|
| `useSurfaceRect`/`useAnchoredOverlay` | hook | baixo | **alta** (duplicação literal) |
| `ContextMenu` sobre `Menu`/`MenuList` | refactor | médio | média |
| Documentar fronteira Button/ToolbarButton | doc | trivial | média |
| Documentar fronteira Select/SelectField | doc | trivial | baixa |
| Sweep de cores → tokens `--oasis-*` | CSS/limpeza | médio | média |

---

## Avaliação SOLID da camada de UI

Aplicando SOLID ao contexto reativo (SolidJS) — "componente/módulo" no lugar de "classe",
"reason to change" igual. Isto fundamenta as fases abaixo.

### S — Single Responsibility — **o eixo mais violado**
O tamanho dos arquivos confirma. O **contraste FontDialog × TableProperties é a lição central**:

| Arquivo | Linhas | Veredito |
|---|---|---|
| `TablePropertiesDialog.tsx` | 1094 | ❌ god module — 5 painéis + helpers locais + init de estado gigante |
| `ParagraphDialog.tsx` | 487 | ⚠️ mistura estado + render + parse no mesmo corpo |
| `FontTab.tsx` | 400 | ✅ só renderiza — estado vive no `FontDialogController` |

O FontDialog já foi refatorado no padrão certo (`FontDialogController` /
`useFontDialogController` / tabs de view pura / `FontDialogTypes`). O TableProperties é o mesmo
diálogo **sem** esse tratamento → ver Fase 4. Os componentes propostos (`NumberField`,
`ToggleChip`, `FieldRow`) servem ao SRP: tiram "como desenhar um campo" de dentro dos diálogos.

### O — Open/Closed — **forte onde há primitivo**
- ✅ Públicos usam `splitProps + {...others}`: estende via props sem editar o componente.
- ✅ Registro de `renderers.tsx` permite novos tipos de item sem mexer no renderizador.
- ❌ Diálogos crus: adicionar campo = copiar marcação. Sem ponto de extensão.

### L — Liskov — **a colisão dos dois `Button`**
`public/Button` (`variant`/`size`) e `primitives/Button` (`active`/`wide`/`ribbonSize`) têm o
**mesmo nome** e contratos **não substituíveis**. Mesmo cheiro do LSP: nome igual prometendo
intercambialidade inexistente. Documentar a fronteira (item C de "Fora dos diálogos") resolve.

### I — Interface Segregation — **o ponto mais sutil**
- Públicos estendem `JSX.*HTMLAttributes` inteiro (interface gorda), mas tudo opcional → ok na
  prática.
- ❌ `FontTabProps { ctrl: FontDialogController }`: a tab recebe o **controller inteiro** usando
  só um subconjunto. Trade-off consciente do padrão controller; aceitável hoje, mas se o
  controller crescer, fatiar (`ctrl.fontTab`, `ctrl.advanced`).

### D — Dependency Inversion — **bom no controller, vazando no concreto**
- ✅ `FontTab` depende do **tipo** do controller, não da implementação → testável com mock.
- ✅ `usePopoverPosition` abstrai posicionamento atrás de um contrato.
- ❌ Concreto vazando: `Portal mount={document.body}` hardcoded, cores hex em TSX/SVG (vs.
  tokens), flutuantes acoplados a `requestAnimationFrame`/`window`. O `useSurfaceRect` proposto
  **é um movimento DIP**: inverte "componente sabe ouvir scroll/resize" → "depende de um rect
  observável". A unificação de CSS em tokens conserta o vazamento de cores.

### Veredito
Problema dominante = **SRP**, e o repo **já tem o padrão de solução validado** (FontDialog).
O plano está alinhado: extrair componentes/hooks = mover responsabilidades para fora dos god
modules. A maior dívida é o `TablePropertiesDialog` (Fase 4).

---

## Fases propostas

### Fase 0 — Fundação (pré-requisito)
- [ ] **CSS:** confirmar unificação no namespace `oasis-editor-ui-*` (ver seção acima).
- [ ] Criar `src/ui/public/Radio.tsx` (`Radio` + `RadioGroup`).
- [ ] Criar `src/ui/public/NumberField.tsx` (wrapper de `TextField`).
- [ ] Criar `src/ui/public/FieldRow.tsx` (layout) e `ToggleChip` (ou `CheckboxGroup`).
- [ ] Exportar todos no `src/ui/public/index.ts`.
- [ ] Confirmar que `TextField`/`SelectField` repassam `min`/`max`/`step`/`ref`/`data-testid`
      (já passam por `...others`).

### Fase 1 — Casos simples (baixo risco)
- [ ] `TextInputDialog.tsx` — 1 `<input type=text>` → `<TextField>`.
- [ ] `LineSpacingDialog.tsx` — 3 number → `<NumberField>`; 2 `<button>` preset → `<Button>`.

### Fase 2 — Diálogos de fonte
- [ ] `font-dialog/FontTab.tsx` — text → `TextField`, 5 selects → `SelectField`,
      10 checkboxes de efeito → `ToggleChip`/`CheckboxGroup` (maior ganho de DRY).
- [ ] `font-dialog/AdvancedFontTab.tsx` — checkboxes + 7 selects.

### Fase 3 — Parágrafo
- [ ] `ParagraphDialog.tsx` — 7 number → `NumberField`, 4 checkbox → `Checkbox`,
      3 select → `SelectField`, linhas → `FieldRow`.

### Fase 4 — Tabela (depende do `Radio` da Fase 0)
`TablePropertiesDialog.tsx` (1094 linhas) é o **maior god module da camada de UI** e já está
listado em [`solid-principles-refactor-plan.md`](solid-principles-refactor-plan.md). Não basta
trocar inputs por componentes — o caminho correto é **replicar o padrão do FontDialog**, que já
foi refatorado certo (`FontDialogController` + `useFontDialogController` + tabs de view pura +
`FontDialogTypes`).
- [ ] Extrair `TablePropertiesController.ts` (estado/lógica) + `useTablePropertiesController.ts`.
- [ ] Mover cada `*TabPanel` (`TableTabPanel`, `RowTabPanel`, `ColumnTabPanel`, `CellTabPanel`,
      `AltTextTabPanel`) para arquivo próprio de view pura.
- [ ] Promover os helpers locais `numericInput`/`checkbox`/`resolveBorder` aos componentes
      públicos (`NumberField`, `Checkbox`) — hoje são reinvenção interna do diálogo.
- [ ] Só então: inputs/selects → componentes públicos + `RadioGroup`.

### Fase 5 — Limpeza de CSS
- [ ] Remover de `Dialog.css` regras órfãs: `dialog-input`, `dialog-label`, `dialog-button*`,
      `dialog-style-toggle`, `dialog-style-row` (se substituídas).
- [ ] Manter/renomear estilos de layout sem equivalente (`dialog-row`, grids do font-dialog).
- [ ] Gate opcional: regra de lint que sinalize `<input>`/`<select>`/`<button>` crus em
      `src/ui/components/Dialogs/**` para impedir regressão.

## Critérios de aceite por fase
- Sem mudança funcional: mesmos `data-testid`, callbacks e valores.
- `npm run build` / typecheck verde.
- Testes existentes dos diálogos passando.
- **Revisão visual** de cada diálogo migrado (a troca de CSS é o ponto crítico).

## Ordem recomendada
Fase 0 → 1 → 2 → 3 → 4 → 5. Fases 1–3 são independentes entre si; Fase 4 depende do
`Radio`; Fase 5 fecha a limpeza de CSS depois que nada mais referencia `dialog-*`.

## Fora dos diálogos — onde encaixa
Os itens da seção "Fora dos diálogos" são **independentes** das fases dos diálogos e podem
ser feitos em qualquer ordem. Ordem sugerida: (A) `useSurfaceRect` primeiro (duplicação literal,
ganho imediato), depois documentação das fronteiras Button/Select, depois (B) ContextMenu e
(E) sweep de tokens conforme houver apetite.

## Decisões em aberto (dono do projeto)
1. **CSS:** confirmar unificação em `oasis-editor-ui-*` (recomendado) e aceitar a mudança visual?
2. **Novos componentes (diálogos):** criar os 4 (`Radio`, `NumberField`, `FieldRow`, `ToggleChip`)
   ou começar só com `Radio` (mínimo necessário) e reusar os 5 existentes?
3. **Escopo agora:** migrar tudo ou só Fases 0–1 como prova de conceito?
4. **Fora dos diálogos:** incluir `useSurfaceRect` (recomendado, baixo esforço) já neste esforço,
   ou tratar toolbar/overlays como trilha separada?
