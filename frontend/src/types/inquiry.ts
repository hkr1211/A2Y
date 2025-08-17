export type InquiryStatus = 'draft' | 'published' | 'replied' | 'converted' | 'cancelled';

export interface Inquiry {
  id: string;
  inquiryNumber: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  quantity: number;
  status: InquiryStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryForm {
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  quantity: number;
}

export interface UpdateInquiryForm {
  productName?: string;
  materialType?: string;
  specifications?: string;
  specialRequirements?: string;
  quantity?: number;
}

export interface InquiryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InquiryStatus;
  createdBy?: string;
}

// Status display configurations
export const INQUIRY_STATUS_CONFIG = {
  draft: {
    label: 'inquiries.status.draft',
    type: 'info' as const,
    color: '#909399'
  },
  published: {
    label: 'inquiries.status.published',
    type: 'primary' as const,
    color: '#409EFF'
  },
  replied: {
    label: 'inquiries.status.replied',
    type: 'success' as const,
    color: '#67C23A'
  },
  converted: {
    label: 'inquiries.status.converted',
    type: 'warning' as const,
    color: '#E6A23C'
  },
  cancelled: {
    label: 'inquiries.status.cancelled',
    type: 'danger' as const,
    color: '#F56C6C'
  }
} as const;