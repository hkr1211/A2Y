export type QuotationStatus = 'active' | 'cancelled';

export interface Quotation {
  id: string;
  inquiryId: string;
  unitPrice: number;
  totalPrice: number;
  deliveryTime: number; // 工期（天）
  remarks?: string;
  status: QuotationStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuotationForm {
  inquiryId: string;
  unitPrice: number;
  totalPrice: number;
  deliveryTime: number;
  remarks?: string;
}

export interface UpdateQuotationForm {
  unitPrice?: number;
  totalPrice?: number;
  deliveryTime?: number;
  remarks?: string;
}

export interface QuotationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: QuotationStatus;
  inquiryId?: string;
}

// Status display configurations
export const QUOTATION_STATUS_CONFIG = {
  active: {
    label: 'quotations.status.active',
    type: 'success' as const,
    color: '#67C23A'
  },
  cancelled: {
    label: 'quotations.status.cancelled',
    type: 'danger' as const,
    color: '#F56C6C'
  }
} as const;