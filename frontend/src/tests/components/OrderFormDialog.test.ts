import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import OrderFormDialog from '@/components/OrderFormDialog.vue';
import { OrderService } from '@/services/orderService';
import { InquiryService } from '@/services/inquiryService';
import type { Order } from '@/types/order';
import type { Inquiry } from '@/types/inquiry';

// Mock dependencies
vi.mock('@/services/orderService');
vi.mock('@/services/inquiryService');
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const mockOrder: Order = {
  id: '1',
  orderNumber: 'ORD-001',
  productName: 'Test Product',
  materialType: 'Steel',
  quantity: 100,
  totalPrice: 10000,
  status: 'pending',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockInquiries: Inquiry[] = [
  {
    id: '1',
    inquiryNumber: 'INQ-001',
    productName: 'Test Product',
    materialType: 'Steel',
    quantity: 100,
    status: 'active',
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('OrderFormDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (InquiryService.getInquiries as any).mockResolvedValue({
      data: mockInquiries,
      total: 1,
    });
  });

  it('renders dialog correctly', () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    expect(wrapper.find('.el-dialog').exists()).toBe(true);
  });

  it('shows create title when no order provided', () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    expect(wrapper.vm.dialogTitle).toBe('orders.create');
  });

  it('shows edit title when order provided', () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    expect(wrapper.vm.dialogTitle).toBe('orders.edit');
  });

  it('initializes form with order data when editing', async () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.form.productName).toBe(mockOrder.productName);
    expect(wrapper.vm.form.materialType).toBe(mockOrder.materialType);
    expect(wrapper.vm.form.quantity).toBe(mockOrder.quantity);
  });

  it('resets form when dialog opens for creation', async () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: false,
        order: null,
      },
    });
    
    // Set some form data
    wrapper.vm.form.productName = 'Test';
    
    // Open dialog
    await wrapper.setProps({ visible: true });
    
    expect(wrapper.vm.form.productName).toBe('');
  });

  it('loads inquiries on mount', async () => {
    shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    expect(InquiryService.getInquiries).toHaveBeenCalled();
  });

  it('creates order successfully', async () => {
    (OrderService.createOrder as any).mockResolvedValue(mockOrder);
    
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    // Fill form
    wrapper.vm.form = {
      productName: 'Test Product',
      materialType: 'Steel',
      quantity: 100,
      unitPrice: 100,
      totalPrice: 10000,
      description: 'Test description',
      inquiryId: '',
    };
    
    // Mock form validation
    wrapper.vm.$refs.formRef = {
      validate: vi.fn().mockResolvedValue(true),
    };
    
    await wrapper.vm.handleSubmit();
    
    expect(OrderService.createOrder).toHaveBeenCalledWith({
      productName: 'Test Product',
      materialType: 'Steel',
      quantity: 100,
      unitPrice: 100,
      totalPrice: 10000,
      description: 'Test description',
    });
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('updates order successfully', async () => {
    (OrderService.updateOrder as any).mockResolvedValue(mockOrder);
    
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    // Fill form
    wrapper.vm.form = {
      productName: 'Updated Product',
      materialType: 'Aluminum',
      quantity: 200,
      unitPrice: 50,
      totalPrice: 10000,
      description: 'Updated description',
      inquiryId: '',
    };
    
    // Mock form validation
    wrapper.vm.$refs.formRef = {
      validate: vi.fn().mockResolvedValue(true),
    };
    
    await wrapper.vm.handleSubmit();
    
    expect(OrderService.updateOrder).toHaveBeenCalledWith(mockOrder.id, {
      productName: 'Updated Product',
      materialType: 'Aluminum',
      quantity: 200,
      unitPrice: 50,
      totalPrice: 10000,
      description: 'Updated description',
    });
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('converts inquiry to order successfully', async () => {
    (OrderService.convertInquiryToOrder as any).mockResolvedValue(mockOrder);
    
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    // Fill form with inquiry
    wrapper.vm.form = {
      productName: 'Test Product',
      materialType: 'Steel',
      quantity: 100,
      unitPrice: 100,
      totalPrice: 10000,
      description: 'Test description',
      inquiryId: '1',
    };
    
    // Mock form validation
    wrapper.vm.$refs.formRef = {
      validate: vi.fn().mockResolvedValue(true),
    };
    
    await wrapper.vm.handleSubmit();
    
    expect(OrderService.convertInquiryToOrder).toHaveBeenCalledWith('1', {
      unitPrice: 100,
      totalPrice: 10000,
      description: 'Test description',
    });
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('calculates total price automatically', async () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    wrapper.vm.form.quantity = 100;
    wrapper.vm.form.unitPrice = 50;
    
    await wrapper.vm.calculateTotalPrice();
    
    expect(wrapper.vm.form.totalPrice).toBe(5000);
  });

  it('fills form from selected inquiry', async () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    await wrapper.vm.$nextTick();
    
    wrapper.vm.form.inquiryId = '1';
    await wrapper.vm.handleInquiryChange('1');
    
    expect(wrapper.vm.form.productName).toBe(mockInquiries[0].productName);
    expect(wrapper.vm.form.materialType).toBe(mockInquiries[0].materialType);
    expect(wrapper.vm.form.quantity).toBe(mockInquiries[0].quantity);
  });

  it('validates form before submission', async () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    // Mock form validation failure
    wrapper.vm.$refs.formRef = {
      validate: vi.fn().mockResolvedValue(false),
    };
    
    await wrapper.vm.handleSubmit();
    
    expect(OrderService.createOrder).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Network error');
    (OrderService.createOrder as any).mockRejectedValue(error);
    
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    wrapper.vm.form = {
      productName: 'Test Product',
      materialType: 'Steel',
      quantity: 100,
      unitPrice: 100,
      totalPrice: 10000,
      description: 'Test description',
      inquiryId: '',
    };
    
    // Mock form validation
    wrapper.vm.$refs.formRef = {
      validate: vi.fn().mockResolvedValue(true),
    };
    
    await wrapper.vm.handleSubmit();
    
    expect(ElMessage.error).toHaveBeenCalled();
  });

  it('emits success event after successful submission', async () => {
    (OrderService.createOrder as any).mockResolvedValue(mockOrder);
    
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    wrapper.vm.form = {
      productName: 'Test Product',
      materialType: 'Steel',
      quantity: 100,
      unitPrice: 100,
      totalPrice: 10000,
      description: 'Test description',
      inquiryId: '',
    };
    
    // Mock form validation
    wrapper.vm.$refs.formRef = {
      validate: vi.fn().mockResolvedValue(true),
    };
    
    await wrapper.vm.handleSubmit();
    
    expect(wrapper.emitted('success')).toBeTruthy();
  });

  it('closes dialog on cancel', async () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    await wrapper.vm.handleCancel();
    
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });

  it('resets form on cancel', async () => {
    const wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    // Set some form data
    wrapper.vm.form.productName = 'Test';
    
    // Mock form reset
    wrapper.vm.$refs.formRef = {
      resetFields: vi.fn(),
    };
    
    await wrapper.vm.handleCancel();
    
    expect(wrapper.vm.$refs.formRef.resetFields).toHaveBeenCalled();
  });

  it('computes submit button text correctly', () => {
    // Test create mode
    let wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    expect(wrapper.vm.submitButtonText).toBe('common.create');
    
    // Test edit mode
    wrapper = shallowMount(OrderFormDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    expect(wrapper.vm.submitButtonText).toBe('common.update');
  });
});