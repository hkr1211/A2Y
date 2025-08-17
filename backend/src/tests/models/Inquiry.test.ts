import { Pool } from 'pg';
import { Inquiry, InquiryData, InquiryStatus } from '../../models/Inquiry';

// Mock the database pool
const mockDb = {
  query: jest.fn()
} as unknown as Pool;

describe('Inquiry Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Basic Properties', () => {
    it('should create an inquiry with required fields', () => {
      const inquiryData: InquiryData = {
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        createdBy: 'user-123'
      };

      const inquiry = new Inquiry(inquiryData);

      expect(inquiry.productName).toBe('Test Product');
      expect(inquiry.materialType).toBe('Steel');
      expect(inquiry.specifications).toBe('High quality steel');
      expect(inquiry.quantity).toBe(100);
      expect(inquiry.createdBy).toBe('user-123');
      expect(inquiry.status).toBe('draft'); // Default status
      expect(inquiry.id).toBeDefined();
      expect(inquiry.createdAt).toBeInstanceOf(Date);
      expect(inquiry.updatedAt).toBeInstanceOf(Date);
    });

    it('should create an inquiry with optional fields', () => {
      const inquiryData: InquiryData = {
        id: 'custom-id',
        inquiryNumber: 'INQ202401001',
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        specialRequirements: 'Special coating required',
        quantity: 100,
        status: 'published',
        createdBy: 'user-123'
      };

      const inquiry = new Inquiry(inquiryData);

      expect(inquiry.id).toBe('custom-id');
      expect(inquiry.inquiryNumber).toBe('INQ202401001');
      expect(inquiry.specialRequirements).toBe('Special coating required');
      expect(inquiry.status).toBe('published');
    });
  });

  describe('Validation', () => {
    it('should validate a valid inquiry', () => {
      const inquiry = new Inquiry({
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        createdBy: 'user-123'
      });

      const validation = inquiry.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const inquiry = new Inquiry({
        productName: '',
        materialType: '',
        specifications: '',
        quantity: 0,
        createdBy: ''
      });

      const validation = inquiry.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Product name is required');
      expect(validation.errors).toContain('Material type is required');
      expect(validation.errors).toContain('Specifications are required');
      expect(validation.errors).toContain('Quantity must be greater than 0');
      expect(validation.errors).toContain('Created by user ID is required');
    });

    it('should fail validation for invalid status', () => {
      const inquiry = new Inquiry({
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        createdBy: 'user-123',
        status: 'invalid-status' as InquiryStatus
      });

      const validation = inquiry.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid inquiry status');
    });
  });

  describe('Status Management', () => {
    it('should allow modification for draft and published status', () => {
      const draftInquiry = new Inquiry({
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        createdBy: 'user-123',
        status: 'draft'
      });

      const publishedInquiry = new Inquiry({
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        createdBy: 'user-123',
        status: 'published'
      });

      expect(draftInquiry.canBeModified()).toBe(true);
      expect(publishedInquiry.canBeModified()).toBe(true);
    });

    it('should not allow modification for replied, converted, or cancelled status', () => {
      const statuses: InquiryStatus[] = ['replied', 'converted', 'cancelled'];

      statuses.forEach(status => {
        const inquiry = new Inquiry({
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100,
          createdBy: 'user-123',
          status
        });

        expect(inquiry.canBeModified()).toBe(false);
      });
    });

    it('should allow cancellation for non-final states', () => {
      const statuses: InquiryStatus[] = ['draft', 'published', 'replied'];

      statuses.forEach(status => {
        const inquiry = new Inquiry({
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100,
          createdBy: 'user-123',
          status
        });

        expect(inquiry.canBeCancelled()).toBe(true);
      });
    });

    it('should not allow cancellation for final states', () => {
      const statuses: InquiryStatus[] = ['converted', 'cancelled'];

      statuses.forEach(status => {
        const inquiry = new Inquiry({
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100,
          createdBy: 'user-123',
          status
        });

        expect(inquiry.canBeCancelled()).toBe(false);
      });
    });

    it('should update status with valid transitions', () => {
      const inquiry = new Inquiry({
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        createdBy: 'user-123',
        status: 'draft'
      });

      const result = inquiry.updateStatus('published');

      expect(result.success).toBe(true);
      expect(inquiry.status).toBe('published');
    });

    it('should reject invalid status transitions', () => {
      const inquiry = new Inquiry({
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        createdBy: 'user-123',
        status: 'draft'
      });

      const result = inquiry.updateStatus('replied');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot transition from draft to replied');
      expect(inquiry.status).toBe('draft'); // Status should remain unchanged
    });
  });

  describe('Inquiry Number Generation', () => {
    it('should generate inquiry number with correct format', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{ next_number: 1 }]
      });
      (mockDb.query as jest.Mock) = mockQuery;

      const inquiryNumber = await Inquiry.generateInquiryNumber(mockDb);

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const expectedPrefix = `INQ${year}${month}`;

      expect(inquiryNumber).toBe(`${expectedPrefix}0001`);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) + 1 as next_number'),
        [`${expectedPrefix}%`]
      );
    });

    it('should generate sequential inquiry numbers', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{ next_number: 5 }]
      });
      (mockDb.query as jest.Mock) = mockQuery;

      const inquiryNumber = await Inquiry.generateInquiryNumber(mockDb);

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const expectedPrefix = `INQ${year}${month}`;

      expect(inquiryNumber).toBe(`${expectedPrefix}0005`);
    });
  });

  describe('Database Operations', () => {
    describe('save', () => {
      it('should save a valid inquiry to database', async () => {
        const mockQuery = jest.fn()
          .mockResolvedValueOnce({ rows: [{ next_number: 1 }] }) // For inquiry number generation
          .mockResolvedValueOnce({ rows: [{}] }); // For insert
        (mockDb.query as jest.Mock) = mockQuery;

        const inquiry = new Inquiry({
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100,
          createdBy: 'user-123'
        });

        const result = await inquiry.save(mockDb);

        expect(result.success).toBe(true);
        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(inquiry.inquiryNumber).toBeDefined();
      });

      it('should not save invalid inquiry', async () => {
        const inquiry = new Inquiry({
          productName: '',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100,
          createdBy: 'user-123'
        });

        const result = await inquiry.save(mockDb);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Product name is required');
      });

      it('should handle database errors', async () => {
        const mockQuery = jest.fn()
          .mockResolvedValueOnce({ rows: [{ next_number: 1 }] })
          .mockRejectedValueOnce(new Error('Database error'));
        (mockDb.query as jest.Mock) = mockQuery;

        const inquiry = new Inquiry({
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100,
          createdBy: 'user-123'
        });

        const result = await inquiry.save(mockDb);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database error');
      });
    });

    describe('findById', () => {
      it('should find inquiry by ID', async () => {
        const mockRow = {
          id: 'inquiry-123',
          inquiry_number: 'INQ202401001',
          product_name: 'Test Product',
          material_type: 'Steel',
          specifications: 'High quality steel',
          special_requirements: null,
          quantity: 100,
          status: 'draft',
          created_by: 'user-123',
          created_at: new Date(),
          updated_at: new Date()
        };

        const mockQuery = jest.fn().mockResolvedValue({
          rows: [mockRow]
        });
        (mockDb.query as jest.Mock) = mockQuery;

        const inquiry = await Inquiry.findById(mockDb, 'inquiry-123');

        expect(inquiry).toBeInstanceOf(Inquiry);
        expect(inquiry?.id).toBe('inquiry-123');
        expect(inquiry?.productName).toBe('Test Product');
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM inquiries WHERE id = $1',
          ['inquiry-123']
        );
      });

      it('should return null if inquiry not found', async () => {
        const mockQuery = jest.fn().mockResolvedValue({
          rows: []
        });
        (mockDb.query as jest.Mock) = mockQuery;

        const inquiry = await Inquiry.findById(mockDb, 'non-existent');

        expect(inquiry).toBeNull();
      });

      it('should handle database errors', async () => {
        const mockQuery = jest.fn().mockRejectedValue(new Error('Database error'));
        (mockDb.query as jest.Mock) = mockQuery;

        await expect(Inquiry.findById(mockDb, 'inquiry-123'))
          .rejects.toThrow('Failed to find inquiry: Database error');
      });
    });

    describe('findByCreator', () => {
      it('should find inquiries by creator', async () => {
        const mockRows = [
          {
            id: 'inquiry-1',
            inquiry_number: 'INQ202401001',
            product_name: 'Product 1',
            material_type: 'Steel',
            specifications: 'Spec 1',
            special_requirements: null,
            quantity: 100,
            status: 'draft',
            created_by: 'user-123',
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'inquiry-2',
            inquiry_number: 'INQ202401002',
            product_name: 'Product 2',
            material_type: 'Aluminum',
            specifications: 'Spec 2',
            special_requirements: null,
            quantity: 200,
            status: 'published',
            created_by: 'user-123',
            created_at: new Date(),
            updated_at: new Date()
          }
        ];

        const mockQuery = jest.fn().mockResolvedValue({
          rows: mockRows
        });
        (mockDb.query as jest.Mock) = mockQuery;

        const inquiries = await Inquiry.findByCreator(mockDb, 'user-123');

        expect(inquiries).toHaveLength(2);
        expect(inquiries[0]).toBeInstanceOf(Inquiry);
        expect(inquiries[1]).toBeInstanceOf(Inquiry);
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM inquiries WHERE created_by = $1 ORDER BY created_at DESC',
          ['user-123']
        );
      });
    });

    describe('deleteById', () => {
      it('should delete inquiry successfully', async () => {
        const mockQuery = jest.fn().mockResolvedValue({
          rowCount: 1
        });
        (mockDb.query as jest.Mock) = mockQuery;

        const result = await Inquiry.deleteById(mockDb, 'inquiry-123');

        expect(result.success).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
          'DELETE FROM inquiries WHERE id = $1',
          ['inquiry-123']
        );
      });

      it('should handle inquiry not found', async () => {
        const mockQuery = jest.fn().mockResolvedValue({
          rowCount: 0
        });
        (mockDb.query as jest.Mock) = mockQuery;

        const result = await Inquiry.deleteById(mockDb, 'non-existent');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Inquiry not found');
      });
    });
  });
});