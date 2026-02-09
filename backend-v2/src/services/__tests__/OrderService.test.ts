import { jest } from '@jest/globals';
import { OrderService } from '../OrderService.js';
import { AppError } from '../../shared/errors.js';

function createMockOrderRepo() {
  return {
    generateOrderNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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

const buyerUser = {
  userId: 'buyer-1',
  username: 'tanaka',
  role: 'buyer' as const,
  company: 'arroz' as const,
};

const supplierUser = {
  userId: 'supplier-1',
  username: 'zhangsan',
  role: 'supplier' as const,
  company: 'yunjie' as const,
};

const quotedInquiry = {
  id: 'inq-1',
  inquiry_number: 'INQ-20260209-0001',
  product_name: '铝合金外壳',
  material_type: '铝合金6061',
  specifications: '100x50x25mm',
  special_requirements: null,
  quantity: 1000,
  status: 'quoted',
  created_by: 'buyer-1',
  deleted_at: null,
  created_at: '2026-02-09T00:00:00.000Z',
  updated_at: '2026-02-09T00:00:00.000Z',
};

const activeQuotation = {
  id: 'q-1',
  inquiry_id: 'inq-1',
  version: 1,
  unit_price: '15.50',
  total_price: '15500.00',
  delivery_days: 30,
  remarks: null,
  is_withdrawn: false,
  created_by: 'supplier-1',
  created_at: '2026-02-09T01:00:00.000Z',
};

const pendingOrder = {
  id: 'ord-1',
  order_number: 'ORD-20260209-0001',
  inquiry_id: 'inq-1',
  product_name: '铝合金外壳',
  material_type: '铝合金6061',
  specifications: '100x50x25mm',
  special_requirements: null,
  unit_price: '15.50',
  quantity: 1000,
  total_price: '15500.00',
  status: 'pending',
  created_by: 'buyer-1',
  confirmed_by: null,
  reject_reason: null,
  deleted_at: null,
  created_at: '2026-02-09T02:00:00.000Z',
  updated_at: '2026-02-09T02:00:00.000Z',
};

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepo: ReturnType<typeof createMockOrderRepo>;
  let mockInquiryRepo: ReturnType<typeof createMockInquiryRepo>;
  let mockQuotationRepo: ReturnType<typeof createMockQuotationRepo>;

  beforeEach(() => {
    mockOrderRepo = createMockOrderRepo();
    mockInquiryRepo = createMockInquiryRepo();
    mockQuotationRepo = createMockQuotationRepo();
    service = new OrderService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockOrderRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockInquiryRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockQuotationRepo as any
    );
  });

  describe('createFromInquiry', () => {
    it('creates an order from a quoted inquiry', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(
        quotedInquiry
      );
      (
        mockQuotationRepo.findActiveByInquiryId as jest.Mock
      ).mockResolvedValue(activeQuotation);
      (mockOrderRepo.generateOrderNumber as jest.Mock).mockResolvedValue(
        'ORD-20260209-0001'
      );
      (mockOrderRepo.create as jest.Mock).mockResolvedValue(pendingOrder);
      (mockInquiryRepo.update as jest.Mock).mockResolvedValue({});

      const result = await service.createFromInquiry('inq-1', buyerUser);

      expect(result.orderNumber).toBe('ORD-20260209-0001');
      expect(result.status).toBe('pending');
      expect(mockInquiryRepo.update).toHaveBeenCalledWith('inq-1', {
        status: 'converted',
      });
    });

    it('throws when inquiry is not quoted', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue({
        ...quotedInquiry,
        status: 'published',
      });

      await expect(
        service.createFromInquiry('inq-1', buyerUser)
      ).rejects.toThrow(AppError);
    });

    it('throws when no active quotation exists', async () => {
      (mockInquiryRepo.findById as jest.Mock).mockResolvedValue(
        quotedInquiry
      );
      (
        mockQuotationRepo.findActiveByInquiryId as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.createFromInquiry('inq-1', buyerUser)
      ).rejects.toThrow(AppError);
    });
  });

  describe('createStandalone', () => {
    it('creates a standalone order', async () => {
      (mockOrderRepo.generateOrderNumber as jest.Mock).mockResolvedValue(
        'ORD-20260209-0002'
      );
      (mockOrderRepo.create as jest.Mock).mockResolvedValue({
        ...pendingOrder,
        inquiry_id: null,
        order_number: 'ORD-20260209-0002',
      });

      const result = await service.createStandalone(
        {
          productName: '铝合金外壳',
          materialType: '铝合金6061',
          specifications: '100x50x25mm',
          unitPrice: 15.5,
          quantity: 1000,
          totalPrice: 15500,
        },
        buyerUser
      );

      expect(result.orderNumber).toBe('ORD-20260209-0002');
    });
  });

  describe('performAction', () => {
    it('cancels a pending order by creator', async () => {
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(pendingOrder);
      (mockOrderRepo.update as jest.Mock).mockResolvedValue({
        ...pendingOrder,
        status: 'cancelled',
      });

      const result = await service.performAction(
        'ord-1',
        'cancel',
        buyerUser
      );

      expect(result.status).toBe('cancelled');
    });

    it('supplier confirms a pending order', async () => {
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(pendingOrder);
      (mockOrderRepo.update as jest.Mock).mockResolvedValue({
        ...pendingOrder,
        status: 'confirmed',
        confirmed_by: 'supplier-1',
      });

      const result = await service.performAction(
        'ord-1',
        'confirm',
        supplierUser
      );

      expect(result.status).toBe('confirmed');
    });

    it('supplier rejects a pending order with reason', async () => {
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(pendingOrder);
      (mockOrderRepo.update as jest.Mock).mockResolvedValue({
        ...pendingOrder,
        status: 'rejected',
        reject_reason: '交期无法满足',
      });

      const result = await service.performAction(
        'ord-1',
        'reject',
        supplierUser,
        '交期无法满足'
      );

      expect(result.status).toBe('rejected');
    });

    it('supplier starts production on confirmed order', async () => {
      const confirmed = { ...pendingOrder, status: 'confirmed' };
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(confirmed);
      (mockOrderRepo.update as jest.Mock).mockResolvedValue({
        ...confirmed,
        status: 'production',
      });

      const result = await service.performAction(
        'ord-1',
        'start_production',
        supplierUser
      );

      expect(result.status).toBe('production');
    });

    it('supplier ships a production order', async () => {
      const production = { ...pendingOrder, status: 'production' };
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(production);
      (mockOrderRepo.update as jest.Mock).mockResolvedValue({
        ...production,
        status: 'shipped',
      });

      const result = await service.performAction(
        'ord-1',
        'ship',
        supplierUser
      );

      expect(result.status).toBe('shipped');
    });

    it('buyer completes a shipped order', async () => {
      const shipped = { ...pendingOrder, status: 'shipped' };
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(shipped);
      (mockOrderRepo.update as jest.Mock).mockResolvedValue({
        ...shipped,
        status: 'completed',
      });

      const result = await service.performAction(
        'ord-1',
        'complete',
        buyerUser
      );

      expect(result.status).toBe('completed');
    });

    it('throws when non-creator tries to cancel', async () => {
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(pendingOrder);

      await expect(
        service.performAction('ord-1', 'cancel', supplierUser)
      ).rejects.toThrow(AppError);
    });

    it('throws when non-supplier tries to confirm', async () => {
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(pendingOrder);

      await expect(
        service.performAction('ord-1', 'confirm', buyerUser)
      ).rejects.toThrow(AppError);
    });

    it('throws on invalid status transition', async () => {
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(pendingOrder);

      await expect(
        service.performAction('ord-1', 'ship', supplierUser)
      ).rejects.toThrow(AppError);
    });

    it('throws on unsupported action', async () => {
      (mockOrderRepo.findById as jest.Mock).mockResolvedValue(pendingOrder);

      await expect(
        service.performAction('ord-1', 'unknown', buyerUser)
      ).rejects.toThrow(AppError);
    });
  });
});
