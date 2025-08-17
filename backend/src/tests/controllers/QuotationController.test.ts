import { Request, Response } from 'express';
import { Pool } from 'pg';
import { QuotationController } from '../../controllers/QuotationController';
import { QuotationModel } from '../../models/Quotation';
import { AuthenticatedRequest } from '../../middleware/auth';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock QuotationModel
jest.mock('../../models/Quotation');

describe('QuotationController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockDb: Pool;
  let mockQuotationModel: jest.Mocked<QuotationModel>;

  beforeEach(() => {
    mockDb = {} as Pool;
    mockRequest = {
      db: mockDb,
      body: {},
      params: {},
      user: {
        id: 'user-123',
        role: 'supplier',
        username: 'supplier1',
        company: 'yunjie'
      }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock QuotationModel constructor and methods
    mockQuotationModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByInquiryId: jest.fn(),
      findByCreatedBy: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      delete: jest.fn()
    } as any;

    (QuotationModel as jest.MockedClass<typeof QuotationModel>).mockImplementation(() => mockQuotationModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuotation', () => {
    const validQuotationData = {
      inquiryId: 'inquiry-123',
      unitPrice: 100.50,
      totalPrice: 1005.00,
      deliveryTime: 30,
      remarks: '测试备注'
    };

    const mockCreatedQuotation = {
      id: 'quotation-123',
      inquiryId: 'inquiry-123',
      unitPrice: 100.50,
      totalPrice: 1005.00,
      deliveryTime: 30,
      remarks: '测试备注',
      status: 'active' as const,
      createdBy: 'user-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    };

    it('应该成功创建报价', async () => {
      mockRequest.body = validQuotationData;
      mockRequest.db = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ created_by: 'buyer-123' }] }) // 询单查询
      } as any;
      
      mockQuotationModel.create.mockResolvedValue(mockCreatedQuotation);

      await QuotationController.createQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockQuotationModel.create).toHaveBeenCalledWith(validQuotationData, 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'quotation-123',
          inquiryId: 'inquiry-123',
          unitPrice: 100.50,
          totalPrice: 1005.00,
          deliveryTime: 30,
          remarks: '测试备注',
          status: 'active',
          createdBy: 'user-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      });
    });

    it('应该拒绝非供应商用户创建报价', async () => {
      mockRequest.user!.role = 'buyer';
      mockRequest.body = validQuotationData;

      await QuotationController.createQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '只有供应商用户可以创建报价'
        }
      });
    });

    it('应该验证必填字段', async () => {
      mockRequest.body = { inquiryId: 'inquiry-123' }; // 缺少其他必填字段

      await QuotationController.createQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: '询单ID、单价、总价和工期为必填字段'
        }
      });
    });

    it('应该处理创建报价时的错误', async () => {
      mockRequest.body = validQuotationData;
      mockQuotationModel.create.mockRejectedValue(new Error('该询单已存在活跃的报价'));

      await QuotationController.createQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '该询单已存在活跃的报价'
        }
      });
    });
  });

  describe('getQuotation', () => {
    const mockQuotation = {
      id: 'quotation-123',
      inquiryId: 'inquiry-123',
      unitPrice: 100.50,
      totalPrice: 1005.00,
      deliveryTime: 30,
      remarks: '测试备注',
      status: 'active' as const,
      createdBy: 'user-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    };

    it('应该成功获取报价详情', async () => {
      mockRequest.params = { id: 'quotation-123' };
      mockQuotationModel.findById.mockResolvedValue(mockQuotation);

      await QuotationController.getQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockQuotationModel.findById).toHaveBeenCalledWith('quotation-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'quotation-123',
          inquiryId: 'inquiry-123',
          unitPrice: 100.50,
          totalPrice: 1005.00,
          deliveryTime: 30,
          remarks: '测试备注',
          status: 'active',
          createdBy: 'user-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      });
    });

    it('应该在报价不存在时返回404', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockQuotationModel.findById.mockResolvedValue(null);

      await QuotationController.getQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'QUOTATION_NOT_FOUND',
          message: '报价不存在'
        }
      });
    });

    it('应该验证供应商只能查看自己创建的报价', async () => {
      mockRequest.params = { id: 'quotation-123' };
      const otherUserQuotation = { ...mockQuotation, createdBy: 'other-user' };
      mockQuotationModel.findById.mockResolvedValue(otherUserQuotation);

      await QuotationController.getQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '只能查看自己创建的报价'
        }
      });
    });

    it('应该允许买方查看所有报价', async () => {
      mockRequest.params = { id: 'quotation-123' };
      mockRequest.user!.role = 'buyer';
      const otherUserQuotation = { ...mockQuotation, createdBy: 'other-user' };
      mockQuotationModel.findById.mockResolvedValue(otherUserQuotation);

      await QuotationController.getQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getQuotationByInquiry', () => {
    const mockQuotation = {
      id: 'quotation-123',
      inquiryId: 'inquiry-123',
      unitPrice: 100.50,
      totalPrice: 1005.00,
      deliveryTime: 30,
      remarks: null,
      status: 'active' as const,
      createdBy: 'user-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    };

    it('应该根据询单ID获取报价', async () => {
      mockRequest.params = { inquiryId: 'inquiry-123' };
      mockQuotationModel.findByInquiryId.mockResolvedValue(mockQuotation);

      await QuotationController.getQuotationByInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockQuotationModel.findByInquiryId).toHaveBeenCalledWith('inquiry-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'quotation-123',
          inquiryId: 'inquiry-123',
          unitPrice: 100.50,
          totalPrice: 1005.00,
          deliveryTime: 30,
          remarks: null,
          status: 'active',
          createdBy: 'user-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      });
    });

    it('应该在询单无报价时返回404', async () => {
      mockRequest.params = { inquiryId: 'inquiry-123' };
      mockQuotationModel.findByInquiryId.mockResolvedValue(null);

      await QuotationController.getQuotationByInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'QUOTATION_NOT_FOUND',
          message: '该询单暂无报价'
        }
      });
    });
  });

  describe('getUserQuotations', () => {
    const mockQuotations = [
      {
        id: 'quotation-1',
        inquiryId: 'inquiry-1',
        unitPrice: 100.00,
        totalPrice: 1000.00,
        deliveryTime: 30,
        remarks: null,
        status: 'active' as const,
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      },
      {
        id: 'quotation-2',
        inquiryId: 'inquiry-2',
        unitPrice: 200.00,
        totalPrice: 2000.00,
        deliveryTime: 45,
        remarks: '备注',
        status: 'cancelled' as const,
        createdBy: 'user-123',
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z')
      }
    ];

    it('应该获取供应商用户的所有报价', async () => {
      mockQuotationModel.findByCreatedBy.mockResolvedValue(mockQuotations);

      await QuotationController.getUserQuotations(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockQuotationModel.findByCreatedBy).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: 'quotation-1',
            inquiryId: 'inquiry-1',
            unitPrice: 100.00,
            totalPrice: 1000.00,
            deliveryTime: 30,
            remarks: null,
            status: 'active',
            createdBy: 'user-123',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          },
          {
            id: 'quotation-2',
            inquiryId: 'inquiry-2',
            unitPrice: 200.00,
            totalPrice: 2000.00,
            deliveryTime: 45,
            remarks: '备注',
            status: 'cancelled',
            createdBy: 'user-123',
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      });
    });

    it('应该拒绝非供应商用户查看报价列表', async () => {
      mockRequest.user!.role = 'buyer';

      await QuotationController.getUserQuotations(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '只有供应商用户可以查看报价列表'
        }
      });
    });
  });

  describe('updateQuotation', () => {
    const updateData = {
      unitPrice: 120.00,
      totalPrice: 1200.00,
      deliveryTime: 25,
      remarks: '更新的备注'
    };

    const mockUpdatedQuotation = {
      id: 'quotation-123',
      inquiryId: 'inquiry-123',
      unitPrice: 120.00,
      totalPrice: 1200.00,
      deliveryTime: 25,
      remarks: '更新的备注',
      status: 'active' as const,
      createdBy: 'user-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T01:00:00Z')
    };

    it('应该成功更新报价', async () => {
      mockRequest.params = { id: 'quotation-123' };
      mockRequest.body = updateData;
      mockQuotationModel.update.mockResolvedValue(mockUpdatedQuotation);

      await QuotationController.updateQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockQuotationModel.update).toHaveBeenCalledWith('quotation-123', updateData, 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'quotation-123',
          inquiryId: 'inquiry-123',
          unitPrice: 120.00,
          totalPrice: 1200.00,
          deliveryTime: 25,
          remarks: '更新的备注',
          status: 'active',
          createdBy: 'user-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z'
        }
      });
    });

    it('应该拒绝非供应商用户更新报价', async () => {
      mockRequest.user!.role = 'buyer';
      mockRequest.params = { id: 'quotation-123' };
      mockRequest.body = updateData;

      await QuotationController.updateQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '只有供应商用户可以修改报价'
        }
      });
    });

    it('应该处理更新报价时的错误', async () => {
      mockRequest.params = { id: 'quotation-123' };
      mockRequest.body = updateData;
      mockQuotationModel.update.mockRejectedValue(new Error('只能修改自己创建的报价'));

      await QuotationController.updateQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '只能修改自己创建的报价'
        }
      });
    });
  });

  describe('cancelQuotation', () => {
    const mockCancelledQuotation = {
      id: 'quotation-123',
      inquiryId: 'inquiry-123',
      unitPrice: 100.50,
      totalPrice: 1005.00,
      deliveryTime: 30,
      remarks: '测试备注',
      status: 'cancelled' as const,
      createdBy: 'user-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T01:00:00Z')
    };

    it('应该成功作废报价', async () => {
      mockRequest.params = { id: 'quotation-123' };
      mockQuotationModel.cancel.mockResolvedValue(mockCancelledQuotation);

      await QuotationController.cancelQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockQuotationModel.cancel).toHaveBeenCalledWith('quotation-123', 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'quotation-123',
          inquiryId: 'inquiry-123',
          unitPrice: 100.50,
          totalPrice: 1005.00,
          deliveryTime: 30,
          remarks: '测试备注',
          status: 'cancelled',
          createdBy: 'user-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z'
        }
      });
    });

    it('应该拒绝非供应商用户作废报价', async () => {
      mockRequest.user!.role = 'buyer';
      mockRequest.params = { id: 'quotation-123' };

      await QuotationController.cancelQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '只有供应商用户可以作废报价'
        }
      });
    });
  });

  describe('deleteQuotation', () => {
    it('应该允许管理员删除报价', async () => {
      mockRequest.user!.role = 'admin';
      mockRequest.params = { id: 'quotation-123' };
      mockQuotationModel.delete.mockResolvedValue(true);

      await QuotationController.deleteQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockQuotationModel.delete).toHaveBeenCalledWith('quotation-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '报价删除成功'
      });
    });

    it('应该拒绝非管理员用户删除报价', async () => {
      mockRequest.params = { id: 'quotation-123' };

      await QuotationController.deleteQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '只有管理员可以删除报价'
        }
      });
    });

    it('应该在报价不存在时返回404', async () => {
      mockRequest.user!.role = 'admin';
      mockRequest.params = { id: 'non-existent' };
      mockQuotationModel.delete.mockResolvedValue(false);

      await QuotationController.deleteQuotation(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'QUOTATION_NOT_FOUND',
          message: '报价不存在'
        }
      });
    });
  });
});