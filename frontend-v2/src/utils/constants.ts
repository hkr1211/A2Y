import type {
  InquiryStatus,
  OrderStatus,
  QuotationStatus,
  UserRole,
  Company,
} from '@/types';

// Inquiry status labels
export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, { zh: string; ja: string }> = {
  draft: { zh: '草稿', ja: '下書き' },
  published: { zh: '已发布', ja: '公開済み' },
  quoted: { zh: '已报价', ja: '見積済み' },
  converted: { zh: '已转订单', ja: '注文転換済み' },
  cancelled: { zh: '已取消', ja: 'キャンセル済み' },
};

// Order status labels
export const ORDER_STATUS_LABELS: Record<OrderStatus, { zh: string; ja: string }> = {
  pending: { zh: '待确认', ja: '確認待ち' },
  confirmed: { zh: '已确认', ja: '確認済み' },
  production: { zh: '生产中', ja: '生産中' },
  shipped: { zh: '已发货', ja: '出荷済み' },
  completed: { zh: '已完成', ja: '完了' },
  rejected: { zh: '已拒绝', ja: '拒否' },
  cancelled: { zh: '已取消', ja: 'キャンセル済み' },
};

// Quotation status labels
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, { zh: string; ja: string }> = {
  active: { zh: '有效', ja: '有効' },
  withdrawn: { zh: '已撤回', ja: '取下げ済み' },
};

// Status tag types for Element Plus
export const INQUIRY_STATUS_TYPES: Record<InquiryStatus, string> = {
  draft: 'info',
  published: 'primary',
  quoted: 'warning',
  converted: 'success',
  cancelled: 'danger',
};

export const ORDER_STATUS_TYPES: Record<OrderStatus, string> = {
  pending: 'info',
  confirmed: 'primary',
  production: 'warning',
  shipped: '',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

// Role labels
export const ROLE_LABELS: Record<UserRole, { zh: string; ja: string }> = {
  admin: { zh: '管理员', ja: '管理者' },
  buyer: { zh: '买方', ja: 'バイヤー' },
  supplier: { zh: '供应商', ja: 'サプライヤー' },
};

// Company labels
export const COMPANY_LABELS: Record<Company, { zh: string; ja: string }> = {
  admin: { zh: '系统', ja: 'システム' },
  arroz: { zh: 'Arroz（日本）', ja: 'Arroz（日本）' },
  yunjie: { zh: '云杰（中国）', ja: '雲傑（中国）' },
};

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];
