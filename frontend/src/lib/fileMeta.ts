import { FileArchive, FileImage, FileText, FileType, File } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const extensionLabels: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  txt: 'TXT',
  md: 'Markdown',
  png: 'PNG image',
  jpg: 'JPG image',
  jpeg: 'JPEG image',
  svg: 'SVG image',
  zip: 'ZIP archive'
};

export const supportedFileExtensions = Object.keys(extensionLabels);

export function getFileExtension(path: string | null | undefined) {
  if (!path) {
    return '';
  }

  const cleanPath = path.split(/[?#]/)[0] ?? '';
  const fileName = cleanPath.split('/').pop() ?? cleanPath;
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  return extension?.toLowerCase() ?? '';
}

export function getFileTypeLabel(path: string | null | undefined, fallback: string) {
  const extension = getFileExtension(path);
  return extensionLabels[extension] ?? fallback;
}

export function getFileIcon(path: string | null | undefined): LucideIcon {
  const extension = getFileExtension(path);

  if (['png', 'jpg', 'jpeg', 'svg'].includes(extension)) {
    return FileImage;
  }

  if (extension === 'zip') {
    return FileArchive;
  }

  if (['pdf', 'docx'].includes(extension)) {
    return FileType;
  }

  if (['txt', 'md'].includes(extension)) {
    return FileText;
  }

  return File;
}
