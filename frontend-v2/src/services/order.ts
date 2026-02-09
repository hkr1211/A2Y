import api from './api';
import type { ApiResponse, ApiPaginatedResponse, Order } from '@/types';

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: string;
}

export interface CreateOrderFromInquiryData {
  inquiryId: string;
}

export interface CreateStandaloneOrderData {
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export async function getOrders(
  params: OrderListParams = {}
): Promise<ApiPaginatedResponse<Order>['data']> {
  const res = await api.get<ApiPaginatedResponse<Order>>('/orders', {
    params,
  });
  return res.data.data;
}

export async function getOrder(id: string): Promise<Order> {
  const res = await api.get<ApiResponse<Order>>(`/orders/${id}`);
  return res.data.data;
}

export async function createOrderFromInquiry(
  data: CreateOrderFromInquiryData
): Promise<Order> {
  const res = await api.post<ApiResponse<Order>>('/orders', data);
  return res.data.data;
}

export async function createStandaloneOrder(
  data: CreateStandaloneOrderData
): Promise<Order> {
  const res = await api.post<ApiResponse<Order>>('/orders', data);
  return res.data.data;
}

export type OrderAction =
  | 'cancel'
  | 'reject'
  | 'confirm'
  | 'start_production'
  | 'ship'
  | 'complete';

export async function performOrderAction(
  id: string,
  action: OrderAction,
  reason?: string
): Promise<Order> {
  const res = await api.put<ApiResponse<Order>>(`/orders/${id}/action`, {
    action,
    reason,
  });
  return res.data.data;
}
