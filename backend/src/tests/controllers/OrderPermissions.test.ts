import { OrderController } from '../../controllers/OrderController';
import { AuthenticatedRequest } from '../../types/user';
import { Response } from 'express';
import * as permissionUtils from '../../utils/permissionUtils';

// Mock the modules
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

jest.mock('../../models/Order', () => ({
  OrderModel: jest.fn().mockImplementation(() => mockOrderModel)
}));

jest.mock('../../models/Inquiry', () => ({
  InquiryModel: jest.fn().mockImplementation(() => mockInquiryModel)
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => mockNotificationService)
}));

// Spy on permission functions
jest.spyOn(permissionUtils, 'canUserAccessOrder');
jest.spyOn(permissionUtils, 'canUserModifyOrder');
jest.spyOn(permissionUtils, 'canUserDeleteOrder');

describe('OrderController - 权限控制测试', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
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

  describe('买方用户权限测试', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'buyer-123',
        username: 'buyer_user',
        role: 'buyer',
        company: 'arroz'
      };
    });

    it('买方用户只能查看自己创建的订单', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-20240115-0001',
          createdBy: 'buyer-123'
        }
      ];

      mockOrderModel.findAll.mockResolvedValue({
        orders: mockOrders,
        total: 1
      });

      await OrderController.getAllOrders(mockReq as AuthenticatedRequest, mockRes as Response);

      // 验证查询参数包含了 createdBy 过滤
      expect(mockOrderModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'buyer-123'
        })
      );
    });

    it('买方用户可以访问自己创建的订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserAccessOrder as jest.Mock).mockReturnValue(true);

      await OrderController.getOrderById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(permissionUtils.canUserAccessOrder).toHaveBeenCalledWith(mockReq.user, mockOrder);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder
      });
    });

    it('买方用户不能访问其他用户创建的订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'other-buyer-456'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserAccessOrder as jest.Mock).mockReturnValue(false);

      await OrderController.getOrderById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '无权访问此订单'
        }
      });
    });

    it('买方用户可以修改自己创建的订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123',
        status: 'pending',
        unitPrice: 100,
        quantity: 10
      };

      const updateData = { productName: 'Updated Product' };
      const mockUpdatedOrder = { ...mockOrder, ...updateData };

      mockReq.params = { id: 'order-123' };
      mockReq.body = updateData;
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canModify.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockUpdatedOrder);
      (permissionUtils.canUserModifyOrder as jest.Mock).mockReturnValue(true);

      await OrderController.updateOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(permissionUtils.canUserModifyOrder).toHaveBeenCalledWith(mockReq.user, mockOrder);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedOrder,
        message: '订单更新成功'
      });
    });

    it('买方用户不能修改其他用户创建的订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'other-buyer-456'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { productName: 'Updated' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserModifyOrder as jest.Mock).mockReturnValue(false);

      await OrderController.updateOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '无权修改此订单'
        }
      });
    });

    it('买方用户可以作废自己创建的未确认订单', async () => {
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        createdBy: 'buyer-123',
        status: 'pending'
      };

      const mockCancelledOrder = { ...mockOrder, status: 'cancelled' };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canCancel.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockCancelledOrder);
      (permissionUtils.canUserModifyOrder as jest.Mock).mockReturnValue(true);

      await OrderController.cancelOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCancelledOrder,
        message: '订单作废成功'
      });
    });

    it('买方用户不能作废已确认的订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123',
        status: 'confirmed'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canCancel.mockReturnValue(true);
      (permissionUtils.canUserModifyOrder as jest.Mock).mockReturnValue(true);

      await OrderController.cancelOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ORDER_CONFIRMED',
          message: '订单已被供应商确认，无法作废'
        }
      });
    });

    it('买方用户不能删除订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserDeleteOrder as jest.Mock).mockReturnValue(false);

      await OrderController.deleteOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '无权删除此订单'
        }
      });
    });
  });

  describe('供应商用户权限测试', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'supplier-123',
        username: 'supplier_user',
        role: 'supplier',
        company: 'yunjie'
      };
    });

    it('供应商用户可以查看所有订单', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-20240115-0001',
          createdBy: 'buyer-123'
        },
        {
          id: 'order-2',
          orderNumber: 'ORD-20240115-0002',
          createdBy: 'buyer-456'
        }
      ];

      mockOrderModel.findAll.mockResolvedValue({
        orders: mockOrders,
        total: 2
      });

      await OrderController.getAllOrders(mockReq as AuthenticatedRequest, mockRes as Response);

      // 供应商查询不应该有 createdBy 过滤
      expect(mockOrderModel.findAll).toHaveBeenCalledWith(
        expect.not.objectContaining({
          createdBy: expect.any(String)
        })
      );
    });

    it('供应商用户可以访问任何订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserAccessOrder as jest.Mock).mockReturnValue(true);

      await OrderController.getOrderById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder
      });
    });

    it('供应商用户不能修改订单基本信息', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { productName: 'Updated' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserModifyOrder as jest.Mock).mockReturnValue(false);

      await OrderController.updateOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '无权修改此订单'
        }
      });
    });

    it('供应商用户可以确认订单', async () => {
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        status: 'pending',
        createdBy: 'buyer-123'
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'confirmed',
        confirmedBy: 'supplier-123'
      };

      mockReq.params = { id: 'order-123' };
      mockReq.body = { status: 'confirmed', confirmedBy: 'supplier-123' };
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

    it('供应商用户可以作废任何订单', async () => {
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20240115-0001',
        createdBy: 'buyer-123',
        status: 'confirmed'
      };

      const mockCancelledOrder = { ...mockOrder, status: 'cancelled' };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canCancel.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockCancelledOrder);
      (permissionUtils.canUserModifyOrder as jest.Mock).mockReturnValue(false); // 供应商不能修改基本信息，但可以作废

      await OrderController.cancelOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCancelledOrder,
        message: '订单作废成功'
      });
    });

    it('供应商用户不能删除订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserDeleteOrder as jest.Mock).mockReturnValue(false);

      await OrderController.deleteOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '无权删除此订单'
        }
      });
    });
  });

  describe('管理员用户权限测试', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'admin-123',
        username: 'admin',
        role: 'admin',
        company: 'admin'
      };
    });

    it('管理员可以查看所有订单', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-20240115-0001',
          createdBy: 'buyer-123'
        },
        {
          id: 'order-2',
          orderNumber: 'ORD-20240115-0002',
          createdBy: 'buyer-456'
        }
      ];

      mockOrderModel.findAll.mockResolvedValue({
        orders: mockOrders,
        total: 2
      });

      await OrderController.getAllOrders(mockReq as AuthenticatedRequest, mockRes as Response);

      // 管理员查询不应该有 createdBy 过滤
      expect(mockOrderModel.findAll).toHaveBeenCalledWith(
        expect.not.objectContaining({
          createdBy: expect.any(String)
        })
      );
    });

    it('管理员可以访问任何订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      (permissionUtils.canUserAccessOrder as jest.Mock).mockReturnValue(true);

      await OrderController.getOrderById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder
      });
    });

    it('管理员可以修改任何订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123',
        status: 'pending',
        unitPrice: 100,
        quantity: 10
      };

      const updateData = { productName: 'Updated Product' };
      const mockUpdatedOrder = { ...mockOrder, ...updateData };

      mockReq.params = { id: 'order-123' };
      mockReq.body = updateData;
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.canModify.mockReturnValue(true);
      mockOrderModel.update.mockResolvedValue(mockUpdatedOrder);
      (permissionUtils.canUserModifyOrder as jest.Mock).mockReturnValue(true);

      await OrderController.updateOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedOrder,
        message: '订单更新成功'
      });
    });

    it('管理员可以删除任何订单', async () => {
      const mockOrder = {
        id: 'order-123',
        createdBy: 'buyer-123'
      };

      mockReq.params = { id: 'order-123' };
      mockOrderModel.findById.mockResolvedValue(mockOrder);
      mockOrderModel.delete.mockResolvedValue(true);
      (permissionUtils.canUserDeleteOrder as jest.Mock).mockReturnValue(true);

      await OrderController.deleteOrder(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '订单删除成功'
      });
    });
  });

  describe('权限工具函数测试', () => {
    it('canUserAccessOrder 应该正确检查访问权限', () => {
      const buyerUser = { id: 'buyer-123', role: 'buyer' };
      const supplierUser = { id: 'supplier-123', role: 'supplier' };
      const adminUser = { id: 'admin-123', role: 'admin' };
      
      const order = { id: 'order-123', createdBy: 'buyer-123' };

      // 重置 mock 并使用真实函数
      (permissionUtils.canUserAccessOrder as jest.Mock).mockRestore();

      expect(permissionUtils.canUserAccessOrder(buyerUser, order)).toBe(true);
      expect(permissionUtils.canUserAccessOrder(supplierUser, order)).toBe(true);
      expect(permissionUtils.canUserAccessOrder(adminUser, order)).toBe(true);

      // 买方用户不能访问其他用户的订单
      const otherOrder = { id: 'order-456', createdBy: 'other-buyer' };
      expect(permissionUtils.canUserAccessOrder(buyerUser, otherOrder)).toBe(false);
    });

    it('canUserModifyOrder 应该正确检查修改权限', () => {
      const buyerUser = { id: 'buyer-123', role: 'buyer' };
      const supplierUser = { id: 'supplier-123', role: 'supplier' };
      const adminUser = { id: 'admin-123', role: 'admin' };
      
      const order = { id: 'order-123', createdBy: 'buyer-123' };

      // 重置 mock 并使用真实函数
      (permissionUtils.canUserModifyOrder as jest.Mock).mockRestore();

      expect(permissionUtils.canUserModifyOrder(buyerUser, order)).toBe(true);
      expect(permissionUtils.canUserModifyOrder(supplierUser, order)).toBe(false);
      expect(permissionUtils.canUserModifyOrder(adminUser, order)).toBe(true);
    });

    it('canUserDeleteOrder 应该正确检查删除权限', () => {
      const buyerUser = { id: 'buyer-123', role: 'buyer' };
      const supplierUser = { id: 'supplier-123', role: 'supplier' };
      const adminUser = { id: 'admin-123', role: 'admin' };
      
      const order = { id: 'order-123', createdBy: 'buyer-123' };

      // 重置 mock 并使用真实函数
      (permissionUtils.canUserDeleteOrder as jest.Mock).mockRestore();

      expect(permissionUtils.canUserDeleteOrder(buyerUser, order)).toBe(false);
      expect(permissionUtils.canUserDeleteOrder(supplierUser, order)).toBe(false);
      expect(permissionUtils.canUserDeleteOrder(adminUser, order)).toBe(true);
    });
  });
});