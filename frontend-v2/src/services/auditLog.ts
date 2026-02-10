import api from './api';
import type { ApiResponse } from '@/types';

export interface AuditLogItem {
  id: string;
  user: { id: string; username: string };
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  total: number;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(
  params: AuditLogParams = {}
): Promise<AuditLogListResponse> {
  const res = await api.get<ApiResponse<AuditLogListResponse>>(
    '/audit-logs',
    { params }
  );
  return res.data.data;
}
