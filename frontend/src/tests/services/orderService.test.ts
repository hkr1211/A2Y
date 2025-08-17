import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '@/services/orderService';
import axios from '@/services/api';
import type { Order, OrderStatus, OrderListParams, CreateOrderForm, UpdateOrderForm } from '@/types/order';

// Mock axios
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockOrder: Order = {
  id: '1',
  orderNumber: 'ORD-001',
  productName: 'Test Product',
  materialType: 'Steel',
  quantity: 100,
  totalPrice: 10000,
  status: 'pending',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockOrders: Order[] = [mockOrder];

describe('OrderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAxios = axios as any;

  describe('getOrders', () => {
    it('fetches orders with default parameters', async () => {
      const mockResponse = {
        data: { 
          success: true,
          data: { data: mockOrders, total: 1 }
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await OrderService.getOrders();

      expect(mockAxios.get).toHaveBeenCalledWith('/api/orders', {
        params: {},
      });
      expect(result).toEqual({ data: mockOrders, total: 1 });
    });

    it('fetches orders with custom parameters', async () => {
      const mockResponse = {
        data: { 
          success: true,
          data: { data: mockOrders, total: 1 }
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const params: OrderListParams = {
        page: 2,
        limit: 50,
        search: 'test',
        status: 'pending',
      };

      const result = await OrderService.getOrders(params);

      expect(mockAxios.get).toHaveBeenCalledWith('/api/orders', { params });
      expect(result).toEqual({ data: mockOrders, total: 1 });
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Network error' }
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      await expect(OrderService.getOrders()).rejects.toThrow('Network error');
    });
  });

  describe('getOrderById', () => {
    it('fetches order by id successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: mockOrder,
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await OrderService.getOrderById('1');

      expect(mockAxios.get).toHaveBeenCalledWith('/api/orders/1');
      expect(result).toEqual(mockOrder);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Order not found' }
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      await expect(OrderService.getOrderById('1')).rejects.toThrow('Order not found');
    });
  });

  describe('createOrder', () => {
    it('creates order successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: mockOrder,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const orderData: CreateOrderForm = {
        productName: 'Test Product',
        materialType: 'Steel',
        quantity: 100,
        unitPrice: 100,
        totalPrice: 10000,
        description: 'Test description',
      };

      const result = await OrderService.createOrder(orderData);

      expect(mockAxios.post).toHaveBeenCalledWith('/api/orders', orderData);
      expect(result).toEqual(mockOrder);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Validation error' }
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const orderData: CreateOrderForm = {
        productName: 'Test Product',
        materialType: 'Steel',
        quantity: 100,
        unitPrice: 100,
        totalPrice: 10000,
      };

      await expect(OrderService.createOrder(orderData)).rejects.toThrow('Validation error');
    });
  });

  describe('updateOrder', () => {
    it('updates order successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: mockOrder,
        },
      };
      mockAxios.put.mockResolvedValue(mockResponse);

      const updateData: UpdateOrderForm = {
        productName: 'Updated Product',
        quantity: 200,
      };

      const result = await OrderService.updateOrder('1', updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/api/orders/1', updateData);
      expect(result).toEqual(mockOrder);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Order not found' }
        },
      };
      mockAxios.put.mockResolvedValue(mockResponse);

      const updateData: UpdateOrderForm = {
        productName: 'Updated Product',
      };

      await expect(OrderService.updateOrder('1', updateData)).rejects.toThrow('Order not found');
    });
  });

  describe('deleteOrder', () => {
    it('deletes order successfully', async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockAxios.delete.mockResolvedValue(mockResponse);

      await OrderService.deleteOrder('1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/api/orders/1');
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Order not found' }
        },
      };
      mockAxios.delete.mockResolvedValue(mockResponse);

      await expect(OrderService.deleteOrder('1')).rejects.toThrow('Order not found');
    });
  });

  describe('confirmOrder', () => {
    it('confirms order successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { ...mockOrder, status: 'confirmed' },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await OrderService.confirmOrder('1');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/orders/1/confirm');
      expect(result).toEqual({ ...mockOrder, status: 'confirmed' });
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Cannot confirm order' }
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await expect(OrderService.confirmOrder('1')).rejects.toThrow('Cannot confirm order');
    });
  });

  describe('cancelOrder', () => {
    it('cancels order successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { ...mockOrder, status: 'cancelled' },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await OrderService.cancelOrder('1');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/orders/1/cancel');
      expect(result).toEqual({ ...mockOrder, status: 'cancelled' });
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Cannot cancel order' }
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await expect(OrderService.cancelOrder('1')).rejects.toThrow('Cannot cancel order');
    });
  });

  describe('updateOrderStatus', () => {
    it('updates order status successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { ...mockOrder, status: 'production' },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await OrderService.updateOrderStatus('1', 'production');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/orders/1/status', { status: 'production' });
      expect(result).toEqual({ ...mockOrder, status: 'production' });
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Invalid status transition' }
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await expect(OrderService.updateOrderStatus('1', 'production')).rejects.toThrow('Invalid status transition');
    });
  });

  describe('convertInquiryToOrder', () => {
    it('converts inquiry to order successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: mockOrder,
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const orderData = {
        unitPrice: 100,
        totalPrice: 10000,
        description: 'Test description',
      };

      const result = await OrderService.convertInquiryToOrder('inquiry1', orderData);

      expect(mockAxios.post).toHaveBeenCalledWith('/api/orders/convert/inquiry1', orderData);
      expect(result).toEqual(mockOrder);
    });

    it('handles API errors', async () => {
      const mockResponse = {
        data: { 
          success: false,
          error: { message: 'Inquiry not found' }
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const orderData = {
        unitPrice: 100,
        totalPrice: 10000,
      };

      await expect(OrderService.convertInquiryToOrder('inquiry1', orderData)).rejects.toThrow('Inquiry not found');
    });
  });
});