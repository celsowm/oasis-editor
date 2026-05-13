export interface WordParityCorpusEntry {
  id: string;
  fileName: string;
  category:
    | "baseline-lorem"
    | "header-footer"
    | "mixed-fonts"
    | "tables"
    | "page-breaks";
}

/**
 * Canonical Word parity corpus manifest (Milestone 1, text-first).
 * Add production documents here as they are curated.
 */
export const WORD_PARITY_CORPUS: WordParityCorpusEntry[] = [
  {
    id: "word-authored-lorem",
    fileName: "word-authored-lorem.docx",
    category: "baseline-lorem",
  },
  {
    id: "lorem-implicit-doc-grid",
    fileName: "lorem_ipsum_complex_document.docx",
    category: "page-breaks",
  },
  {
    id: "complex-mixed-content",
    fileName: "documento_complexo.docx",
    category: "mixed-fonts",
  },
];
