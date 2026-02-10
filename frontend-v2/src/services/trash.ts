import api from './api';
import type { ApiResponse } from '@/types';

export interface TrashItem {
  id: string;
  type: string;
  title: string;
  deletedAt: string;
}

export interface TrashListResponse {
  items: TrashItem[];
  total: number;
}

export async function getTrashItems(
  params: { page?: number; pageSize?: number; type?: string } = {}
): Promise<TrashListResponse> {
  const res = await api.get<ApiResponse<TrashListResponse>>('/trash', {
    params,
  });
  return res.data.data;
}

export async function restoreTrashItem(
  type: string,
  id: string
): Promise<void> {
  await api.put(`/trash/${type}/${id}/restore`);
}

export async function permanentDeleteTrashItem(
  type: string,
  id: string
): Promise<void> {
  await api.delete(`/trash/${type}/${id}`);
}
