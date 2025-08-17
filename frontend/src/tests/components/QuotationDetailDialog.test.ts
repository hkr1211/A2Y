import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import QuotationDetailDialog from '@/components/QuotationDetailDialog.vue';
import { QuotationService } from '@/services/quotationService';
import { InquiryService } from '@/services/inquiryService';
import type { Quotation } from '@/types/quotation';
import type { Inquiry } from '@/types/inquiry';

// Mock services
vi.mock('@/services/quotationService', () => ({
  QuotationService: {
    getQuotation: vi.fn(),
    cancelQuotation: vi.fn(),
  },
}));

vi.mock('@/services/inquiryService', () => ({
  InquiryService: {
    getInquiry: vi.fn(),
  },
}));

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}));

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'quotations.quotationDetail': '报价详情',
        'quotations.basicInfo': '基本信息',
        'quotations.relatedInquiry': '相关询单',
        'quotations.viewInquiry': '查看询单',
        'quotations.unitPrice': '单价',
        'quotations.totalPrice': '总价',
        'quotations.deliveryTime': '工期',
        'quotations.deliveryTimeUnit': '天',
        'quotations.remarks': '备注',
        'quotations.cancelConfirmTitle': '确认作废',
        'quotations.cancelConfirmMessage': '确定要作废这个报价吗？',
        'quotations.cancelSuccess': '报价作废成功',
        'quotations.cancelError': '报价作废失败',
        'quotations.loadError': '加载报价数据失败',
        'quotations.viewInquiryFeature': '查看询单功能开发中',
        'quotations.status.active': '有效',
        'quotations.status.cancelled': '已作废',
        'inquiries.inquiryNumber': '询单号',
        'inquiries.productName': '产品名称',
        'inquiries.materialType': '材料类型',
        'inquiries.quantity': '数量',
        'inquiries.specifications': '规格说明',
        'inquiries.specialRequirements': '特殊要求',
        'common.close': '关闭',
        'common.edit': '编辑',
        'common.confirm': '确认',
        'common.cancel': '取消',
        'common.createdAt': '创建时间',
        'common.updatedAt': '更新时间',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    userRole: 'supplier',
    user: { id: 'user-2' },
  }),
}));

describe('QuotationDetailDialog', () => {
  const mockQuotation: Quotation = {
    id: 'quotation-1',
    inquiryId: 'inquiry-1',
    unitPrice: 10.5,
    totalPrice: 1050,
    deliveryTime: 15,
    remarks: 'Test remarks',
    status: 'active',
    createdBy: 'user-2',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockInquiry: Inquiry = {
    id: 'inquiry-1',
    inquiryNumber: 'INQ-001',
    productName: 'Test Product',
    materialType: 'Steel',
    specifications: 'Test specifications',
    specialRequirements: 'Test requirements',
    quantity: 100,
    attachments: [],
    status: 'published',
    createdBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(QuotationService.getQuotation).mockResolvedValue(mockQuotation);
    vi.mocked(InquiryService.getInquiry).mockResolvedValue(mockInquiry);
  });

  it('renders dialog with quotation data', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    // Manually trigger the loading function since watchers don't run in tests
    const component = wrapper.vm as any;
    await component.loadQuotationData();

    expect(QuotationService.getQuotation).toHaveBeenCalledWith('quotation-1');
    expect(InquiryService.getInquiry).toHaveBeenCalledWith('inquiry-1');
    expect(component.dialogVisible).toBe(true);
  });

  it('displays quotation basic information', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('¥10.50');
    expect(wrapper.text()).toContain('¥1050.00');
    expect(wrapper.text()).toContain('15');
    expect(wrapper.text()).toContain('Test remarks');
  });

  it('displays related inquiry information', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    component.inquiry = mockInquiry;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('INQ-001');
    expect(wrapper.text()).toContain('Test Product');
    expect(wrapper.text()).toContain('Steel');
    expect(wrapper.text()).toContain('100');
  });

  it('shows edit button for supplier who created the quotation', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    await wrapper.vm.$nextTick();

    expect(component.canEdit).toBe(true);
    // Check that the component has the edit functionality
    expect(typeof component.editQuotation).toBe('function');
  });

  it('shows cancel button for supplier who created the quotation', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    await wrapper.vm.$nextTick();

    expect(component.canCancel).toBe(true);
  });

  it('hides edit and cancel buttons for cancelled quotations', async () => {
    const cancelledQuotation = { ...mockQuotation, status: 'cancelled' as const };
    vi.mocked(QuotationService.getQuotation).mockResolvedValue(cancelledQuotation);

    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    expect(component.canEdit).toBe(false);
    expect(component.canCancel).toBe(false);
  });

  it('emits edit event when edit button is clicked', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    component.inquiry = mockInquiry;
    await wrapper.vm.$nextTick();

    await component.editQuotation();

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockQuotation, mockInquiry]);
  });

  it('handles cancel quotation with confirmation', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(QuotationService.cancelQuotation).mockResolvedValue();

    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    await wrapper.vm.$nextTick();

    await component.cancelQuotation();

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '确定要作废这个报价吗？',
      '确认作废',
      expect.any(Object)
    );
    expect(QuotationService.cancelQuotation).toHaveBeenCalledWith('quotation-1');
    expect(ElMessage.success).toHaveBeenCalledWith('报价作废成功');
    expect(wrapper.emitted('refresh')).toBeTruthy();
  });

  it('handles cancel quotation cancellation', async () => {
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel');

    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    await wrapper.vm.$nextTick();

    await component.cancelQuotation();

    expect(QuotationService.cancelQuotation).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });

  it('handles cancel quotation error', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(QuotationService.cancelQuotation).mockRejectedValue(new Error('Cancel failed'));

    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    await wrapper.vm.$nextTick();

    await component.cancelQuotation();

    expect(ElMessage.error).toHaveBeenCalledWith('Cancel failed');
  });

  it('handles view inquiry click', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.inquiry = mockInquiry;
    await wrapper.vm.$nextTick();

    component.viewInquiry();

    expect(ElMessage.info).toHaveBeenCalledWith('查看询单功能开发中');
  });

  it('handles loading error', async () => {
    vi.mocked(QuotationService.getQuotation).mockRejectedValue(new Error('Load failed'));

    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    // Manually trigger the loading function to test error handling
    const component = wrapper.vm as any;
    await component.loadQuotationData();

    expect(ElMessage.error).toHaveBeenCalledWith('Load failed');
  });

  it('resets data when dialog closes', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.quotation = mockQuotation;
    component.inquiry = mockInquiry;

    component.handleClose();

    expect(component.quotation).toBeNull();
    expect(component.inquiry).toBeNull();
  });

  it('formats date time correctly', async () => {
    const wrapper = mount(QuotationDetailDialog, {
      props: {
        visible: true,
        quotationId: 'quotation-1',
      },
    });

    const component = wrapper.vm as any;
    const formatted = component.formatDateTime('2024-01-01T12:30:45Z');
    
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('2024');
  });
});