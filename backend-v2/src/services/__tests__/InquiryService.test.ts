import { jest } from '@jest/globals';
import { InquiryService } from '../InquiryService.js';
import { AppError } from '../../shared/errors.js';

function createMockRepo() {
  return {
    generateInquiryNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

const mockUser = {
  userId: 'user-1',
  username: 'buyer1',
  role: 'buyer' as const,
  company: 'arroz' as const,
};

const sampleRow = {
  id: 'inq-1',
  inquiry_number: 'INQ-20260208-0001',
  product_name: '铝合金外壳',
  material_type: '铝合金6061',
  specifications: '100x50x25mm',
  special_requirements: null,
  quantity: 1000,
  status: 'draft',
  created_by: 'user-1',
  deleted_at: null,
  created_at: '2026-02-08T00:00:00.000Z',
  updated_at: '2026-02-08T00:00:00.000Z',
};

describe('InquiryService', () => {
  let service: InquiryService;
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new InquiryService(mockRepo as any);
  });

  describe('list', () => {
    it('returns paginated list with creator info', async () => {
      (mockRepo.findAll as jest.Mock).mockResolvedValue({
        items: [
          { ...sampleRow, creator_username: 'buyer1' },
        ],
        total: 1,
      });

      const result = await service.list({
        page: 1,
        pageSize: 20,
        search: '',
        sort: 'created_at',
        order: 'desc',
      });

      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual({
        id: 'inq-1',
        inquiryNumber: 'INQ-20260208-0001',
        productName: '铝合金外壳',
        materialType: '铝合金6061',
        specifications: '100x50x25mm',
        specialRequirements: null,
        quantity: 1000,
        status: 'draft',
        createdAt: '2026-02-08T00:00:00.000Z',
        updatedAt: '2026-02-08T00:00:00.000Z',
        createdBy: {
          id: 'user-1',
          username: 'buyer1',
        },
      });
    });
  });

  describe('getById', () => {
    it('returns inquiry detail', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(sampleRow);

      const result = await service.getById('inq-1');

      expect(result.id).toBe('inq-1');
      expect(result.inquiryNumber).toBe('INQ-20260208-0001');
      expect(result.attachments).toEqual([]);
      expect(result.quotations).toEqual([]);
    });

    it('throws not found when inquiry does not exist', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(AppError);
    });
  });

  describe('create', () => {
    it('creates inquiry with generated number', async () => {
      (mockRepo.generateInquiryNumber as jest.Mock).mockResolvedValue(
        'INQ-20260208-0001'
      );
      (mockRepo.create as jest.Mock).mockResolvedValue(sampleRow);

      const result = await service.create(
        {
          productName: '铝合金外壳',
          materialType: '铝合金6061',
          specifications: '100x50x25mm',
          quantity: 1000,
        },
        mockUser
      );

      expect(result.inquiryNumber).toBe('INQ-20260208-0001');
      expect(mockRepo.create).toHaveBeenCalledWith({
        inquiry_number: 'INQ-20260208-0001',
        product_name: '铝合金外壳',
        material_type: '铝合金6061',
        specifications: '100x50x25mm',
        special_requirements: null,
        quantity: 1000,
        created_by: 'user-1',
      });
    });
  });

  describe('update', () => {
    it('updates draft inquiry by creator', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(sampleRow);
      const updatedRow = { ...sampleRow, product_name: '新产品' };
      (mockRepo.update as jest.Mock).mockResolvedValue(updatedRow);

      const result = await service.update(
        'inq-1',
        { productName: '新产品' },
        mockUser
      );

      expect(result.productName).toBe('新产品');
      expect(mockRepo.update).toHaveBeenCalledWith('inq-1', {
        product_name: '新产品',
      });
    });

    it('throws not found when inquiry does not exist', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { productName: 'x' }, mockUser)
      ).rejects.toThrow(AppError);
    });

    it('throws forbidden when not creator', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(sampleRow);

      await expect(
        service.update(
          'inq-1',
          { productName: 'x' },
          { ...mockUser, userId: 'other-user' }
        )
      ).rejects.toThrow(AppError);
    });

    it('throws business error when status is not editable', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue({
        ...sampleRow,
        status: 'quoted',
      });

      await expect(
        service.update('inq-1', { productName: 'x' }, mockUser)
      ).rejects.toThrow(AppError);
    });
  });

  describe('performAction', () => {
    it('publishes a draft inquiry', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(sampleRow);
      (mockRepo.update as jest.Mock).mockResolvedValue({
        ...sampleRow,
        status: 'published',
      });

      const result = await service.performAction('inq-1', 'publish', mockUser);

      expect(result.status).toBe('published');
      expect(mockRepo.update).toHaveBeenCalledWith('inq-1', {
        status: 'published',
      });
    });

    it('cancels a published inquiry', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue({
        ...sampleRow,
        status: 'published',
      });
      (mockRepo.update as jest.Mock).mockResolvedValue({
        ...sampleRow,
        status: 'cancelled',
      });

      const result = await service.performAction('inq-1', 'cancel', mockUser);

      expect(result.status).toBe('cancelled');
    });

    it('throws when publishing a non-draft inquiry', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue({
        ...sampleRow,
        status: 'published',
      });

      await expect(
        service.performAction('inq-1', 'publish', mockUser)
      ).rejects.toThrow(AppError);
    });

    it('throws when cancelling a draft inquiry', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(sampleRow);

      await expect(
        service.performAction('inq-1', 'cancel', mockUser)
      ).rejects.toThrow(AppError);
    });

    it('throws when not creator', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(sampleRow);

      await expect(
        service.performAction('inq-1', 'publish', {
          ...mockUser,
          userId: 'other',
        })
      ).rejects.toThrow(AppError);
    });

    it('throws on unsupported action', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(sampleRow);

      await expect(
        service.performAction('inq-1', 'unknown', mockUser)
      ).rejects.toThrow(AppError);
    });
  });
});
