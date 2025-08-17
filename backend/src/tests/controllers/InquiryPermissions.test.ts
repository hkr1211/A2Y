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

describe('InquiryController - Permission Control', () => {
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('Permission Control - View Inquiries', () => {
    it('should allow admin to view all inquiries', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'admin-123',
          username: 'admin',
          role: 'admin',
          company: 'admin',
          language: 'zh'
        }
      };

      const mockInquiries = [
        {
          id: 'inquiry-1',
          inquiryNumber: 'INQ202401001',
          productName: 'Product 1',
          materialType: 'Steel',
          specifications: 'Spec 1',
          quantity: 100,
          status: 'draft',
          createdBy: 'buyer-123',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: 'inquiry-2',
          inquiryNumber: 'INQ202401002',
          productName: 'Product 2',
          materialType: 'Aluminum',
          specifications: 'Spec 2',
          quantity: 200,
          status: 'published',
          createdBy: 'buyer-456',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      (Inquiry.findAll as jest.Mock).mockResolvedValue(mockInquiries);

      await InquiryController.getAllInquiries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Inquiry.findAll).toHaveBeenCalled();
      expect(Inquiry.findByCreator).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'inquiry-1' }),
          expect.objectContaining({ id: 'inquiry-2' })
        ])
      });
    });

    it('should allow buyer to view only their own inquiries', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        }
      };

      const mockInquiries = [
        {
          id: 'inquiry-1',
          inquiryNumber: 'INQ202401001',
          productName: 'Product 1',
          materialType: 'Steel',
          specifications: 'Spec 1',
          quantity: 100,
          status: 'draft',
          createdBy: 'buyer-123',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      (Inquiry.findByCreator as jest.Mock).mockResolvedValue(mockInquiries);

      await InquiryController.getAllInquiries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Inquiry.findByCreator).toHaveBeenCalledWith(expect.anything(), 'buyer-123');
      expect(Inquiry.findAll).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should allow supplier to view only their own inquiries', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'supplier-123',
          username: 'supplier1',
          role: 'supplier',
          company: 'yunjie',
          language: 'zh'
        }
      };

      const mockInquiries = [];

      (Inquiry.findByCreator as jest.Mock).mockResolvedValue(mockInquiries);

      await InquiryController.getAllInquiries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Inquiry.findByCreator).toHaveBeenCalledWith(expect.anything(), 'supplier-123');
      expect(Inquiry.findAll).not.toHaveBeenCalled();
    });
  });

  describe('Permission Control - View Single Inquiry', () => {
    it('should allow admin to view any inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'admin-123',
          username: 'admin',
          role: 'admin',
          company: 'admin',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-456', // Different user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.getInquiryById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'inquiry-123',
          createdBy: 'buyer-456'
        })
      });
    });

    it('should allow user to view their own inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-123', // Same user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.getInquiryById(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should deny user access to other user inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-456', // Different user
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

  describe('Permission Control - Create Inquiry', () => {
    it('should allow buyer to create inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        body: {
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100
        }
      };

      const mockInquiry = {
        id: 'new-inquiry',
        inquiryNumber: 'INQ202401001',
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry as jest.MockedClass<typeof Inquiry>).mockImplementation(() => mockInquiry as any);

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should allow admin to create inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'admin-123',
          username: 'admin',
          role: 'admin',
          company: 'admin',
          language: 'zh'
        },
        body: {
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100
        }
      };

      const mockInquiry = {
        id: 'new-inquiry',
        inquiryNumber: 'INQ202401001',
        productName: 'Test Product',
        materialType: 'Steel',
        specifications: 'High quality steel',
        quantity: 100,
        status: 'draft',
        createdBy: 'admin-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry as jest.MockedClass<typeof Inquiry>).mockImplementation(() => mockInquiry as any);

      await InquiryController.createInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should deny supplier from creating inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'supplier-123',
          username: 'supplier1',
          role: 'supplier',
          company: 'yunjie',
          language: 'zh'
        },
        body: {
          productName: 'Test Product',
          materialType: 'Steel',
          specifications: 'High quality steel',
          quantity: 100
        }
      };

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
  });

  describe('Permission Control - Update Inquiry', () => {
    it('should allow user to update their own inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' },
        body: {
          productName: 'Updated Product',
          quantity: 200
        }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Original Product',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-123', // Same user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeModified: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.updateInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should allow admin to update any inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'admin-123',
          username: 'admin',
          role: 'admin',
          company: 'admin',
          language: 'zh'
        },
        params: { id: 'inquiry-123' },
        body: {
          productName: 'Updated Product',
          quantity: 200
        }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Original Product',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-456', // Different user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeModified: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.updateInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should deny user from updating other user inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' },
        body: {
          productName: 'Updated Product',
          quantity: 200
        }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Original Product',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-456', // Different user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.updateInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only update your own inquiries'
        }
      });
    });
  });

  describe('Permission Control - Delete Inquiry', () => {
    it('should allow admin to delete any inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'admin-123',
          username: 'admin',
          role: 'admin',
          company: 'admin',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-456',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);
      (Inquiry.deleteById as jest.Mock).mockResolvedValue({ success: true });

      await InquiryController.deleteInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Inquiry deleted successfully'
      });
    });

    it('should deny buyer from deleting inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

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

    it('should deny supplier from deleting inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'supplier-123',
          username: 'supplier1',
          role: 'supplier',
          company: 'yunjie',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

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
  });

  describe('Permission Control - Cancel and Publish Inquiry', () => {
    it('should allow user to cancel their own inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-123', // Same user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        canBeCancelled: jest.fn().mockReturnValue(true),
        updateStatus: jest.fn().mockReturnValue({ success: true }),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.cancelInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should deny user from cancelling other user inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-456', // Different user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.cancelInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only cancel your own inquiries'
        }
      });
    });

    it('should allow user to publish their own inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-123', // Same user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        updateStatus: jest.fn().mockReturnValue({ success: true }),
        save: jest.fn().mockResolvedValue({ success: true })
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.publishInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should deny user from publishing other user inquiry', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        user: {
          id: 'buyer-123',
          username: 'buyer1',
          role: 'buyer',
          company: 'arroz',
          language: 'zh'
        },
        params: { id: 'inquiry-123' }
      };

      const mockInquiry = {
        id: 'inquiry-123',
        inquiryNumber: 'INQ202401001',
        productName: 'Product 1',
        materialType: 'Steel',
        specifications: 'Spec 1',
        quantity: 100,
        status: 'draft',
        createdBy: 'buyer-456', // Different user
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      (Inquiry.findById as jest.Mock).mockResolvedValue(mockInquiry);

      await InquiryController.publishInquiry(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only publish your own inquiries'
        }
      });
    });
  });
});