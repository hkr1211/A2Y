export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'production' 
  | 'shipped' 
  | 'completed' 
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  inquiryId?: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  createdBy: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
  creatorName?: string;
  confirmerName?: string;
}

export interface CreateOrderForm {
  inquiryId?: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface UpdateOrderForm {
  productName?: string;
  materialType?: string;
  specifications?: string;
  specialRequirements?: string;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  createdBy?: string;
}

// Status display configurations
export const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'orders.status.pending',
    type: 'info' as const,
    color: '#909399'
  },
  confirmed: {
    label: 'orders.status.confirmed',
    type: 'primary' as const,
    color: '#409EFF'
  },
  production: {
    label: 'orders.status.production',
    type: 'warning' as const,
    color: '#E6A23C'
  },
  shipped: {
    label: 'orders.status.shipped',
    type: 'success' as const,
    color: '#67C23A'
  },
  completed: {
    label: 'orders.status.completed',
    type: 'success' as const,
    color: '#67C23A'
  },
  cancelled: {
    label: 'orders.status.cancelled',
    type: 'danger' as const,
    color: '#F56C6C'
  }
} as const;