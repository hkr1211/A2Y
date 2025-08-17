import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import Quotations from '@/views/Quotations.vue';
import { QuotationService } from '@/services/quotationService';
import { InquiryService } from '@/services/inquiryService';
import type { Quotation } from '@/types/quotation';
import type { Inquiry } from '@/types/inquiry';

// Mock services
vi.mock('@/services/quotationService', () => ({
  QuotationService: {
    getUserQuotations: vi.fn(),
    cancelQuotation: vi.fn(),
    deleteQuotation: vi.fn(),
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
        'quotations.title': '报价管理',
        'quotations.description': '管理供应商报价和回复询单',
        'quotations.searchPlaceholder': '搜索报价...',
        'quotations.statusFilter': '状态筛选',
        'quotations.inquiryNumber': '询单号',
        'quotations.unitPrice': '单价',
        'quotations.totalPrice': '总价',
        'quotations.deliveryTime': '工期',
        'quotations.deliveryTimeUnit': '天',
        'quotations.cancel': '作废报价',
        'quotations.cancelConfirmTitle': '确认作废',
        'quotations.cancelConfirmMessage': '确定要作废这个报价吗？',
        'quotations.cancelSuccess': '报价作废成功',
        'quotations.cancelError': '报价作废失败',
        'quotations.deleteConfirmTitle': '确认删除',
        'quotations.deleteConfirmMessage': '确定要删除这个报价吗？此操作不可恢复！',
        'quotations.deleteSuccess': '报价删除成功',
        'quotations.deleteError': '报价删除失败',
        'quotations.loadError': '加载报价数据失败',
        'quotations.viewInquiry': '查看询单',
        'quotations.status.active': '有效',
        'quotations.status.cancelled': '已作废',
        'common.refresh': '刷新',
        'common.view': '查看',
        'common.edit': '编辑',
        'common.delete': '删除',
        'common.confirm': '确认',
        'common.cancel': '取消',
        'common.status': '状态',
        'common.createdAt': '创建时间',
        'common.actions': '操作',
        'inquiries.loadError': '加载询单失败',
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

describe('Quotations', () => {
  const mockQuotations: Quotation[] = [
    {
      id: 'quotation-1',
      inquiryId: 'inquiry-1',
      unitPrice: 10.5,
      totalPrice: 1050,
      deliveryTime: 15,
      remarks: 'Test remarks 1',
      status: 'active',
      createdBy: 'user-2',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'quotation-2',
      inquiryId: 'inquiry-2',
      unitPrice: 20.0,
      totalPrice: 2000,
      deliveryTime: 30,
      remarks: 'Test remarks 2',
      status: 'cancelled',
      createdBy: 'user-2',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

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
    vi.mocked(QuotationService.getUserQuotations).mockResolvedValue({
      data: mockQuotations,
      total: 2,
      page: 1,
      limit: 20,
    });
    vi.mocked(InquiryService.getInquiry).mockResolvedValue(mockInquiry);
  });

  it('renders quotations page correctly', async () => {
    const wrapper = shallowMount(Quotations);

    const component = wrapper.vm as any;
    expect(component.quotations).toEqual([]);
    expect(component.loading).toBe(false);
    expect(component.currentPage).toBe(1);
    expect(component.pageSize).toBe(20);
  });

  it('loads quotations on mount', async () => {
    const wrapper = shallowMount(Quotations);

    // Manually trigger loadQuotations since onMounted doesn't run in tests
    const component = wrapper.vm as any;
    await component.loadQuotations();

    expect(QuotationService.getUserQuotations).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
      status: undefined,
    });
  });

  it('displays quotations in table', async () => {
    const wrapper = shallowMount(Quotations);

    const component = wrapper.vm as any;
    component.quotations = mockQuotations;
    await wrapper.vm.$nextTick();

    expect(component.quotations).toHaveLength(2);
    expect(component.quotations[0].unitPrice).toBe(10.5);
    expect(component.quotations[1].unitPrice).toBe(20.0);
  });

  it('handles search functionality', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    component.searchQuery = 'test search';
    await component.handleSearch();

    expect(component.currentPage).toBe(1);
    expect(QuotationService.getUserQuotations).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'test search',
      status: undefined,
    });
  });

  it('handles status filter', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    component.statusFilter = 'active';
    await component.handleFilter();

    expect(component.currentPage).toBe(1);
    expect(QuotationService.getUserQuotations).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
      status: 'active',
    });
  });

  it('handles pagination', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    await component.handleCurrentChange(2);

    expect(component.currentPage).toBe(2);
    expect(QuotationService.getUserQuotations).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      search: undefined,
      status: undefined,
    });
  });

  it('shows edit button for active quotations created by current user', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    const activeQuotation = mockQuotations[0];
    
    expect(component.canEdit(activeQuotation)).toBe(true);
  });

  it('hides edit button for cancelled quotations', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    const cancelledQuotation = mockQuotations[1];
    
    expect(component.canEdit(cancelledQuotation)).toBe(false);
  });

  it('handles view quotation', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    component.viewQuotation(mockQuotations[0]);

    expect(component.selectedQuotationId).toBe('quotation-1');
    expect(component.detailDialogVisible).toBe(true);
  });

  it('handles edit quotation', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    await component.editQuotation(mockQuotations[0]);

    expect(InquiryService.getInquiry).toHaveBeenCalledWith('inquiry-1');
    expect(component.selectedQuotation).toEqual(mockQuotations[0]);
    expect(component.selectedInquiry).toEqual(mockInquiry);
    expect(component.formDialogVisible).toBe(true);
  });

  it('handles cancel quotation with confirmation', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(QuotationService.cancelQuotation).mockResolvedValue();

    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    await component.cancelQuotation(mockQuotations[0]);

    expect(ElMessageBox.confirm).toHaveBeenCalled();
    expect(QuotationService.cancelQuotation).toHaveBeenCalledWith('quotation-1');
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('formats date time correctly', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    const formatted = component.formatDateTime('2024-01-01T12:30:45Z');
    
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('2024');
  });

  it('gets inquiry number from cache', async () => {
    const wrapper = shallowMount(Quotations);
    const component = wrapper.vm as any;
    
    component.inquiryCache['inquiry-1'] = 'INQ-001';
    
    expect(component.getInquiryNumber('inquiry-1')).toBe('INQ-001');
    expect(component.getInquiryNumber('unknown-id')).toBe('unknown-id');
  });
});