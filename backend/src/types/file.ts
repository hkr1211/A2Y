export type RelatedType = 'inquiry' | 'order';

export interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  relatedId: string; // Inquiry or Order ID
  relatedType: RelatedType;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface FileUploadRequest {
  relatedId: string;
  relatedType: RelatedType;
}