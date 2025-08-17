import axios from './api';
import type { Order, CreateOrderForm, UpdateOrderForm, OrderListParams, OrderStatus } from '@/types/order';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export class OrderService {
  /**
   * Get paginated list of orders
   */
  static async getOrders(params: OrderListParams = {}): Promise<PaginatedResponse<Order>> {
    const response = await axios.get<ApiResponse<PaginatedResponse<Order>>>('/api/orders', {
      params,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch orders');
    }

    return response.data.data;
  }

  /**
   * Get order by ID
   */
  static async getOrderById(id: string): Promise<Order> {
    const response = await axios.get<ApiResponse<Order>>(`/api/orders/${id}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch order');
    }

    return response.data.data;
  }

  /**
   * Create new order
   */
  static async createOrder(orderData: CreateOrderForm): Promise<Order> {
    const response = await axios.post<ApiResponse<Order>>('/api/orders', orderData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create order');
    }

    return response.data.data;
  }

  /**
   * Update order
   */
  static async updateOrder(id: string, orderData: UpdateOrderForm): Promise<Order> {
    const response = await axios.put<ApiResponse<Order>>(`/api/orders/${id}`, orderData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to update order');
    }

    return response.data.data;
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const response = await axios.post<ApiResponse<Order>>(`/api/orders/${id}/status`, { status });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to update order status');
    }

    return response.data.data;
  }

  /**
   * Confirm order (supplier action)
   */
  static async confirmOrder(id: string): Promise<Order> {
    const response = await axios.post<ApiResponse<Order>>(`/api/orders/${id}/confirm`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to confirm order');
    }

    return response.data.data;
  }

  /**
   * Cancel order
   */
  static async cancelOrder(id: string): Promise<Order> {
    const response = await axios.post<ApiResponse<Order>>(`/api/orders/${id}/cancel`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to cancel order');
    }

    return response.data.data;
  }

  /**
   * Delete order (admin only)
   */
  static async deleteOrder(id: string): Promise<void> {
    const response = await axios.delete<ApiResponse<void>>(`/api/orders/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete order');
    }
  }

  /**
   * Convert inquiry to order
   */
  static async convertInquiryToOrder(inquiryId: string, orderData: Omit<CreateOrderForm, 'inquiryId'>): Promise<Order> {
    const response = await axios.post<ApiResponse<Order>>(`/api/orders/convert/${inquiryId}`, orderData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to convert inquiry to order');
    }

    return response.data.data;
  }
}