import api from './api';
import type { ApiResponse } from '@/types';

export interface FileAttachmentResponse {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  relatedId: string;
  relatedType: string;
  uploadedBy: {
    id: string;
    username: string;
  };
  createdAt: string;
}

export interface DownloadUrlResponse {
  url: string;
  originalName: string;
  mimeType: string;
  expiresIn: number;
}

export async function uploadFile(
  file: File,
  relatedId: string,
  relatedType: 'inquiry' | 'order'
): Promise<FileAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('relatedId', relatedId);
  formData.append('relatedType', relatedType);

  const res = await api.post<ApiResponse<FileAttachmentResponse>>(
    '/files',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s for large files
    }
  );
  return res.data.data;
}

export async function getDownloadUrl(
  fileId: string
): Promise<DownloadUrlResponse> {
  const res = await api.get<ApiResponse<DownloadUrlResponse>>(
    `/files/${fileId}/download`
  );
  return res.data.data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}`);
}
