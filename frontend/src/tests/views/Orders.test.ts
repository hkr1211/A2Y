import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import Orders from '@/views/Orders.vue';
import { OrderService } from '@/services/orderService';
import { useAuthStore } from '@/stores/auth';
import type { Order } from '@/types/order';

// Mock dependencies
vi.mock('@/services/orderService');
vi.mock('@/stores/auth');
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}));

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const mockOrders: Order[] = [
  {
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
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    productName: 'Another Product',
    materialType: 'Aluminum',
    quantity: 50,
    totalPrice: 5000,
    status: 'confirmed',
    createdBy: 'user2',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('Orders.vue', () => {
  let mockAuthStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAuthStore = {
      user: { id: 'user1' },
      userRole: 'buyer',
    };
    
    (useAuthStore as any).mockReturnValue(mockAuthStore);
    
    (OrderService.getOrders as any).mockResolvedValue({
      data: mockOrders,
      total: 2,
    });
  });

  it('renders orders list correctly', async () => {
    const wrapper = shallowMount(Orders);
    
    // Wait for component to load
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.orders-container').exists()).toBe(true);
    expect(wrapper.find('.orders-header h1').exists()).toBe(true);
  });

  it('shows create button for buyers and admins', () => {
    mockAuthStore.userRole = 'buyer';
    const wrapper = shallowMount(Orders);
    
    expect(wrapper.vm.canCreateOrder).toBe(true);
  });

  it('hides create button for suppliers', () => {
    mockAuthStore.userRole = 'supplier';
    const wrapper = shallowMount(Orders);
    
    expect(wrapper.vm.canCreateOrder).toBe(false);
  });

  it('loads orders on mount', async () => {
    shallowMount(Orders);
    
    expect(OrderService.getOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('handles search correctly', async () => {
    const wrapper = shallowMount(Orders);
    
    await wrapper.setData({ searchQuery: 'test' });
    await wrapper.vm.handleSearch();
    
    expect(OrderService.getOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'test',
    });
  });

  it('handles status filter correctly', async () => {
    const wrapper = shallowMount(Orders);
    
    await wrapper.setData({ statusFilter: 'pending' });
    await wrapper.vm.handleFilter();
    
    expect(OrderService.getOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'pending',
    });
  });

  it('handles pagination correctly', async () => {
    const wrapper = shallowMount(Orders);
    
    await wrapper.vm.handleCurrentChange(2);
    
    expect(OrderService.getOrders).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
    });
  });

  it('handles page size change correctly', async () => {
    const wrapper = shallowMount(Orders);
    
    await wrapper.vm.handleSizeChange(50);
    
    expect(OrderService.getOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
    });
  });

  it('opens detail dialog when viewing order', async () => {
    const wrapper = shallowMount(Orders);
    const order = mockOrders[0];
    
    await wrapper.vm.viewOrder(order);
    
    expect(wrapper.vm.selectedOrder).toBe(order);
    expect(wrapper.vm.showDetailDialog).toBe(true);
  });

  it('opens edit dialog when editing order', async () => {
    const wrapper = shallowMount(Orders);
    const order = mockOrders[0];
    
    await wrapper.vm.editOrder(order);
    
    expect(wrapper.vm.selectedOrder).toBe(order);
    expect(wrapper.vm.showCreateDialog).toBe(true);
  });

  it('confirms order successfully', async () => {
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    (OrderService.confirmOrder as any).mockResolvedValue({});
    
    const wrapper = shallowMount(Orders);
    const order = mockOrders[0];
    
    await wrapper.vm.confirmOrder(order);
    
    expect(OrderService.confirmOrder).toHaveBeenCalledWith(order.id);
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('cancels order successfully', async () => {
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    (OrderService.cancelOrder as any).mockResolvedValue({});
    
    const wrapper = shallowMount(Orders);
    const order = mockOrders[0];
    
    await wrapper.vm.cancelOrder(order);
    
    expect(OrderService.cancelOrder).toHaveBeenCalledWith(order.id);
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('deletes order successfully', async () => {
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    (OrderService.deleteOrder as any).mockResolvedValue({});
    
    const wrapper = shallowMount(Orders);
    const order = mockOrders[0];
    
    await wrapper.vm.deleteOrder(order);
    
    expect(OrderService.deleteOrder).toHaveBeenCalledWith(order.id);
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('updates order status successfully', async () => {
    (OrderService.updateOrderStatus as any).mockResolvedValue({});
    
    const wrapper = shallowMount(Orders);
    wrapper.vm.selectedOrder = mockOrders[0];
    wrapper.vm.statusForm.status = 'confirmed';
    
    // Mock form validation
    wrapper.vm.$refs.statusFormRef = {
      validate: vi.fn().mockResolvedValue(true),
    };
    
    await wrapper.vm.handleStatusUpdate();
    
    expect(OrderService.updateOrderStatus).toHaveBeenCalledWith(mockOrders[0].id, 'confirmed');
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('handles permission checks correctly for buyers', () => {
    mockAuthStore.userRole = 'buyer';
    mockAuthStore.user = { id: 'user1' };
    
    const wrapper = shallowMount(Orders);
    const ownOrder = { ...mockOrders[0], createdBy: 'user1', status: 'pending' };
    const otherOrder = { ...mockOrders[1], createdBy: 'user2', status: 'pending' };
    
    expect(wrapper.vm.canEditOrder(ownOrder)).toBe(true);
    expect(wrapper.vm.canEditOrder(otherOrder)).toBe(false);
    expect(wrapper.vm.canConfirmOrder(ownOrder)).toBe(false);
    expect(wrapper.vm.canDeleteOrder(ownOrder)).toBe(false);
  });

  it('handles permission checks correctly for suppliers', () => {
    mockAuthStore.userRole = 'supplier';
    
    const wrapper = shallowMount(Orders);
    const pendingOrder = { ...mockOrders[0], status: 'pending' };
    const confirmedOrder = { ...mockOrders[1], status: 'confirmed' };
    
    expect(wrapper.vm.canEditOrder(pendingOrder)).toBe(false);
    expect(wrapper.vm.canConfirmOrder(pendingOrder)).toBe(true);
    expect(wrapper.vm.canUpdateStatus(confirmedOrder)).toBe(true);
    expect(wrapper.vm.canDeleteOrder(pendingOrder)).toBe(false);
  });

  it('handles permission checks correctly for admins', () => {
    mockAuthStore.userRole = 'admin';
    
    const wrapper = shallowMount(Orders);
    const order = mockOrders[0];
    
    expect(wrapper.vm.canEditOrder(order)).toBe(true);
    expect(wrapper.vm.canDeleteOrder(order)).toBe(true);
  });

  it('formats date correctly', () => {
    const wrapper = shallowMount(Orders);
    const dateString = '2024-01-01T12:00:00Z';
    
    const formatted = wrapper.vm.formatDate(dateString);
    
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('2024');
  });

  it('gets correct status tag type', () => {
    const wrapper = shallowMount(Orders);
    
    expect(wrapper.vm.getStatusTagType('pending')).toBe('warning');
    expect(wrapper.vm.getStatusTagType('confirmed')).toBe('info');
    expect(wrapper.vm.getStatusTagType('completed')).toBe('success');
    expect(wrapper.vm.getStatusTagType('cancelled')).toBe('danger');
  });

  it('handles form success correctly', async () => {
    const wrapper = shallowMount(Orders);
    wrapper.vm.showCreateDialog = true;
    wrapper.vm.selectedOrder = mockOrders[0];
    
    await wrapper.vm.handleFormSuccess();
    
    expect(wrapper.vm.showCreateDialog).toBe(false);
    expect(wrapper.vm.selectedOrder).toBe(null);
  });

  it('handles action dropdown correctly', async () => {
    const wrapper = shallowMount(Orders);
    const order = mockOrders[0];
    
    const confirmSpy = vi.spyOn(wrapper.vm, 'confirmOrder');
    const cancelSpy = vi.spyOn(wrapper.vm, 'cancelOrder');
    const deleteSpy = vi.spyOn(wrapper.vm, 'deleteOrder');
    
    await wrapper.vm.handleAction({ action: 'confirm', order });
    expect(confirmSpy).toHaveBeenCalledWith(order);
    
    await wrapper.vm.handleAction({ action: 'cancel', order });
    expect(cancelSpy).toHaveBeenCalledWith(order);
    
    await wrapper.vm.handleAction({ action: 'delete', order });
    expect(deleteSpy).toHaveBeenCalledWith(order);
    
    await wrapper.vm.handleAction({ action: 'updateStatus', order });
    expect(wrapper.vm.showStatusDialog).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Network error');
    (OrderService.getOrders as any).mockRejectedValue(error);
    
    const wrapper = shallowMount(Orders);
    
    await wrapper.vm.loadOrders();
    
    expect(ElMessage.error).toHaveBeenCalled();
  });

  it('computes available status options correctly', () => {
    const wrapper = shallowMount(Orders);
    
    // Test pending order
    wrapper.vm.selectedOrder = { ...mockOrders[0], status: 'pending' };
    let options = wrapper.vm.availableStatusOptions;
    expect(options.some((opt: any) => opt.value === 'confirmed')).toBe(true);
    expect(options.some((opt: any) => opt.value === 'cancelled')).toBe(true);
    
    // Test confirmed order
    wrapper.vm.selectedOrder = { ...mockOrders[0], status: 'confirmed' };
    options = wrapper.vm.availableStatusOptions;
    expect(options.some((opt: any) => opt.value === 'production')).toBe(true);
    expect(options.some((opt: any) => opt.value === 'cancelled')).toBe(true);
    
    // Test completed order
    wrapper.vm.selectedOrder = { ...mockOrders[0], status: 'completed' };
    options = wrapper.vm.availableStatusOptions;
    expect(options.length).toBe(0);
  });
});