import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import Inquiries from '@/views/Inquiries.vue';
import { InquiryService } from '@/services/inquiryService';
import type { Inquiry } from '@/types/inquiry';

// Mock dependencies
vi.mock('@/services/inquiryService');
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  };
});

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (params && key.includes('{inquiryNumber}')) {
        return key.replace('{inquiryNumber}', params.inquiryNumber);
      }
      return key;
    },
  }),
}));

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    userRole: 'buyer',
    userId: 'user1',
  }),
}));

// Mock components
vi.mock('@/components/InquiryFormDialog.vue', () => ({
  default: {
    name: 'InquiryFormDialog',
    template: '<div data-testid="inquiry-form-dialog"></div>',
    props: ['visible', 'inquiry'],
    emits: ['update:visible', 'success'],
  },
}));

vi.mock('@/components/InquiryDetailDialog.vue', () => ({
  default: {
    name: 'InquiryDetailDialog',
    template: '<div data-testid="inquiry-detail-dialog"></div>',
    props: ['visible', 'inquiry'],
    emits: ['update:visible'],
  },
}));

const mockInquiries: Inquiry[] = [
  {
    id: '1',
    inquiryNumber: 'INQ202401010001',
    productName: 'Test Product 1',
    materialType: 'Steel',
    specifications: 'Test specifications 1',
    specialRequirements: 'Test requirements 1',
    quantity: 100,
    status: 'draft',
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    inquiryNumber: 'INQ202401010002',
    productName: 'Test Product 2',
    materialType: 'Aluminum',
    specifications: 'Test specifications 2',
    quantity: 200,
    status: 'published',
    createdBy: 'user1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockPaginatedResponse = {
  items: mockInquiries,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
};

const createWrapper = () => {
  return mount(Inquiries, {
    global: {
      stubs: {
        'el-table': true,
        'el-table-column': true,
        'el-button': true,
        'el-input': true,
        'el-select': true,
        'el-option': true,
        'el-tag': true,
        'el-pagination': true,
        'el-dropdown': true,
        'el-dropdown-menu': true,
        'el-dropdown-item': true,
        'InquiryFormDialog': true,
        'InquiryDetailDialog': true,
      },
    },
  });
};

describe('Inquiries.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(InquiryService.getInquiries).mockResolvedValue(mockPaginatedResponse);
  });

  it('renders inquiry management page correctly', async () => {
    const wrapper = createWrapper();
    
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.vm.inquiries).toEqual([]);
  });

  it('loads inquiries on mount', async () => {
    createWrapper();
    
    expect(InquiryService.getInquiries).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('displays inquiries in table', async () => {
    const wrapper = createWrapper();
    
    // Wait for inquiries to load
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.inquiries).toEqual(mockInquiries);
  });

  it('handles search functionality', async () => {
    const wrapper = createWrapper();
    
    // Simulate search input change
    wrapper.vm.searchQuery = 'test';
    await wrapper.vm.handleSearch();
    
    expect(InquiryService.getInquiries).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'test',
    });
  });

  it('handles status filter', async () => {
    const wrapper = createWrapper();
    
    // Simulate status filter change
    wrapper.vm.statusFilter = 'published';
    await wrapper.vm.handleFilter();
    
    expect(InquiryService.getInquiries).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'published',
    });
  });

  it('resets filters correctly', async () => {
    const wrapper = createWrapper();
    
    // Set some filters
    wrapper.vm.searchQuery = 'test';
    wrapper.vm.statusFilter = 'published';
    
    // Reset filters
    await wrapper.vm.resetFilters();
    
    expect(wrapper.vm.searchQuery).toBe('');
    expect(wrapper.vm.statusFilter).toBe('');
    expect(InquiryService.getInquiries).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('handles pagination', async () => {
    const wrapper = createWrapper();
    
    // Simulate page change
    await wrapper.vm.handleCurrentChange(2);
    
    expect(wrapper.vm.currentPage).toBe(2);
    expect(InquiryService.getInquiries).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
    });
  });

  it('handles page size change', async () => {
    const wrapper = createWrapper();
    
    // Simulate page size change
    await wrapper.vm.handleSizeChange(50);
    
    expect(wrapper.vm.pageSize).toBe(50);
    expect(wrapper.vm.currentPage).toBe(1);
    expect(InquiryService.getInquiries).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
    });
  });

  it('opens create dialog', async () => {
    const wrapper = createWrapper();
    
    wrapper.vm.showCreateDialog = true;
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.showCreateDialog).toBe(true);
  });

  it('opens edit dialog with inquiry data', async () => {
    const wrapper = createWrapper();
    
    await wrapper.vm.editInquiry(mockInquiries[0]);
    
    expect(wrapper.vm.showEditDialog).toBe(true);
    expect(wrapper.vm.editingInquiry).toEqual(mockInquiries[0]);
  });

  it('opens detail dialog with inquiry data', async () => {
    const wrapper = createWrapper();
    
    await wrapper.vm.viewInquiry(mockInquiries[0]);
    
    expect(wrapper.vm.showDetailDialog).toBe(true);
    expect(wrapper.vm.viewingInquiry).toEqual(mockInquiries[0]);
  });

  it('handles inquiry publishing with confirmation', async () => {
    vi.mocked(InquiryService.publishInquiry).mockResolvedValue({
      ...mockInquiries[0],
      status: 'published',
    });
    
    const wrapper = createWrapper();
    
    await wrapper.vm.handleCommand({
      action: 'publish',
      inquiry: mockInquiries[0],
    });
    
    expect(InquiryService.publishInquiry).toHaveBeenCalledWith('1');
    expect(ElMessage.success).toHaveBeenCalledWith('inquiries.publishSuccess');
  });

  it('handles inquiry cancellation with confirmation', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(InquiryService.cancelInquiry).mockResolvedValue({
      ...mockInquiries[0],
      status: 'cancelled',
    });
    
    const wrapper = createWrapper();
    
    await wrapper.vm.handleCommand({
      action: 'cancel',
      inquiry: mockInquiries[0],
    });
    
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      'inquiries.cancelConfirm',
      'inquiries.cancel',
      expect.any(Object)
    );
    expect(InquiryService.cancelInquiry).toHaveBeenCalledWith('1');
    expect(ElMessage.success).toHaveBeenCalledWith('inquiries.cancelSuccess');
  });

  it('handles inquiry deletion with confirmation', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(InquiryService.deleteInquiry).mockResolvedValue();
    
    const wrapper = createWrapper();
    
    await wrapper.vm.handleCommand({
      action: 'delete',
      inquiry: mockInquiries[0],
    });
    
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      'inquiries.deleteConfirm',
      'inquiries.delete',
      expect.any(Object)
    );
    expect(InquiryService.deleteInquiry).toHaveBeenCalledWith('1');
    expect(ElMessage.success).toHaveBeenCalledWith('inquiries.deleteSuccess');
  });

  it('handles command cancellation', async () => {
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel');
    
    const wrapper = createWrapper();
    
    await wrapper.vm.handleCommand({
      action: 'cancel',
      inquiry: mockInquiries[0],
    });
    
    expect(InquiryService.cancelInquiry).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });

  it('handles command error', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(InquiryService.cancelInquiry).mockRejectedValue(new Error('Cancel failed'));
    
    const wrapper = createWrapper();
    
    await wrapper.vm.handleCommand({
      action: 'cancel',
      inquiry: mockInquiries[0],
    });
    
    expect(ElMessage.error).toHaveBeenCalledWith('Cancel failed');
  });

  it('handles inquiry creation success', async () => {
    const wrapper = createWrapper();
    
    wrapper.vm.showCreateDialog = true;
    await wrapper.vm.handleInquiryCreated();
    
    expect(wrapper.vm.showCreateDialog).toBe(false);
    expect(InquiryService.getInquiries).toHaveBeenCalled();
  });

  it('handles inquiry update success', async () => {
    const wrapper = createWrapper();
    
    wrapper.vm.showEditDialog = true;
    wrapper.vm.editingInquiry = mockInquiries[0];
    
    await wrapper.vm.handleInquiryUpdated();
    
    expect(wrapper.vm.showEditDialog).toBe(false);
    expect(wrapper.vm.editingInquiry).toBe(null);
    expect(InquiryService.getInquiries).toHaveBeenCalled();
  });

  it('checks edit permissions correctly', () => {
    const wrapper = createWrapper();
    
    // User can edit their own draft/published inquiries
    expect(wrapper.vm.canEditInquiry(mockInquiries[0])).toBe(true); // draft
    expect(wrapper.vm.canEditInquiry(mockInquiries[1])).toBe(true); // published
    
    // User cannot edit replied/converted/cancelled inquiries
    const repliedInquiry = { ...mockInquiries[0], status: 'replied' as const };
    expect(wrapper.vm.canEditInquiry(repliedInquiry)).toBe(false);
  });

  it('checks publish permissions correctly', () => {
    const wrapper = createWrapper();
    
    // User can publish their own draft inquiries
    expect(wrapper.vm.canPublishInquiry(mockInquiries[0])).toBe(true); // draft
    
    // User cannot publish already published inquiries
    expect(wrapper.vm.canPublishInquiry(mockInquiries[1])).toBe(false); // published
  });

  it('checks cancel permissions correctly', () => {
    const wrapper = createWrapper();
    
    // User can cancel their own non-cancelled/non-converted inquiries
    expect(wrapper.vm.canCancelInquiry(mockInquiries[0])).toBe(true); // draft
    expect(wrapper.vm.canCancelInquiry(mockInquiries[1])).toBe(true); // published
    
    // User cannot cancel already cancelled inquiries
    const cancelledInquiry = { ...mockInquiries[0], status: 'cancelled' as const };
    expect(wrapper.vm.canCancelInquiry(cancelledInquiry)).toBe(false);
  });

  it('returns correct status tag type', () => {
    const wrapper = createWrapper();
    
    expect(wrapper.vm.getStatusTagType('draft')).toBe('info');
    expect(wrapper.vm.getStatusTagType('published')).toBe('primary');
    expect(wrapper.vm.getStatusTagType('replied')).toBe('success');
    expect(wrapper.vm.getStatusTagType('converted')).toBe('warning');
    expect(wrapper.vm.getStatusTagType('cancelled')).toBe('danger');
  });

  it('formats date correctly', () => {
    const wrapper = createWrapper();
    const dateString = '2024-01-01T00:00:00Z';
    
    const formatted = wrapper.vm.formatDate(dateString);
    
    expect(formatted).toBe(new Date(dateString).toLocaleString());
  });

  it('handles API error when loading inquiries', async () => {
    vi.mocked(InquiryService.getInquiries).mockRejectedValue(new Error('API Error'));
    
    createWrapper();
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(ElMessage.error).toHaveBeenCalledWith('API Error');
  });

  it('computes canCreateInquiry correctly for buyer', () => {
    const wrapper = createWrapper();
    
    expect(wrapper.vm.canCreateInquiry).toBe(true);
  });
});