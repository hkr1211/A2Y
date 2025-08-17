export type InquiryStatus = 'draft' | 'published' | 'replied' | 'converted' | 'cancelled';

export interface InquiryData {
  id?: string;
  inquiryNumber?: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  quantity: number;
  status?: InquiryStatus;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateInquiryRequest {
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  quantity: number;
}

export interface UpdateInquiryRequest {
  productName?: string;
  materialType?: string;
  specifications?: string;
  specialRequirements?: string;
  quantity?: number;
}

export interface InquiryResponse {
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