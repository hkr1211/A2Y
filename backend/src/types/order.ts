import { FileAttachment } from './file.js';

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'production' 
  | 'shipped' 
  | 'completed' 
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string; // Auto-generated order number
  inquiryId?: string; // Optional, exists when converted from inquiry
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  attachments?: FileAttachment[];
  status: OrderStatus;
  createdBy: string; // Buyer user ID
  confirmedBy?: string; // Supplier user ID
  createdAt: Date;
  updatedAt: Date;
  creatorName?: string; // Creator username for display
  confirmerName?: string; // Confirmer username for display
}

export interface CreateOrderRequest {
  inquiryId?: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface UpdateOrderRequest {
  productName?: string;
  materialType?: string;
  specifications?: string;
  specialRequirements?: string;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  confirmedBy?: string;
}

export interface CreateOrderData {
  inquiryId?: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  createdBy: string;
}

export interface UpdateOrderData {
  productName?: string;
  materialType?: string;
  specifications?: string;
  specialRequirements?: string;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
  status?: OrderStatus;
  confirmedBy?: string;
}