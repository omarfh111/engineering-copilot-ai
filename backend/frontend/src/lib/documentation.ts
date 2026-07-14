import type { DocumentationStatus, DocumentationType } from '../types/documentation';

export const documentationTypeOptions: DocumentationType[] = [
  'README',
  'API_DOC',
  'ARCHITECTURE',
  'INSTALLATION_GUIDE',
  'USER_GUIDE',
  'TECHNICAL_REPORT',
  'ONBOARDING_GUIDE',
  'OTHER'
];

export const documentationStatusOptions: DocumentationStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];

const documentationTypeLabels: Record<DocumentationType, string> = {
  README: 'README',
  API_DOC: 'API Documentation',
  ARCHITECTURE: 'Architecture',
  INSTALLATION_GUIDE: 'Installation Guide',
  USER_GUIDE: 'User Guide',
  TECHNICAL_REPORT: 'Technical Report',
  ONBOARDING_GUIDE: 'Onboarding Guide',
  OTHER: 'Other'
};

export function formatDocumentationType(type: DocumentationType) {
  return documentationTypeLabels[type];
}

export function formatDocumentationStatus(status: DocumentationStatus | string) {
  return status
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function getDocumentationStatusTone(
  status: DocumentationStatus | string
): 'brand' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'PENDING_REVIEW':
      return 'warning';
    case 'REJECTED':
      return 'danger';
    case 'DRAFT':
    default:
      return 'neutral';
  }
}
