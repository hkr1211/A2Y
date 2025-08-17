import { Request, Response } from 'express';
import { InquiryController } from '../../controllers/InquiryController';
import { Inquiry } from '../../models/Inquiry';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// Mock the Inquiry model
jest.mock('../../models/Inquiry');

describe('InquiryController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      user: {
        id: 'user-123',
        username: 'testuser',
        role: 'buyer',
        company: 'arroz',
        language: 'zh'
      },
      params: {},
      body: {}
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('getAllInquiries', () => {
    it('should return all inquiries for admin user', async () => {
      mockRequest.user!.role = 'admin';
      
      const mockInquiries = [
        {
          id: 'inquiry-1',
          inquiryNumber: 'INQ202401001',
          productName: 'Product 1',
          materialType: 'Steel',
          specifications: 'Spec 1',
          quantity: 100,
          status: 'draft',
          createdBy: 'user-123',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      (Inquiry.findAll as jest.Mock).mockResolvedValue(mockInquiries);

      await InquiryController.getAllInquiries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Inquiry.findAll).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'inquiry-1',
            inquiryNumber: 'INQ202401001',
            productName: 'Product 1'
          })
        ])
      });
    });

    it('should return user own inquiries for non-admin user', async () => {
      const mockInquiries = [
        {
          id: 'inquiry-1',
          inquiryNumber: 'INQ202401001',
          productName: 'Product 1',
          materialType: 'Steel',
          specifications: 'Spec 1',
          quantity: 100,
          status: 'draft',
          createdBy: 'user-123',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      (Inquiry.findByCreator as jest.Mock).mockResolvedValue(mockInquiries);

      await InquiryController.getAllInquiries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Inquiry.findByCreator).toHaveBeenCalledWith(expect.anything(), 'user-123');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle database errors', async () => {
      (Inquiry.findByCreator as jest.Mock).mockRejectedValue(new Error('Database error'));

      await InquiryController.getAllInquiries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve inquiries'
        }
      });
    });
  });

  describe('getInquiryById', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'inquiry-123' };
    });

    it('should return inquiry for owner', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.getInquiryById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Inquiry.findById).toHaveBeenCalledWith(expect.anything(), 'inquiry-123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'inquiry-123',
          productName: 'Product 1'
        })
      });
    });

    it('should return inquiry for admin', async () => {
      mockRequest.user!.role = 'admin';
      
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'other-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.getInquiryById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should return 404 if inquiry not found', async () => {
      (Inquiry.findById as jest.Mock).mockResolvedValue(null);

      await InquiryController.getInquiryById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found'
        }
      });
    });

    it('should return 403 if user tries to access other user inquiry', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'other-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.getInquiryById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only view your own inquiries'
        }
      });
    });
  });

  describe('createInquiry', () => {
    beforeEach(() => {
      mockRequest.body = {
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100
      };
    });

    it('should create inquiry for buyer', async () => {
      const mockInquiry = {
        id: 'new-inquiry',
        inquiryNumber: 'INQ202401001',
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      // Mock the constructor to return our mock inquiry
      (Inquiry as jest.MockedClass<typeof Inquiry>).mockImplementation(() => mockInquiry as any);

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          productName: 'Test Product',
          status: 'draft'
        })
      });
    });

    it('should create inquiry for admin', async () => {
      mockRequest.user!.role = 'admin';
      
      const mockInquiry = {
        id: 'new-inquiry',
        inquiryNumber: 'INQ202401001',
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry as jest.MockedClass<typeof Inquiry>).mockImplementation(() => mockInquiry as any);

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should reject creation for supplier', async () => {
      mockRequest.user!.role = 'supplier';

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only buyers can create inquiries'
        }
      });
    });

    it('should validate required fields', async () => {
      mockRequest.body = {
        productName: '',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100
      };

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: productName, materialType, specifications, quantity'
        }
      });
    });

    it('should validate quantity is positive', async () => {
      mockRequest.body = {
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 0
      };

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity must be greater than 0'
        }
      });
    });

    it('should handle save errors', async () => {
      const mockInquiry = {
        id: 'new-inquiry',
        inquiryNumber: 'INQ202401001',
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        save: jest.fn().mockResolvedValue({ 
          success: false, 
          error: 'Validation failed' 
        })
      };

      (Inquiry as jest.MockedClass<typeof Inquiry>).mockImplementation(() => mockInquiry as any);

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      });
    });
  });

  describe('updateInquiry', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'inquiry-123' };
      mockRequest.body = {
        productName: 'Updated Product',
        quantity: 200
      };
    });

    it('should update inquiry for owner', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Original Product',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeModified: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.updateInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockInquiry.productName).toBe('Updated Product');
      expect(mockInquiry.quantity).toBe(200);
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should reject update if inquiry cannot be modified', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'replied',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeModified: jest.fn().mockReturnValue(false)
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.updateInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Cannot modify inquiry with status: replied'
        }
      });
    });

    it('should validate quantity is positive', async () => {
      mockRequest.body.quantity = -5;

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeModified: jest.fn().mockReturnValue(true)
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.updateInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity must be greater than 0'
        }
      });
    });
  });

  describe('cancelInquiry', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'inquiry-123' };
    });

    it('should cancel inquiry for owner', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeCancelled: jest.fn().mockReturnValue(true),
        updateStatus: jest.fn().mockReturnValue({ success: true }),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.cancelInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockInquiry.updateStatus).toHaveBeenCalledWith('cancelled');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should reject cancel if inquiry cannot be cancelled', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'converted',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeCancelled: jest.fn().mockReturnValue(false)
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.cancelInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Cannot cancel inquiry with status: converted'
        }
      });
    });
  });

  describe('publishInquiry', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'inquiry-123' };
    });

    it('should publish inquiry for owner', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        updateStatus: jest.fn().mockReturnValue({ success: true }),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.publishInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockInquiry.updateStatus).toHaveBeenCalledWith('published');
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle invalid status transition', async () => {
      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'cancelled',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        updateStatus: jest.fn().mockReturnValue({ 
          success: false, 
          error: 'Cannot transition from cancelled to published' 
        })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.publishInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'STATUS_TRANSITION_ERROR',
          message: 'Cannot transition from cancelled to published'
        }
      });
    });
  });

  describe('deleteInquiry', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'inquiry-123' };
    });

    it('should delete inquiry for admin', async () => {
      mockRequest.user!.role = 'admin';

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);
      (Inquiry.deleteById as jest.Mock).mockResolvedValue({ success: true });

      await InquiryController.deleteInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Inquiry.deleteById).toHaveBeenCalledWith(expect.anything(), 'inquiry-123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Inquiry deleted successfully'
      });
    });

    it('should reject delete for non-admin', async () => {
      await InquiryController.deleteInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only administrators can delete inquiries'
        }
      });
    });

    it('should handle delete errors', async () => {
      mockRequest.user!.role = 'admin';

      const mockInquiry = new Inquiry({
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);
      (Inquiry.deleteById as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: 'Database error' 
      });

      await InquiryController.deleteInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error'
        }
      });
    });
  });
});