# Status de Paridade OOXML (Word .docx) - Oasis Editor

Este documento detalha a cobertura atual do padrão OOXML para importação e exportação de arquivos Word (.docx) no Oasis Editor.

| Categoria | Recurso | DOCX (Import) | DOCX (Export) | PDF (Export) | Observações |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Texto** | Negrito, Itálico, Sublinhado, Tachado | ✅ | ✅ | ✅ | PDF suporta estilos de sublinhado complexos (ondas, duplos) |
| | Sobrescrito / Subscrito | ✅ | ✅ | ✅ | No PDF é via herança de estilo e posicionamento |
| | Cor do Texto e Realce (Highlight) | ✅ | ✅ | ✅ | PDF suporta cores RGB arbitrárias |
| | Fonte (Família e Tamanho) | ✅ | ✅ | ✅ | PDF usa subsetting para fontes Unicode |
| | Links (Hyperlinks) | ✅ | ✅ | ❌ | **Falta** implementar anotações de Link no PDF |
| | Tabulações e Quebras de Linha (`\t`, `\n`) | ✅ | ✅ | ✅ | |
| **Parágrafo** | Alinhamento (Esq, Cent, Dir, Just) | ✅ | ✅ | ✅ | PDF trata parágrafos justificados separando palavras |
| | Espaçamento (Antes, Depois, Linhas) | ✅ | ✅ | ✅ | |
| | Recuos (Esq, Dir, 1ª Linha, Pendente) | ✅ | ✅ | ✅ | |
| | Quebra de página antes | ✅ | ✅ | ✅ | |
| | Controle de Órfãs/Viúvas | ✅ | ✅ | ✅ | |
| | Manter com o próximo / Linhas juntas | ✅ | ✅ | ✅ | |
| | Grade de Parágrafo (Snap to Grid) | ✅ | ❌ | ❌ | |
| **Tabelas** | Estrutura básica (Linhas/Colunas) | ✅ | ✅ | ✅ | |
| | Mesclagem (ColSpan e RowSpan) | ✅ | ✅ | ✅ | |
| | Largura da Tabela e Células | ✅ | ✅ | ✅ | |
| | Sombreamento de Célula (Fill) | ✅ | ✅ | ✅ | |
| | Espaçamento Interno (Padding) | ✅ | ✅ | ✅ | |
| | Bordas de Célula | ❌ | ✅ | ✅ | PDF converte bordas tracejadas/pontilhadas em sólidas |
| | Alinhamento Vertical | ❌ | ✅ | ✅ | |
| | Linha de Cabeçalho (`tblHeader`) | ✅ | ✅ | ✅ | PDF repete cabeçalhos em quebras de página |
| **Documento** | Tamanho de Página e Orientação | ✅ | ✅ | ✅ | |
| | Margens da Página | ✅ | ✅ | ✅ | |
| | Cabeçalhos e Rodapés | ✅ | ✅ | ✅ | |
| | Múltiplas Seções | ✅ | ✅ | ✅ | |
| **Imagens** | Imagens (PNG, JPEG) | ✅ | ✅ | ✅ | |
| | Tamanho e Texto Alternativo (Alt) | ✅ | ✅ | ✅ | |
| **Listas** | Marcadores e Numeração | ✅ | ✅ | ✅ | |
| **Avançado** | Campos (PAGE, NUMPAGES) | ✅ | ✅ | ✅ | PDF renderiza valores calculados |
| | Notas de Rodapé / Fim | ❌ | ❌ | ❌ | Não implementado |
| | Comentários e Revisões | ❌ | ❌ | ❌ | Não implementado |
| | Favoritos (Bookmarks) | ❌ | ❌ | ❌ | Não implementado |

## O que falta (Principais Lacunas)

### DOCX
1.  **Importação de Bordas de Tabela**: O importador ignora atualmente as definições de bordas nas células das tabelas.
2.  **Importação de Alinhamento Vertical em Tabelas**: O texto dentro de células sempre importa com alinhamento padrão (topo).
3.  **Exportação de Snap to Grid**: O editor possui suporte interno a grade, mas não salva essa preferência no DOCX.

### PDF
1.  **Hyperlinks Clicáveis**: Embora o PDF renderize o texto do link, ele não cria a anotação `/Link` clicável.
2.  **Bordas de Tabela Estilizadas**: Bordas tracejadas ou pontilhadas são renderizadas como sólidas no PDF.
3.  **Metadados do PDF**: Título, autor e outros metadados do documento ainda não são preenchidos.

### Gerais (Ambos)
1.  **Notas de Rodapé e Endnotes**: Recurso essencial para documentos acadêmicos e jurídicos ainda não presente.
2.  **Comentários e Controle de Alterações**: Importante para fluxos colaborativos.
3.  **Favoritos e Referências Cruzadas**: Navegação interna no documento.

