import { jest } from '@jest/globals';
import { QuotationService } from '../QuotationService.js';
import { AppError } from '../../shared/errors.js';

function createMockQuotationRepo() {
  return {
    getNextVersion: jest.fn(),
    findByInquiryId: jest.fn(),
    findActiveByInquiryId: jest.fn(),
    hasActiveQuotations: jest.fn(),
    create: jest.fn(),
    withdrawByInquiryId: jest.fn(),
  };
}

function createMockInquiryRepo() {
  return {
    generateInquiryNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

const supplierUser = {
  userId: 'supplier-1',
  username: 'zhangsan',
  role: 'supplier' as const,
  company: 'yunjie' as const,
};

const publishedInquiry = {
  id: 'inq-1',
  inquiry_number: 'INQ-20260209-0001',
  product_name: '铝合金外壳',
  material_type: '铝合金6061',
  specifications: '100x50x25mm',
  special_requirements: null,
  quantity: 1000,
  status: 'published',
  created_by: 'buyer-1',
  deleted_at: null,
  created_at: '2026-02-09T00:00:00.000Z',
  updated_at: '2026-02-09T00:00:00.000Z',
};

const quotedInquiry = { ...publishedInquiry, status: 'quoted' };

const quotationRow = {
  id: 'q-1',
  inquiry_id: 'inq-1',
  version: 1,
  unit_price: '15.50',
  total_price: '15500.00',
  delivery_days: 30,
  remarks: '含运费',
  is_withdrawn: false,
  created_by: 'supplier-1',
  created_at: '2026-02-09T01:00:00.000Z',
};

describe('QuotationService', () => {
  let service: QuotationService;
  let mockQuotationRepo: ReturnType<typeof createMockQuotationRepo>;
  let mockInquiryRepo: ReturnType<typeof createMockInquiryRepo>;

  beforeEach(() => {
    mockQuotationRepo = createMockQuotationRepo();
    mockInquiryRepo = createMockInquiryRepo();
    service = new QuotationService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockQuotationRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockInquiryRepo as any
    );
  });

  describe('create', () => {
    it('creates a quotation and updates inquiry to quoted', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(
        publishedInquiry
      );
      (mockQuotationRepo.getNextVersion as jest.Mock).mockResolvedValue(1);
      (mockQuotationRepo.create as jest.Mock).mockResolvedValue(
        quotationRow
      );
      (mockInquiryRepo.update as jest.Mock).mockResolvedValue({
        ...publishedInquiry,
        status: 'quoted',
      });

      const result = await service.create(
        {
          inquiryId: 'inq-1',
          unitPrice: 15.5,
          totalPrice: 15500,
          deliveryDays: 30,
          remarks: '含运费',
        },
        supplierUser
      );

      expect(result.version).toBe(1);
      expect(result.unitPrice).toBe(15.5);
      expect(mockInquiryRepo.update).toHaveBeenCalledWith('inq-1', {
        status: 'quoted',
      });
    });

    it('creates a v2 quotation without changing already-quoted status', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(
        quotedInquiry
      );
      (mockQuotationRepo.getNextVersion as jest.Mock).mockResolvedValue(2);
      (mockQuotationRepo.create as jest.Mock).mockResolvedValue({
        ...quotationRow,
        version: 2,
      });

      await service.create(
        {
          inquiryId: 'inq-1',
          unitPrice: 14.0,
          totalPrice: 14000,
          deliveryDays: 25,
        },
        supplierUser
      );

      // Should NOT update inquiry status since it's already quoted
      expect(mockInquiryRepo.update).not.toHaveBeenCalled();
    });

    it('throws when inquiry does not exist', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          {
            inquiryId: 'nonexistent',
            unitPrice: 15.5,
            totalPrice: 15500,
            deliveryDays: 30,
          },
          supplierUser
        )
      ).rejects.toThrow(AppError);
    });

    it('throws when inquiry status does not allow quoting', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue({
        ...publishedInquiry,
        status: 'draft',
      });

      await expect(
        service.create(
          {
            inquiryId: 'inq-1',
            unitPrice: 15.5,
            totalPrice: 15500,
            deliveryDays: 30,
          },
          supplierUser
        )
      ).rejects.toThrow(AppError);
    });

    it('throws when inquiry is cancelled', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue({
        ...publishedInquiry,
        status: 'cancelled',
      });

      await expect(
        service.create(
          {
            inquiryId: 'inq-1',
            unitPrice: 15.5,
            totalPrice: 15500,
            deliveryDays: 30,
          },
          supplierUser
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('withdraw', () => {
    it('withdraws quotations and reverts inquiry to published', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(
        quotedInquiry
      );
      (
        mockQuotationRepo.withdrawByInquiryId as jest.Mock
      ).mockResolvedValue(2);
      (
        mockQuotationRepo.hasActiveQuotations as jest.Mock
      ).mockResolvedValue(false);
      (mockInquiryRepo.update as jest.Mock).mockResolvedValue({
        ...publishedInquiry,
        status: 'published',
      });

      const result = await service.withdraw('inq-1', supplierUser);

      expect(result.message).toBe('报价已撤回');
      expect(mockInquiryRepo.update).toHaveBeenCalledWith('inq-1', {
        status: 'published',
      });
    });

    it('does not revert status if other active quotations remain', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(
        quotedInquiry
      );
      (
        mockQuotationRepo.withdrawByInquiryId as jest.Mock
      ).mockResolvedValue(1);
      (
        mockQuotationRepo.hasActiveQuotations as jest.Mock
      ).mockResolvedValue(true);

      await service.withdraw('inq-1', supplierUser);

      expect(mockInquiryRepo.update).not.toHaveBeenCalled();
    });

    it('throws when inquiry does not exist', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.withdraw('nonexistent', supplierUser)
      ).rejects.toThrow(AppError);
    });

    it('throws when inquiry is converted to order', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue({
        ...publishedInquiry,
        status: 'converted',
      });

      await expect(
        service.withdraw('inq-1', supplierUser)
      ).rejects.toThrow(AppError);
    });

    it('throws when no quotations to withdraw', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(
        quotedInquiry
      );
      (
        mockQuotationRepo.withdrawByInquiryId as jest.Mock
      ).mockResolvedValue(0);

      await expect(
        service.withdraw('inq-1', supplierUser)
      ).rejects.toThrow(AppError);
    });
  });
});
