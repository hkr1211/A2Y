import api from './api';
import type { ApiResponse, ApiPaginatedResponse, Inquiry } from '@/types';

export interface InquiryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: string;
}

export interface CreateInquiryData {
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  quantity: number;
}

export interface UpdateInquiryData {
  productName?: string;
  materialType?: string;
  specifications?: string;
  specialRequirements?: string | null;
  quantity?: number;
}

export async function getInquiries(
  params: InquiryListParams = {}
): Promise<ApiPaginatedResponse<Inquiry>['data']> {
  const res = await api.get<ApiPaginatedResponse<Inquiry>>('/inquiries', {
    params,
  });
  return res.data.data;
}

export async function getInquiry(id: string): Promise<Inquiry> {
  const res = await api.get<ApiResponse<Inquiry>>(`/inquiries/${id}`);
  return res.data.data;
}

export async function createInquiry(
  data: CreateInquiryData
): Promise<Inquiry> {
  const res = await api.post<ApiResponse<Inquiry>>('/inquiries', data);
  return res.data.data;
}

export async function updateInquiry(
  id: string,
  data: UpdateInquiryData
): Promise<Inquiry> {
  const res = await api.put<ApiResponse<Inquiry>>(`/inquiries/${id}`, data);
  return res.data.data;
}

export async function performInquiryAction(
  id: string,
  action: 'publish' | 'cancel'
): Promise<Inquiry> {
  const res = await api.put<ApiResponse<Inquiry>>(
    `/inquiries/${id}/action`,
    { action }
  );
  return res.data.data;
}
