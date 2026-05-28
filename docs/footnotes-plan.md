# Suporte a notas de rodapé — Plano e MVP

Este documento descreve o escopo MVP do suporte de footnotes no Oasis Editor.
Detalhes completos do plano em fases foram gerados via Oracle (Fases 0 a 10).

## Decisões de modelagem (MVP)

- Registro separado em `EditorDocument.footnotes.items[footnoteId]`.
- Referência inline via `EditorTextRun.footnoteReference: { footnoteId, customMark? }`.
- Nova zona de edição: `EditorEditingZone = "main" | "header" | "footer" | "footnote"`.
- `EditorState.activeFootnoteId?: string` para saber qual nota está sendo editada.
- Marcador do número materializado em `run.text` (ex.: "1"); renumeração atualiza esse texto.
- Marcador no corpo da nota (`w:footnoteRef` do DOCX) NÃO é persistido no modelo;
  o renderer/export reinjeta visualmente.

## Escopo MVP

Inclui:
- Inserir / remover / renumerar nota.
- Navegação básica entre marca de referência e corpo da nota.
- Numeração decimal contínua por documento.
- Import DOCX básico: `word/footnotes.xml` + `<w:footnoteReference>`.
- Export DOCX básico (Fase 4).
- Layout canvas com notas inteiras na mesma página (Fase 5).
- Export PDF reusando o mesmo layout (Fase 6).
- UI mínima: botão/menu/atalho (Fase 7).

Não inclui (fase futura):
- Endnotes.
- Notas longas divididas entre páginas (`continuationSeparator`).
- Custom marks completos / `w:customMarkFollows`.
- Restart por seção / restart por página.
- Estilos `FootnoteReference` / `FootnoteText` totalmente exportados em `styles.xml`.
- Painel/outline de notas.

## Armadilhas DOCX importantes

- IDs especiais em `word/footnotes.xml`: `w:id="-1"` (separator), `w:id="0"`
  (continuationSeparator) — não são notas reais e devem ser ignoradas na import.
- Documento principal usa `<w:footnoteReference w:id="N"/>`; o corpo da nota
  usa `<w:footnoteRef/>` (são elementos diferentes!).
- `w:customMarkFollows` muda a semântica do marker (não automático).
- `w:footnotePr` pode aparecer em `settings.xml` e/ou em `sectPr`.
- `footnotes.xml` pode ter relationships próprias em
  `word/_rels/footnotes.xml.rels`.

## Fixtures de teste

Os testes constroem DOCX em memória via JSZip
(`src/__tests__/import/footnotes.test.ts` usa um builder mínimo).
Não dependemos de DOCX binários no repositório para o MVP da Fase 3.
