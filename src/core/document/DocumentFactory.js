import { createDocumentMetadata } from './DocumentTypes.js';
import { createDefaultBreakPolicy, createDefaultMargins } from './SectionTypes.js';

let sectionCounter = 0;
let blockCounter = 0;
let runCounter = 0;

const nextSectionId = () => `section:${sectionCounter++}`;
const nextBlockId = () => `block:${blockCounter++}`;
const nextRunId = () => `run:${runCounter++}`;

export const createTextRun = (text, marks = {}) => ({
  id: nextRunId(),
  text,
  marks,
});

export const createParagraph = (text, align = 'left') => ({
  id: nextBlockId(),
  kind: 'paragraph',
  align,
  children: [createTextRun(text)],
});

export const createHeading = (text, level = 1, align = 'left') => ({
  id: nextBlockId(),
  kind: 'heading',
  level,
  align,
  children: [createTextRun(text, { bold: true, fontSize: 24 })],
});

export const createSection = (children = []) => ({
  id: nextSectionId(),
  pageTemplateId: 'template:a4:default',
  margins: createDefaultMargins(),
  orientation: 'portrait',
  breakPolicy: createDefaultBreakPolicy(),
  children,
});

export const createDocument = () => ({
  id: 'doc:root',
  revision: 0,
  metadata: createDocumentMetadata('oasis-editor'),
  sections: [
    createSection([
      createHeading('oasis-editor', 1),
      createParagraph('Documento, composição e paginação agora vivem numa base única, limpa e organizada.'),
      createParagraph('A aplicação mantém identidade única: oasis-editor. Página é parte da arquitetura, não um produto paralelo.'),
      createParagraph('O documento continua contínuo, enquanto o layout paginado é calculado pelo motor de composição.'),
      createParagraph('A próxima camada pode evoluir para edição rica, regras tipográficas e Rust/WASM sem quebrar a separação de responsabilidades.'),
    ]),
  ],
});
