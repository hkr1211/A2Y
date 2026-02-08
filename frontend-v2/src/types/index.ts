// User roles
export type UserRole = 'admin' | 'buyer' | 'supplier';
export type Company = 'arroz' | 'yunjie' | 'admin';
export type Language = 'zh' | 'ja';

// Inquiry status
export type InquiryStatus =
  | 'draft'
  | 'published'
  | 'quoted'
  | 'converted'
  | 'cancelled';

// Order status
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'production'
  | 'shipped'
  | 'completed'
  | 'rejected'
  | 'cancelled';

// Quotation status
export type QuotationStatus = 'active' | 'withdrawn';

// User
export interface User {
  id: string;
  username: string;
  role: UserRole;
  company: Company;
  language: Language;
  createdAt: string;
  updatedAt?: string;
}

// Inquiry
export interface Inquiry {
  id: string;
  inquiryNumber: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements: string | null;
  quantity: number;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; username: string } | string;
  attachments?: FileAttachment[];
  quotations?: Quotation[];
}

// Quotation
export interface Quotation {
  id: string;
  inquiry_id: string;
  version: number;
  unit_price: number;
  quantity: number;
  total_price: number;
  currency: string;
  delivery_date: string;
  payment_terms: string;
  remarks: string;
  status: QuotationStatus;
  created_by: string;
  creator_name?: string;
  created_at: string;
}

// Order
export interface Order {
  id: string;
  order_no: string;
  inquiry_id: string;
  inquiry_no?: string;
  quotation_id: string;
  status: OrderStatus;
  total_price: number;
  currency: string;
  delivery_date: string;
  shipping_address: string;
  remarks: string;
  rejection_reason?: string;
  created_by: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

// File attachment
export interface FileAttachment {
  id: string;
  entity_type: 'inquiry' | 'order';
  entity_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploader_name?: string;
  created_at: string;
}

// Chat message
export interface ChatMessage {
  id: string;
  entity_type: 'inquiry' | 'order';
  entity_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

// Audit log
export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: string;
  created_at: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiPaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

// Auth
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Pagination
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
