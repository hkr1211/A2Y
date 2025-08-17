import { OrderController } from '../../controllers/OrderController';
import { AuthenticatedRequest } from '../../types/user';
import { Response } from 'express';

// Simple mock setup
const mockOrderModel = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  canModify: jest.fn(),
  canCancel: jest.fn(),
  canUpdateStatus: jest.fn(),
};

const mockInquiryModel = {
  findById: jest.fn(),
  update: jest.fn(),
};

const mockNotificationService = {
  createNotification: jest.fn(),
};

// Mock the modules
jest.mock('../../models/Order', () => ({
  OrderModel: jest.fn().mockImplementation(() => mockOrderModel)
}));

jest.mock('../../models/Inquiry', () => ({
  InquiryModel: jest.fn().mockImplementation(() => mockInquiryModel)
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => mockNotificationService)
}));

jest.mock('../../utils/permissionUtils', () => ({
  canUserAccessOrder: jest.fn().mockReturnValue(true),
  canUserModifyOrder: jest.fn().mockReturnValue(true),
  canUserDeleteOrder: jest.fn().mockReturnValue(true),
}));

describe('OrderController', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        username: 'testuser',
        role: 'buyer',
        company: 'arroz'
      },
      params: {},
      query: {},
      body: {},
      app: {
        get: jest.fn().mockReturnValue({})
      }
    } as any;

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getAllOrders', () => {
    it('应该成功获取订单列表', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-20240115-0001',
          productName: 'Test Product',
          status: 'pending',
          createdBy: 'user-123'
        }
      ];

      mockOrderModel.findAll.mockResolvedValue({
        orders: mockOrders,
        total: 1
      });

      await OrderController.getAllOrders(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          orders: mockOrders,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }
      });
    });

    it('应该处理获取订单列表时的错误', async () => {
      mockOrderModel.findAll.mockRejectedValue(new Error('Database error'));

      await OrderController.getAllOrders(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'GET_ORDERS_ERROR',
          message: '获取订单列表失败'
        }
      });
    });
  });

  describe('createOrder', () => {
    it('应该成功创建独立订单', async () => {
      const orderData = {
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'Test specs',
        unitPrice: 100,
        quantity: 10,
        totalPrice: 1000
      };

      const mockCreatedOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        ...orderData,
        createdBy: 'user-123'
      };

      mockReq.body = orderData;
      mockOrderModel.create.mockResolvedValue(mockCreatedOrder);

      await OrderController.createOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedOrder,
        message: '订单创建成功'
      });
    });

    it('应该拒绝非买方用户创建订单', async () => {
      mockReq.user!.role = 'supplier';
      mockReq.body = { productName: 'Test' };

      await OrderController.createOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '只有买方用户可以创建订单'
        }
      });
    });
  });

  describe('getOrderById', () => {
    it('应该成功获取订单详情', async () => {
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        productName: 'Test Product',
        createdBy: 'user-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);

      await OrderController.getOrderById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder
      });
    });

    it('应该在订单不存在时返回404', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockOrderModel.findById.mockResolvedValue(null);

      await OrderController.getOrderById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: '订单不存在'
        }
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('应该允许供应商确认订单', async () => {
      mockReq.user!.role = 'supplier';
      
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        status: 'pending',
        createdBy: 'buyer-123'
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'confirmed',
        confirmedBy: 'user-123'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'confirmed', confirmedBy: 'user-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockUpdatedOrder);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedOrder,
        message: '订单状态更新成功'
      });
    });

    it('应该允许供应商更新订单为生产中', async () => {
      mockReq.user!.role = 'supplier';
      
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        status: 'confirmed',
        createdBy: 'buyer-123',
        confirmedBy: 'supplier-123'
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'production'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'production' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockUpdatedOrder);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedOrder,
        message: '订单状态更新成功'
      });
    });

    it('应该允许供应商更新订单为已发货', async () => {
      mockReq.user!.role = 'supplier';
      
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        status: 'production',
        createdBy: 'buyer-123',
        confirmedBy: 'supplier-123'
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'shipped'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'shipped' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockUpdatedOrder);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedOrder,
        message: '订单状态更新成功'
      });
    });

    it('应该允许买方确认订单完成', async () => {
      mockReq.user!.role = 'buyer';
      
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        status: 'shipped',
        createdBy: 'user-123',
        confirmedBy: 'supplier-123'
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'completed'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'completed' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockUpdatedOrder);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedOrder,
        message: '订单状态更新成功'
      });
    });

    it('应该拒绝买方用户确认订单', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'pending'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'confirmed' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '只有供应商可以确认订单'
        }
      });
    });

    it('应该拒绝供应商更新生产和发货状态给买方', async () => {
      mockReq.user!.role = 'buyer';
      
      const mockOrder = {
        id: 'order-123',
        status: 'confirmed'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'production' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '只有供应商可以更新生产和发货状态'
        }
      });
    });

    it('应该拒绝供应商确认订单完成', async () => {
      mockReq.user!.role = 'supplier';
      
      const mockOrder = {
        id: 'order-123',
        status: 'shipped'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'completed' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '只有买方可以确认订单完成'
        }
      });
    });

    it('应该拒绝无效的状态转换', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'completed'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'pending' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(false);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: '无法从 completed 状态转换到 pending 状态'
        }
      });
    });

    it('应该发送状态变更通知', async () => {
      mockReq.user!.role = 'supplier';
      
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        status: 'pending',
        createdBy: 'buyer-123'
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'confirmed',
        confirmedBy: 'user-123'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'confirmed', confirmedBy: 'user-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canUpdateStatus.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockUpdatedOrder);

      await OrderController.updateOrderStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 'buyer-123',
        type: 'status_updated',
        title: '订单状态更新',
        content: `订单 ${mockOrder.orderNumber} 状态已更新为 confirmed`,
        relatedId: 'order-123',
        relatedType: 'order'
      });
    });
  });

  describe('cancelOrder', () => {
    it('应该成功作废订单', async () => {
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        createdBy: 'user-123',
        status: 'pending'
      };

      const mockCancelledOrder = {
        ...mockOrder,
        status: 'cancelled'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canCancel.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockCancelledOrder);

      await OrderController.cancelOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCancelledOrder,
        message: '订单作废成功'
      });
    });
  });

  describe('deleteOrder', () => {
    it('应该允许管理员删除订单', async () => {
      mockReq.user!.role = 'admin';
      
      const mockOrder = {
        id: 'order-123',
        createdBy: 'user-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.delete.mockResolvedValue(true);

      await OrderController.deleteOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '订单删除成功'
      });
    });
  });
});