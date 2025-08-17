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
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFileAttachmentData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  uploadedBy: string;
}

export interface FileUploadConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  uploadPath: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}