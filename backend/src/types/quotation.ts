export interface Quotation {
  id: string;
  inquiryId: string;
  unitPrice: number;
  totalPrice: number;
  deliveryTime: number; // 工期（天）
  remarks?: string;
  status: 'active' | 'cancelled';
  createdBy: string; // 供应商用户ID
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuotationRequest {
  inquiryId: string;
  unitPrice: number;
  totalPrice: number;
  deliveryTime: number;
  remarks?: string;
}

export interface UpdateQuotationRequest {
  unitPrice?: number;
  totalPrice?: number;
  deliveryTime?: number;
  remarks?: string;
}

export interface QuotationResponse {
  id: string;
  inquiryId: string;
  unitPrice: number;
  totalPrice: number;
  deliveryTime: number;
  remarks?: string;
  status: 'active' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}