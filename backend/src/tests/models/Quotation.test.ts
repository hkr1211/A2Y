import { Pool } from 'pg';
import { QuotationModel } from '../../models/Quotation';
import { CreateQuotationRequest, UpdateQuotationRequest } from '../../types/quotation';

// Mock Pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('QuotationModel', () => {
  let quotationModel: QuotationModel;

  beforeEach(() => {
    quotationModel = new QuotationModel(mockPool);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validQuotationData: CreateQuotationRequest = {
      inquiryId: 'inquiry-123',
      unitPrice: 100.50,
      totalPrice: 1005.00,
      deliveryTime: 30,
      remarks: '测试备注'
    };

    const mockInquiryRow = {
      id: 'inquiry-123',
      status: 'published'
    };

    const mockQuotationRow = {
      id: 'quotation-123',
      inquiry_id: 'inquiry-123',
      unit_price: '100.50',
      total_price: '1005.00',
      delivery_time: 30,
      remarks: '测试备注',
      status: 'active',
      created_by: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('应该成功创建报价', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiryRow] }) // 询单检查
        .mockResolvedValueOnce({ rows: [] }) // 现有报价检查
        .mockResolvedValueOnce({ rows: [mockQuotationRow] }); // 创建报价

      const result = await quotationModel.create(validQuotationData, 'user-123');

      expect(result).toEqual({
        id: 'quotation-123',
        inquiryId: 'inquiry-123',
        unitPrice: 100.50,
        totalPrice: 1005.00,
        deliveryTime: 30,
        remarks: '测试备注',
        status: 'active',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      });
    });

    it('应该验证单价必须大于0', async () => {
      const invalidData = { ...validQuotationData, unitPrice: -10 };

      await expect(quotationModel.create(invalidData, 'user-123'))
        .rejects.toThrow('数据验证失败: 单价必须是大于0的数字');
    });

    it('应该验证总价必须大于0', async () => {
      const invalidData = { ...validQuotationData, totalPrice: 0 };

      await expect(quotationModel.create(invalidData, 'user-123'))
        .rejects.toThrow('数据验证失败: 总价必须是大于0的数字');
    });

    it('应该验证工期必须是正整数', async () => {
      const invalidData = { ...validQuotationData, deliveryTime: -5 };

      await expect(quotationModel.create(invalidData, 'user-123'))
        .rejects.toThrow('数据验证失败: 工期必须是大于0的整数');
    });

    it('应该验证工期必须是整数', async () => {
      const invalidData = { ...validQuotationData, deliveryTime: 10.5 };

      await expect(quotationModel.create(invalidData, 'user-123'))
        .rejects.toThrow('数据验证失败: 工期必须是大于0的整数');
    });

    it('应该验证备注长度不能超过1000字符', async () => {
      const invalidData = { ...validQuotationData, remarks: 'a'.repeat(1001) };

      await expect(quotationModel.create(invalidData, 'user-123'))
        .rejects.toThrow('数据验证失败: 备注长度不能超过1000个字符');
    });

    it('应该检查询单是否存在', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }); // 询单不存在

      await expect(quotationModel.create(validQuotationData, 'user-123'))
        .rejects.toThrow('询单不存在');
    });

    it('应该检查询单状态是否为已发布', async () => {
      const draftInquiry = { ...mockInquiryRow, status: 'draft' };
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [draftInquiry] });

      await expect(quotationModel.create(validQuotationData, 'user-123'))
        .rejects.toThrow('只能对已发布的询单进行报价');
    });

    it('应该检查是否已存在活跃的报价', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockInquiryRow] }) // 询单检查
        .mockResolvedValueOnce({ rows: [{ id: 'existing-quotation' }] }); // 已存在报价

      await expect(quotationModel.create(validQuotationData, 'user-123'))
        .rejects.toThrow('该询单已存在活跃的报价');
    });
  });

  describe('findById', () => {
    it('应该根据ID找到报价', async () => {
      const mockRow = {
        id: 'quotation-123',
        inquiry_id: 'inquiry-123',
        unit_price: '100.50',
        total_price: '1005.00',
        delivery_time: 30,
        remarks: '测试备注',
        status: 'active',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

      const result = await quotationModel.findById('quotation-123');

      expect(result).toEqual({
        id: 'quotation-123',
        inquiryId: 'inquiry-123',
        unitPrice: 100.50,
        totalPrice: 1005.00,
        deliveryTime: 30,
        remarks: '测试备注',
        status: 'active',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      });
    });

    it('应该在找不到报价时返回null', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await quotationModel.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByInquiryId', () => {
    it('应该根据询单ID找到活跃的报价', async () => {
      const mockRow = {
        id: 'quotation-123',
        inquiry_id: 'inquiry-123',
        unit_price: '100.50',
        total_price: '1005.00',
        delivery_time: 30,
        remarks: null,
        status: 'active',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

      const result = await quotationModel.findByInquiryId('inquiry-123');

      expect(result).toEqual({
        id: 'quotation-123',
        inquiryId: 'inquiry-123',
        unitPrice: 100.50,
        totalPrice: 1005.00,
        deliveryTime: 30,
        remarks: null,
        status: 'active',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      });
    });
  });

  describe('update', () => {
    const mockExistingQuotation = {
      id: 'quotation-123',
      inquiryId: 'inquiry-123',
      unitPrice: 100.50,
      totalPrice: 1005.00,
      deliveryTime: 30,
      remarks: '原始备注',
      status: 'active' as const,
      createdBy: 'user-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    };

    const updateData: UpdateQuotationRequest = {
      unitPrice: 120.00,
      totalPrice: 1200.00,
      deliveryTime: 25,
      remarks: '更新的备注'
    };

    it('应该成功更新报价', async () => {
      const updatedRow = {
        id: 'quotation-123',
        inquiry_id: 'inquiry-123',
        unit_price: '120.00',
        total_price: '1200.00',
        delivery_time: 25,
        remarks: '更新的备注',
        status: 'active',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z'
      };

      // Mock findById
      jest.spyOn(quotationModel, 'findById').mockResolvedValue(mockExistingQuotation);
      
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [updatedRow] });

      const result = await quotationModel.update('quotation-123', updateData, 'user-123');

      expect(result.unitPrice).toBe(120.00);
      expect(result.totalPrice).toBe(1200.00);
      expect(result.deliveryTime).toBe(25);
      expect(result.remarks).toBe('更新的备注');
    });

    it('应该验证报价是否存在', async () => {
      jest.spyOn(quotationModel, 'findById').mockResolvedValue(null);

      await expect(quotationModel.update('non-existent', updateData, 'user-123'))
        .rejects.toThrow('报价不存在');
    });

    it('应该验证用户权限', async () => {
      jest.spyOn(quotationModel, 'findById').mockResolvedValue(mockExistingQuotation);

      await expect(quotationModel.update('quotation-123', updateData, 'other-user'))
        .rejects.toThrow('只能修改自己创建的报价');
    });

    it('应该验证报价状态', async () => {
      const cancelledQuotation = { ...mockExistingQuotation, status: 'cancelled' as const };
      jest.spyOn(quotationModel, 'findById').mockResolvedValue(cancelledQuotation);

      await expect(quotationModel.update('quotation-123', updateData, 'user-123'))
        .rejects.toThrow('只能修改活跃状态的报价');
    });
  });

  describe('cancel', () => {
    const mockActiveQuotation = {
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

    it('应该成功作废报价', async () => {
      const cancelledRow = {
        id: 'quotation-123',
        inquiry_id: 'inquiry-123',
        unit_price: '100.50',
        total_price: '1005.00',
        delivery_time: 30,
        remarks: '测试备注',
        status: 'cancelled',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z'
      };

      jest.spyOn(quotationModel, 'findById').mockResolvedValue(mockActiveQuotation);
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [cancelledRow] });

      const result = await quotationModel.cancel('quotation-123', 'user-123');

      expect(result.status).toBe('cancelled');
    });

    it('应该验证报价是否存在', async () => {
      jest.spyOn(quotationModel, 'findById').mockResolvedValue(null);

      await expect(quotationModel.cancel('non-existent', 'user-123'))
        .rejects.toThrow('报价不存在');
    });

    it('应该验证用户权限', async () => {
      jest.spyOn(quotationModel, 'findById').mockResolvedValue(mockActiveQuotation);

      await expect(quotationModel.cancel('quotation-123', 'other-user'))
        .rejects.toThrow('只能作废自己创建的报价');
    });

    it('应该验证报价状态', async () => {
      const cancelledQuotation = { ...mockActiveQuotation, status: 'cancelled' as const };
      jest.spyOn(quotationModel, 'findById').mockResolvedValue(cancelledQuotation);

      await expect(quotationModel.cancel('quotation-123', 'user-123'))
        .rejects.toThrow('只能作废活跃状态的报价');
    });
  });

  describe('delete', () => {
    it('应该成功删除报价', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await quotationModel.delete('quotation-123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM quotations WHERE id = $1',
        ['quotation-123']
      );
    });

    it('应该在报价不存在时返回false', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await quotationModel.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('findByCreatedBy', () => {
    it('应该返回用户创建的所有报价', async () => {
      const mockRows = [
        {
          id: 'quotation-1',
          inquiry_id: 'inquiry-1',
          unit_price: '100.00',
          total_price: '1000.00',
          delivery_time: 30,
          remarks: null,
          status: 'active',
          created_by: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'quotation-2',
          inquiry_id: 'inquiry-2',
          unit_price: '200.00',
          total_price: '2000.00',
          delivery_time: 45,
          remarks: '备注',
          status: 'cancelled',
          created_by: 'user-123',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await quotationModel.findByCreatedBy('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('quotation-1');
      expect(result[1].id).toBe('quotation-2');
    });
  });
});