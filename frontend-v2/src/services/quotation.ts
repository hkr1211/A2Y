import api from './api';
import type { ApiResponse, Quotation } from '@/types';

export interface CreateQuotationData {
  inquiryId: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number;
  remarks?: string;
}

export async function createQuotation(
  data: CreateQuotationData
): Promise<Quotation> {
  const res = await api.post<ApiResponse<Quotation>>('/quotations', data);
  return res.data.data;
}

export async function withdrawQuotations(
  inquiryId: string
): Promise<void> {
  await api.put(`/quotations/inquiry/${inquiryId}/withdraw`);
}
