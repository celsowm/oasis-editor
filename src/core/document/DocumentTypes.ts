import { SectionNode } from './SectionTypes.js';

export interface DocumentMetadata {
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentModel {
  id: string;
  revision: number;
  sections: SectionNode[];
  metadata: DocumentMetadata;
}

export const createDocumentMetadata = (title = 'Untitled'): DocumentMetadata => ({
  title,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
