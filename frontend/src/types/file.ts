export interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  uploadedBy: string;
  uploadedAt: string;
}