import axios from 'axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { 
  Quotation, 
  CreateQuotationForm, 
  UpdateQuotationForm, 
  QuotationListParams 
} from '@/types/quotation';

export class QuotationService {
  private static readonly BASE_URL = '/api/quotations';

  /**
   * 创建报价（供应商回复询单）
   */
  static async createQuotation(quotationData: CreateQuotationForm): Promise<Quotation> {
    const response = await axios.post<ApiResponse<Quotation>>(
      this.BASE_URL,
      quotationData
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create quotation');
    }

    return response.data.data;
  }

  /**
   * 获取当前用户的所有报价
   */
  static async getUserQuotations(params?: QuotationListParams): Promise<PaginatedResponse<Quotation>> {
    const response = await axios.get<ApiResponse<PaginatedResponse<Quotation>>>(
      `${this.BASE_URL}/user`,
      { params }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch user quotations');
    }

    return response.data.data;
  }

  /**
   * 根据询单ID获取报价
   */
  static async getQuotationByInquiry(inquiryId: string): Promise<Quotation | null> {
    try {
      const response = await axios.get<ApiResponse<Quotation>>(
        `${this.BASE_URL}/inquiry/${inquiryId}`
      );

      if (!response.data.success) {
        return null;
      }

      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取报价详情
   */
  static async getQuotation(id: string): Promise<Quotation> {
    const response = await axios.get<ApiResponse<Quotation>>(
      `${this.BASE_URL}/${id}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch quotation');
    }

    return response.data.data;
  }

  /**
   * 更新报价
   */
  static async updateQuotation(id: string, quotationData: UpdateQuotationForm): Promise<Quotation> {
    const response = await axios.put<ApiResponse<Quotation>>(
      `${this.BASE_URL}/${id}`,
      quotationData
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to update quotation');
    }

    return response.data.data;
  }

  /**
   * 作废报价
   */
  static async cancelQuotation(id: string): Promise<void> {
    const response = await axios.post<ApiResponse<void>>(
      `${this.BASE_URL}/${id}/cancel`
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to cancel quotation');
    }
  }

  /**
   * 删除报价（仅管理员）
   */
  static async deleteQuotation(id: string): Promise<void> {
    const response = await axios.delete<ApiResponse<void>>(
      `${this.BASE_URL}/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete quotation');
    }
  }
}