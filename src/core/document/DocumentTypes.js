/**
 * @typedef {{ title?: string, createdAt: number, updatedAt: number }} DocumentMetadata
 * @typedef {{ id: string, revision: number, sections: import('./SectionTypes.js').SectionNode[], metadata: DocumentMetadata }} DocumentModel
 */

export const createDocumentMetadata = (title = 'Untitled') => ({
  title,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
