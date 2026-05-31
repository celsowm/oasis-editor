Plano de Suporte a Notas de Rodapé — Resumo
O oracle produziu um plano completo em 10 fases (Fase 0 a Fase 10) para suporte ponta-a-ponta de footnotes no Oasis Editor. Abaixo, um sumário executivo:

Decisões-chave de modelo
Registro separado em document.footnotes.items[id] (não em assets, não em EditorSection.blocks).
Referência inline via novo campo run.footnoteReference: { footnoteId, customMark? }.
Nova zona EditorEditingZone = "main" | "header" | "footer" | "footnote" + state.activeFootnoteId.
Marker do número materializado em run.text (renumeração atualiza esse texto).
Roteiro em fases
Fase	Escopo	Esforço
0	Fixtures DOCX/PDF de referência e definição do MVP	S/M
1	Modelo, helpers, caches (documentParagraphsCache/documentIndexCache), clone	L
2	Comandos insertFootnote/deleteFootnote, navegação, seleção atômica do marker	L
3	Import word/footnotes.xml + <w:footnoteReference> (ignorar ids -1/0 especiais)	L
4	Export footnotes.xml, [Content_Types].xml, document.xml.rels	L
5	Layout canvas: reserva altura, separador, hit-test, paginação iterativa estável	XL
6	PDF reusa o mesmo layout, novo drawFootnotes.ts	M/L
7	Toolbar/Menubar/atalho Ctrl+Alt+F, restrito a zona main no MVP	M
8	Numeração avançada (roman/letter), restart por seção, w:footnotePr	L
9	Notas longas com continuationSeparator, split entre páginas	XL
10	Testes unitários + parity DOCX round-trip + Playwright + PDF	L contínuo
Armadilhas DOCX destacadas
w:id interno ≠ número visual exibido
IDs -1 (separator) e 0 (continuationSeparator) não são notas reais
Documento principal usa <w:footnoteReference w:id="N"/>; corpo da nota usa <w:footnoteRef/> (diferentes!)
w:customMarkFollows muda a semântica de auto-numeração
w:footnotePr pode aparecer em settings.xml e/ou em sectPr
footnotes.xml pode ter rels próprias (word/_rels/footnotes.xml.rels)
Endnotes parecem similares mas merecem fase separada futura
Ordem MVP recomendada
Fases 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 10 (com Fase 10 começando desde a Fase 1).
Adiar 8 e 9 até haver demanda concreta (documentos jurídicos/acadêmicos, notas longas, fidelidade Word).

O plano detalhado completo, com listas de arquivos, riscos, guardrails e critérios "pronto quando" por fase, está acima na resposta do oracle.