import type { DocumentType } from '../types/document';

export const documentTypeOptions: DocumentType[] = ['PDF', 'DOCX', 'HTML', 'MD', 'WIKI', 'TXT', 'OTHER'];

const documentTypeLabels: Record<DocumentType, string> = {
  PDF: 'PDF',
  DOCX: 'DOCX',
  HTML: 'HTML',
  MD: 'Markdown',
  WIKI: 'Wiki',
  TXT: 'Text',
  OTHER: 'Other'
};

export function formatDocumentType(type: DocumentType) {
  return documentTypeLabels[type];
}
