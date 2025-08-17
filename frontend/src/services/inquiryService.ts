import axios from './api';
import type { Inquiry, CreateInquiryForm, UpdateInquiryForm, InquiryListParams } from '@/types/inquiry';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export class InquiryService {
  /**
   * Get paginated list of inquiries
   */
  static async getInquiries(params: InquiryListParams = {}): Promise<PaginatedResponse<Inquiry>> {
    const response = await axios.get<ApiResponse<PaginatedResponse<Inquiry>>>('/api/inquiries', {
      params,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch inquiries');
    }

    return response.data.data;
  }

  /**
   * Get inquiry by ID
   */
  static async getInquiryById(id: string): Promise<Inquiry> {
    const response = await axios.get<ApiResponse<Inquiry>>(`/api/inquiries/${id}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch inquiry');
    }

    return response.data.data;
  }

  /**
   * Create new inquiry
   */
  static async createInquiry(inquiryData: CreateInquiryForm): Promise<Inquiry> {
    const response = await axios.post<ApiResponse<Inquiry>>('/api/inquiries', inquiryData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create inquiry');
    }

    return response.data.data;
  }

  /**
   * Update inquiry
   */
  static async updateInquiry(id: string, inquiryData: UpdateInquiryForm): Promise<Inquiry> {
    const response = await axios.put<ApiResponse<Inquiry>>(`/api/inquiries/${id}`, inquiryData);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to update inquiry');
    }

    return response.data.data;
  }

  /**
   * Cancel inquiry
   */
  static async cancelInquiry(id: string): Promise<Inquiry> {
    const response = await axios.post<ApiResponse<Inquiry>>(`/api/inquiries/${id}/cancel`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to cancel inquiry');
    }

    return response.data.data;
  }

  /**
   * Publish inquiry
   */
  static async publishInquiry(id: string): Promise<Inquiry> {
    const response = await axios.post<ApiResponse<Inquiry>>(`/api/inquiries/${id}/publish`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to publish inquiry');
    }

    return response.data.data;
  }

  /**
   * Delete inquiry (admin only)
   */
  static async deleteInquiry(id: string): Promise<void> {
    const response = await axios.delete<ApiResponse<void>>(`/api/inquiries/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete inquiry');
    }
  }
}