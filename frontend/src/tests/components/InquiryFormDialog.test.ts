import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import InquiryFormDialog from '@/components/InquiryFormDialog.vue';
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
    },
  };
});

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const mockInquiry: Inquiry = {
  id: '1',
  inquiryNumber: 'INQ202401010001',
  productName: 'Test Product',
  materialType: 'Steel',
  specifications: 'Test specifications',
  specialRequirements: 'Test requirements',
  quantity: 100,
  status: 'draft',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const createWrapper = (props = {}) => {
  return mount(InquiryFormDialog, {
    props: {
      visible: true,
      inquiry: null,
      ...props,
    },
    global: {
      stubs: {
        'el-dialog': true,
        'el-form': true,
        'el-form-item': true,
        'el-input': true,
        'el-input-number': true,
        'el-button': true,
      },
    },
  });
};

describe('InquiryFormDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create dialog correctly', () => {
    const wrapper = createWrapper();
    
    expect(wrapper.vm.isEditing).toBe(false);
    expect(wrapper.exists()).toBe(true);
  });

  it('renders edit dialog correctly', () => {
    const wrapper = createWrapper({
      inquiry: mockInquiry,
    });
    
    expect(wrapper.vm.isEditing).toBe(true);
    expect(wrapper.exists()).toBe(true);
  });

  it('loads inquiry data when editing', async () => {
    const wrapper = createWrapper({
      inquiry: mockInquiry,
    });
    
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.formData.productName).toBe('Test Product');
    expect(wrapper.vm.formData.materialType).toBe('Steel');
    expect(wrapper.vm.formData.specifications).toBe('Test specifications');
    expect(wrapper.vm.formData.quantity).toBe(100);
    expect(wrapper.vm.formData.specialRequirements).toBe('Test requirements');
  });

  it('resets form when dialog closes', async () => {
    const wrapper = createWrapper();
    
    // Set some form data
    wrapper.vm.formData.productName = 'test';
    wrapper.vm.formData.materialType = 'test';
    
    // Mock formRef
    wrapper.vm.formRef = {
      resetFields: vi.fn(),
    };
    
    // Close dialog
    await wrapper.vm.resetForm();
    
    expect(wrapper.vm.formData.productName).toBe('');
    expect(wrapper.vm.formData.materialType).toBe('');
  });

  it('creates inquiry successfully', async () => {
    const mockCreatedInquiry = { ...mockInquiry, id: '2', productName: 'New Product' };
    vi.mocked(InquiryService.createInquiry).mockResolvedValue(mockCreatedInquiry);
    
    const wrapper = createWrapper();
    
    // Fill form data
    wrapper.vm.formData.productName = 'New Product';
    wrapper.vm.formData.materialType = 'Aluminum';
    wrapper.vm.formData.specifications = 'New specifications';
    wrapper.vm.formData.quantity = 50;
    wrapper.vm.formData.specialRequirements = 'New requirements';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(InquiryService.createInquiry).toHaveBeenCalledWith({
      productName: 'New Product',
      materialType: 'Aluminum',
      specifications: 'New specifications',
      quantity: 50,
      specialRequirements: 'New requirements',
    });
    expect(ElMessage.success).toHaveBeenCalledWith('inquiries.createSuccess');
  });

  it('updates inquiry successfully', async () => {
    const mockUpdatedInquiry = { ...mockInquiry, productName: 'Updated Product' };
    vi.mocked(InquiryService.updateInquiry).mockResolvedValue(mockUpdatedInquiry);
    
    const wrapper = createWrapper({
      inquiry: mockInquiry,
    });
    
    // Update form data
    wrapper.vm.formData.productName = 'Updated Product';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(InquiryService.updateInquiry).toHaveBeenCalledWith('1', {
      productName: 'Updated Product',
      materialType: 'Steel',
      specifications: 'Test specifications',
      quantity: 100,
      specialRequirements: 'Test requirements',
    });
    expect(ElMessage.success).toHaveBeenCalledWith('inquiries.updateSuccess');
  });

  it('handles create error', async () => {
    vi.mocked(InquiryService.createInquiry).mockRejectedValue(new Error('Create failed'));
    
    const wrapper = createWrapper();
    
    // Fill form data
    wrapper.vm.formData.productName = 'New Product';
    wrapper.vm.formData.materialType = 'Aluminum';
    wrapper.vm.formData.specifications = 'New specifications';
    wrapper.vm.formData.quantity = 50;
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(ElMessage.error).toHaveBeenCalledWith('Create failed');
  });

  it('handles update error', async () => {
    vi.mocked(InquiryService.updateInquiry).mockRejectedValue(new Error('Update failed'));
    
    const wrapper = createWrapper({
      inquiry: mockInquiry,
    });
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(ElMessage.error).toHaveBeenCalledWith('Update failed');
  });

  it('emits success event after successful operation', async () => {
    vi.mocked(InquiryService.createInquiry).mockResolvedValue(mockInquiry);
    
    const wrapper = createWrapper();
    
    // Fill form data
    wrapper.vm.formData.productName = 'New Product';
    wrapper.vm.formData.materialType = 'Aluminum';
    wrapper.vm.formData.specifications = 'New specifications';
    wrapper.vm.formData.quantity = 50;
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(wrapper.emitted('success')).toBeTruthy();
  });

  it('shows loading state during submission', async () => {
    vi.mocked(InquiryService.createInquiry).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockInquiry), 100))
    );
    
    const wrapper = createWrapper();
    
    // Fill form data
    wrapper.vm.formData.productName = 'New Product';
    wrapper.vm.formData.materialType = 'Aluminum';
    wrapper.vm.formData.specifications = 'New specifications';
    wrapper.vm.formData.quantity = 50;
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    // Initially not submitting
    expect(wrapper.vm.submitting).toBe(false);
    
    const submitPromise = wrapper.vm.handleSubmit();
    
    await submitPromise;
    
    // After completion, should not be submitting
    expect(wrapper.vm.submitting).toBe(false);
  });

  it('computes isEditing correctly', () => {
    const createWrapper = mount(InquiryFormDialog, {
      props: {
        visible: true,
        inquiry: null,
      },
      global: {
        stubs: {
          'el-dialog': true,
          'el-form': true,
          'el-form-item': true,
          'el-input': true,
          'el-input-number': true,
          'el-button': true,
        },
      },
    });
    
    const editWrapper = mount(InquiryFormDialog, {
      props: {
        visible: true,
        inquiry: mockInquiry,
      },
      global: {
        stubs: {
          'el-dialog': true,
          'el-form': true,
          'el-form-item': true,
          'el-input': true,
          'el-input-number': true,
          'el-button': true,
        },
      },
    });
    
    expect(createWrapper.vm.isEditing).toBe(false);
    expect(editWrapper.vm.isEditing).toBe(true);
  });

  it('updates form data when inquiry prop changes', async () => {
    const wrapper = createWrapper();
    
    expect(wrapper.vm.formData.productName).toBe('');
    
    await wrapper.setProps({ inquiry: mockInquiry });
    
    expect(wrapper.vm.formData.productName).toBe('Test Product');
    expect(wrapper.vm.formData.materialType).toBe('Steel');
  });

  it('validates required fields', () => {
    const wrapper = createWrapper();
    
    const rules = wrapper.vm.formRules;
    
    expect(rules.productName).toBeDefined();
    expect(rules.materialType).toBeDefined();
    expect(rules.specifications).toBeDefined();
    expect(rules.quantity).toBeDefined();
  });
});