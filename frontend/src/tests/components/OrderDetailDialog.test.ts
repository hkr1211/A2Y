import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import OrderDetailDialog from '@/components/OrderDetailDialog.vue';
import type { Order } from '@/types/order';

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
  description: 'Test order description',
  unitPrice: 100,
  supplierName: 'Test Supplier',
  buyerName: 'Test Buyer',
};

describe('OrderDetailDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog correctly', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    expect(wrapper.find('.el-dialog').exists()).toBe(true);
  });

  it('displays order information correctly', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    expect(wrapper.text()).toContain(mockOrder.orderNumber);
    expect(wrapper.text()).toContain(mockOrder.productName);
    expect(wrapper.text()).toContain(mockOrder.materialType);
  });

  it('formats price correctly', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    const formattedPrice = wrapper.vm.formatPrice(mockOrder.totalPrice);
    expect(formattedPrice).toBe('¥10,000.00');
  });

  it('formats date correctly', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    const formatted = wrapper.vm.formatDate(mockOrder.createdAt);
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('2024');
  });

  it('gets correct status tag type', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    expect(wrapper.vm.getStatusTagType('pending')).toBe('warning');
    expect(wrapper.vm.getStatusTagType('confirmed')).toBe('info');
    expect(wrapper.vm.getStatusTagType('completed')).toBe('success');
    expect(wrapper.vm.getStatusTagType('cancelled')).toBe('danger');
  });

  it('gets correct status label', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    expect(wrapper.vm.getStatusLabel('pending')).toBe('orders.status.pending');
    expect(wrapper.vm.getStatusLabel('confirmed')).toBe('orders.status.confirmed');
    expect(wrapper.vm.getStatusLabel('completed')).toBe('orders.status.completed');
    expect(wrapper.vm.getStatusLabel('cancelled')).toBe('orders.status.cancelled');
  });

  it('handles null order gracefully', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    expect(wrapper.find('.order-detail-content').exists()).toBe(false);
  });

  it('emits close event when dialog is closed', async () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    await wrapper.vm.handleClose();
    
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    expect(wrapper.emitted('update:visible')![0]).toEqual([false]);
  });

  it('displays all order fields when available', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    const text = wrapper.text();
    expect(text).toContain(mockOrder.orderNumber);
    expect(text).toContain(mockOrder.productName);
    expect(text).toContain(mockOrder.materialType);
    expect(text).toContain(mockOrder.quantity.toString());
    expect(text).toContain(mockOrder.description);
  });

  it('handles missing optional fields gracefully', () => {
    const orderWithoutOptionalFields: Order = {
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
    
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: orderWithoutOptionalFields,
      },
    });
    
    expect(wrapper.find('.order-detail-content').exists()).toBe(true);
  });

  it('computes dialog title correctly', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    expect(wrapper.vm.dialogTitle).toBe('orders.detail');
  });

  it('shows loading state when order is null', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: null,
      },
    });
    
    expect(wrapper.find('.order-detail-loading').exists()).toBe(true);
  });

  it('displays status with correct styling', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    const statusTag = wrapper.find('.status-tag');
    expect(statusTag.exists()).toBe(true);
  });

  it('formats large numbers correctly', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: mockOrder,
      },
    });
    
    const largePrice = 1234567.89;
    const formatted = wrapper.vm.formatPrice(largePrice);
    expect(formatted).toBe('¥1,234,567.89');
  });

  it('handles zero values correctly', () => {
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: { ...mockOrder, totalPrice: 0 },
      },
    });
    
    const formatted = wrapper.vm.formatPrice(0);
    expect(formatted).toBe('¥0.00');
  });

  it('displays order timeline when available', () => {
    const orderWithTimeline = {
      ...mockOrder,
      timeline: [
        {
          status: 'pending',
          timestamp: '2024-01-01T00:00:00Z',
          description: 'Order created',
        },
        {
          status: 'confirmed',
          timestamp: '2024-01-02T00:00:00Z',
          description: 'Order confirmed',
        },
      ],
    };
    
    const wrapper = shallowMount(OrderDetailDialog, {
      props: {
        visible: true,
        order: orderWithTimeline,
      },
    });
    
    expect(wrapper.find('.order-timeline').exists()).toBe(true);
  });
});