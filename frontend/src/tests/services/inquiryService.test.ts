import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/services/api';
import { InquiryService, type InquiryListParams } from '@/services/inquiryService';
import type { Inquiry, CreateInquiryForm, UpdateInquiryForm } from '@/types/inquiry';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

// Mock axios
vi.mock('@/services/api');

const mockInquiry: Inquiry = {
  id: '1',
  inquiryNumber: 'INQ202401010001',
  productName: 'Test Product',
  materialType: 'Steel',
  specifications: 'Test specifications',
  specialRequirements: 'Test requirements',
  quantity: 100,
  status: 'draft',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockPaginatedResponse: PaginatedResponse<Inquiry> = {
  items: [mockInquiry],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('InquiryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInquiries', () => {
    it('fetches inquiries successfully', async () => {
      const mockResponse: ApiResponse<PaginatedResponse<Inquiry>> = {
        success: true,
        data: mockPaginatedResponse,
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      const result = await InquiryService.getInquiries();
      
      expect(axios.get).toHaveBeenCalledWith('/api/inquiries', { params: {} });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('fetches inquiries with parameters', async () => {
      const params: InquiryListParams = {
        page: 2,
        limit: 10,
        search: 'test',
        status: 'published',
      };
      
      const mockResponse: ApiResponse<PaginatedResponse<Inquiry>> = {
        success: true,
        data: mockPaginatedResponse,
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      const result = await InquiryService.getInquiries(params);
      
      expect(axios.get).toHaveBeenCalledWith('/api/inquiries', { params });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('throws error when API response is not successful', async () => {
      const mockResponse: ApiResponse<PaginatedResponse<Inquiry>> = {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch inquiries',
        },
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      await expect(InquiryService.getInquiries()).rejects.toThrow('Failed to fetch inquiries');
    });
  });

  describe('getInquiryById', () => {
    it('fetches inquiry by ID successfully', async () => {
      const mockResponse: ApiResponse<Inquiry> = {
        success: true,
        data: mockInquiry,
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      const result = await InquiryService.getInquiryById('1');
      
      expect(axios.get).toHaveBeenCalledWith('/api/inquiries/1');
      expect(result).toEqual(mockInquiry);
    });

    it('throws error when inquiry not found', async () => {
      const mockResponse: ApiResponse<Inquiry> = {
        success: false,
        error: {
          code: 'INQUIRY_NOT_FOUND',
          message: 'Inquiry not found',
        },
      };
      
      vi.mocked(axios.get).mockResolvedValue({ data: mockResponse });
      
      await expect(InquiryService.getInquiryById('999')).rejects.toThrow('Inquiry not found');
    });
  });

  describe('createInquiry', () => {
    it('creates inquiry successfully', async () => {
      const createData: CreateInquiryForm = {
        productName: 'New Product',
        materialType: 'Aluminum',
        specifications: 'New specifications',
        quantity: 50,
      };
      
      const mockResponse: ApiResponse<Inquiry> = {
        success: true,
        data: { ...mockInquiry, ...createData },
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      const result = await InquiryService.createInquiry(createData);
      
      expect(axios.post).toHaveBeenCalledWith('/api/inquiries', createData);
      expect(result.productName).toBe('New Product');
    });

    it('throws error when creation fails', async () => {
      const createData: CreateInquiryForm = {
        productName: 'New Product',
        materialType: 'Aluminum',
        specifications: 'New specifications',
        quantity: 50,
      };
      
      const mockResponse: ApiResponse<Inquiry> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid data',
        },
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      await expect(InquiryService.createInquiry(createData)).rejects.toThrow('Invalid data');
    });
  });

  describe('updateInquiry', () => {
    it('updates inquiry successfully', async () => {
      const updateData: UpdateInquiryForm = {
        productName: 'Updated Product',
        quantity: 200,
      };
      
      const updatedInquiry = { ...mockInquiry, ...updateData };
      const mockResponse: ApiResponse<Inquiry> = {
        success: true,
        data: updatedInquiry,
      };
      
      vi.mocked(axios.put).mockResolvedValue({ data: mockResponse });
      
      const result = await InquiryService.updateInquiry('1', updateData);
      
      expect(axios.put).toHaveBeenCalledWith('/api/inquiries/1', updateData);
      expect(result.productName).toBe('Updated Product');
      expect(result.quantity).toBe(200);
    });

    it('throws error when update fails', async () => {
      const updateData: UpdateInquiryForm = {
        productName: 'Updated Product',
      };
      
      const mockResponse: ApiResponse<Inquiry> = {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Permission denied',
        },
      };
      
      vi.mocked(axios.put).mockResolvedValue({ data: mockResponse });
      
      await expect(InquiryService.updateInquiry('1', updateData)).rejects.toThrow('Permission denied');
    });
  });

  describe('cancelInquiry', () => {
    it('cancels inquiry successfully', async () => {
      const cancelledInquiry = { ...mockInquiry, status: 'cancelled' as const };
      const mockResponse: ApiResponse<Inquiry> = {
        success: true,
        data: cancelledInquiry,
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      const result = await InquiryService.cancelInquiry('1');
      
      expect(axios.post).toHaveBeenCalledWith('/api/inquiries/1/cancel');
      expect(result.status).toBe('cancelled');
    });

    it('throws error when cancellation fails', async () => {
      const mockResponse: ApiResponse<Inquiry> = {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Cannot cancel inquiry',
        },
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      await expect(InquiryService.cancelInquiry('1')).rejects.toThrow('Cannot cancel inquiry');
    });
  });

  describe('publishInquiry', () => {
    it('publishes inquiry successfully', async () => {
      const publishedInquiry = { ...mockInquiry, status: 'published' as const };
      const mockResponse: ApiResponse<Inquiry> = {
        success: true,
        data: publishedInquiry,
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      const result = await InquiryService.publishInquiry('1');
      
      expect(axios.post).toHaveBeenCalledWith('/api/inquiries/1/publish');
      expect(result.status).toBe('published');
    });

    it('throws error when publishing fails', async () => {
      const mockResponse: ApiResponse<Inquiry> = {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Cannot publish inquiry',
        },
      };
      
      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse });
      
      await expect(InquiryService.publishInquiry('1')).rejects.toThrow('Cannot publish inquiry');
    });
  });

  describe('deleteInquiry', () => {
    it('deletes inquiry successfully', async () => {
      const mockResponse: ApiResponse<void> = {
        success: true,
      };
      
      vi.mocked(axios.delete).mockResolvedValue({ data: mockResponse });
      
      await InquiryService.deleteInquiry('1');
      
      expect(axios.delete).toHaveBeenCalledWith('/api/inquiries/1');
    });

    it('throws error when deletion fails', async () => {
      const mockResponse: ApiResponse<void> = {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Cannot delete inquiry',
        },
      };
      
      vi.mocked(axios.delete).mockResolvedValue({ data: mockResponse });
      
      await expect(InquiryService.deleteInquiry('1')).rejects.toThrow('Cannot delete inquiry');
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'));
      
      await expect(InquiryService.getInquiries()).rejects.toThrow('Network Error');
    });
  });
});