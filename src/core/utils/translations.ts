export type Locale = "en-US" | "pt-BR";

export interface TranslationKeys {
  toolbar: {
    undo: string;
    redo: string;
    print: string;
    formatPainter: string;
    fontFamily: string;
    pageTemplate: string;
    bold: string;
    italic: string;
    underline: string;
    strike: string;
    superscript: string;
    subscript: string;
    link: string;
    trackChanges: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    alignJustify: string;
    bullets: string;
    orderedList: string;
    decreaseIndent: string;
    increaseIndent: string;
    insertImage: string;
    insertTable: string;
    textColor: string;
    highlightColor: string;
  };
  menu: {
    file: string;
    new: string;
    open: string;
    importDocx: string;
    exportDocx: string;
    exportPdf: string;
    download: string;
    edit: string;
    cut: string;
    copy: string;
    paste: string;
    insert: string;
    image: string;
    pageBreak: string;
    footnote: string;
    endnote: string;
    pageNumber: string;
    horizontalLine: string;
    format: string;
  };
  editor: {
    placeholder: string;
    loading: string;
    saving: string;
    header: string;
    footer: string;
    none: string;
    automatic: string;
    themeColors: string;
    standardColors: string;
    highlightColors: string;
    table: string;
  };
  messages: {
    pageInfo: string;
    imageAlt: string;
    enterLink: string;
    untitled: string;
    tableInfo: string; // "{0} x {1} Table"
  };
}

export const enUS: TranslationKeys = {
  toolbar: {
    undo: "Undo (Ctrl+Z)",
    redo: "Redo (Ctrl+Y)",
    print: "Print",
    formatPainter: "Format Painter",
    fontFamily: "Font Family",
    pageTemplate: "Page Template",
    bold: "Bold (Ctrl+B)",
    italic: "Italic (Ctrl+I)",
    underline: "Underline (Ctrl+U)",
    strike: "Strikethrough",
    superscript: "Superscript",
    subscript: "Subscript",
    link: "Insert Link",
    trackChanges: "Track Changes",
    alignLeft: "Align Left",
    alignCenter: "Align Center",
    alignRight: "Align Right",
    alignJustify: "Justify",
    bullets: "Bulleted List",
    orderedList: "Numbered List",
    decreaseIndent: "Decrease Indent",
    increaseIndent: "Increase Indent",
    insertImage: "Insert Image",
    insertTable: "Insert Table",
    textColor: "Text Color",
    highlightColor: "Highlight Color",
  },
  menu: {
    file: "File",
    new: "New",
    open: "Open",
    importDocx: "Import DOCX...",
    exportDocx: "Export DOCX...",
    exportPdf: "Export PDF...",
    download: "Download",
    edit: "Edit",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    insert: "Insert",
    image: "Image",
    pageBreak: "Page break",
    footnote: "Footnote",
    endnote: "Endnote",
    pageNumber: "Page number",
    horizontalLine: "Horizontal line",
    format: "Format",
  },
  editor: {
    placeholder: "Type something...",
    loading: "Loading document...",
    saving: "Saving...",
    header: "Header",
    footer: "Footer",
    none: "None",
    automatic: "Automatic",
    themeColors: "Theme Colors",
    standardColors: "Standard Colors",
    highlightColors: "Highlight Colors",
    table: "Table",
  },
  messages: {
    pageInfo: "Page {0} of {1}",
    imageAlt: "Image description",
    enterLink: "Enter link URL:",
    untitled: "Untitled document",
    tableInfo: "{0} x {1} Table",
  },
};

export const ptBR: TranslationKeys = {
  toolbar: {
    undo: "Desfazer (Ctrl+Z)",
    redo: "Refazer (Ctrl+Y)",
    print: "Imprimir",
    formatPainter: "Pincel de Formatação",
    fontFamily: "Fonte",
    pageTemplate: "Modelo de Página",
    bold: "Negrito (Ctrl+B)",
    italic: "Itálico (Ctrl+I)",
    underline: "Sublinhado (Ctrl+U)",
    strike: "Tachado",
    superscript: "Sobrescrito",
    subscript: "Subscrito",
    link: "Inserir Link",
    trackChanges: "Controlar Alterações",
    alignLeft: "Alinhar à Esquerda",
    alignCenter: "Centralizar",
    alignRight: "Alinhar à Direita",
    alignJustify: "Justificar",
    bullets: "Lista com Marcadores",
    orderedList: "Lista Numerada",
    decreaseIndent: "Diminuir Recuo",
    increaseIndent: "Aumentar Recuo",
    insertImage: "Inserir Imagem",
    insertTable: "Inserir Tabela",
    textColor: "Cor do Texto",
    highlightColor: "Cor de Destaque",
  },
  menu: {
    file: "Arquivo",
    new: "Novo",
    open: "Abrir",
    importDocx: "Importar DOCX...",
    exportDocx: "Exportar DOCX...",
    exportPdf: "Exportar PDF...",
    download: "Baixar",
    edit: "Editar",
    cut: "Recortar",
    copy: "Copiar",
    paste: "Colar",
    insert: "Inserir",
    image: "Imagem",
    pageBreak: "Quebra de página",
    footnote: "Nota de rodapé",
    endnote: "Nota de fim",
    pageNumber: "Número de página",
    horizontalLine: "Linha horizontal",
    format: "Formatar",
  },
  editor: {
    placeholder: "Digite algo...",
    loading: "Carregando documento...",
    saving: "Salvando...",
    header: "Cabeçalho",
    footer: "Rodapé",
    none: "Nenhum",
    automatic: "Automático",
    themeColors: "Cores do Tema",
    standardColors: "Cores Padrão",
    highlightColors: "Cores de Destaque",
    table: "Tabela",
  },
  messages: {
    pageInfo: "Página {0} de {1}",
    imageAlt: "Descrição da imagem",
    enterLink: "Digite a URL do link:",
    untitled: "Documento sem título",
    tableInfo: "Tabela {0} x {1}",
  },
};
