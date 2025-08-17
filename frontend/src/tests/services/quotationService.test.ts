import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { QuotationService } from '@/services/quotationService';
import type { Quotation, CreateQuotationForm, UpdateQuotationForm } from '@/types/quotation';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('QuotationService', () => {
  const mockQuotation: Quotation = {
    id: 'quotation-1',
    inquiryId: 'inquiry-1',
    unitPrice: 10.5,
    totalPrice: 1050,
    deliveryTime: 15,
    remarks: 'Test remarks',
    status: 'active',
    createdBy: 'user-2',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCreateForm: CreateQuotationForm = {
    inquiryId: 'inquiry-1',
    unitPrice: 10.5,
    totalPrice: 1050,
    deliveryTime: 15,
    remarks: 'Test remarks',
  };

  const mockUpdateForm: UpdateQuotationForm = {
    unitPrice: 12.0,
    totalPrice: 1200,
    deliveryTime: 20,
    remarks: 'Updated remarks',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuotation', () => {
    it('creates quotation successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          data: mockQuotation,
        },
      });

      const result = await QuotationService.createQuotation(mockCreateForm);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/quotations', mockCreateForm);
      expect(result).toEqual(mockQuotation);
    });

    it('throws error when creation fails', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Creation failed' },
        },
      });

      await expect(QuotationService.createQuotation(mockCreateForm))
        .rejects.toThrow('Creation failed');
    });

    it('throws default error when no error message provided', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
        },
      });

      await expect(QuotationService.createQuotation(mockCreateForm))
        .rejects.toThrow('Failed to create quotation');
    });
  });

  describe('getUserQuotations', () => {
    it('fetches user quotations successfully', async () => {
      const mockResponse = {
        data: [mockQuotation],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await QuotationService.getUserQuotations({
        page: 1,
        limit: 20,
        search: 'test',
        status: 'active',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/quotations/user', {
        params: {
          page: 1,
          limit: 20,
          search: 'test',
          status: 'active',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('fetches user quotations without parameters', async () => {
      const mockResponse = {
        data: [mockQuotation],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await QuotationService.getUserQuotations();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/quotations/user', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error when fetch fails', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Fetch failed' },
        },
      });

      await expect(QuotationService.getUserQuotations())
        .rejects.toThrow('Fetch failed');
    });
  });

  describe('getQuotationByInquiry', () => {
    it('fetches quotation by inquiry successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockQuotation,
        },
      });

      const result = await QuotationService.getQuotationByInquiry('inquiry-1');

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/quotations/inquiry/inquiry-1');
      expect(result).toEqual(mockQuotation);
    });

    it('returns null when quotation not found', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
        },
      });

      const result = await QuotationService.getQuotationByInquiry('inquiry-1');

      expect(result).toBeNull();
    });

    it('returns null when 404 error occurs', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 404 },
      });

      const result = await QuotationService.getQuotationByInquiry('inquiry-1');

      expect(result).toBeNull();
    });

    it('throws error for non-404 errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Server error'));

      await expect(QuotationService.getQuotationByInquiry('inquiry-1'))
        .rejects.toThrow('Server error');
    });
  });

  describe('getQuotation', () => {
    it('fetches quotation successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockQuotation,
        },
      });

      const result = await QuotationService.getQuotation('quotation-1');

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/quotations/quotation-1');
      expect(result).toEqual(mockQuotation);
    });

    it('throws error when fetch fails', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Not found' },
        },
      });

      await expect(QuotationService.getQuotation('quotation-1'))
        .rejects.toThrow('Not found');
    });
  });

  describe('updateQuotation', () => {
    it('updates quotation successfully', async () => {
      const updatedQuotation = { ...mockQuotation, ...mockUpdateForm };
      
      mockedAxios.put.mockResolvedValue({
        data: {
          success: true,
          data: updatedQuotation,
        },
      });

      const result = await QuotationService.updateQuotation('quotation-1', mockUpdateForm);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/quotations/quotation-1', mockUpdateForm);
      expect(result).toEqual(updatedQuotation);
    });

    it('throws error when update fails', async () => {
      mockedAxios.put.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Update failed' },
        },
      });

      await expect(QuotationService.updateQuotation('quotation-1', mockUpdateForm))
        .rejects.toThrow('Update failed');
    });
  });

  describe('cancelQuotation', () => {
    it('cancels quotation successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await QuotationService.cancelQuotation('quotation-1');

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/quotations/quotation-1/cancel');
    });

    it('throws error when cancel fails', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Cancel failed' },
        },
      });

      await expect(QuotationService.cancelQuotation('quotation-1'))
        .rejects.toThrow('Cancel failed');
    });
  });

  describe('deleteQuotation', () => {
    it('deletes quotation successfully', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await QuotationService.deleteQuotation('quotation-1');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/quotations/quotation-1');
    });

    it('throws error when delete fails', async () => {
      mockedAxios.delete.mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Delete failed' },
        },
      });

      await expect(QuotationService.deleteQuotation('quotation-1'))
        .rejects.toThrow('Delete failed');
    });
  });
});