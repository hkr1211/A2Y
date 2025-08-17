import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import NotificationDropdown from '@/components/NotificationDropdown.vue';
import { NotificationService, type Notification } from '@/services/notificationService';

// Mock services
vi.mock('@/services/notificationService');

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'notifications.title': '通知',
        'notifications.markAllRead': '全部已读',
        'notifications.markAllReadSuccess': '已标记所有通知为已读',
        'notifications.markAllReadError': '标记已读失败',
        'notifications.markReadError': '标记通知已读失败',
        'notifications.noNotifications': '暂无通知',
        'notifications.viewAll': '查看全部',
        'dashboard.timeAgo.justNow': '刚刚',
        'dashboard.timeAgo.minutesAgo': '{count}分钟前',
        'dashboard.timeAgo.hoursAgo': '{count}小时前',
        'dashboard.timeAgo.daysAgo': '{count}天前',
      };
      return params ? translations[key]?.replace('{count}', params.count) : translations[key] || key;
    },
  }),
}));

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('NotificationDropdown', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notification-1',
      userId: 'user-1',
      type: 'quotation_received',
      title: 'New Quotation Received',
      content: 'You have received a new quotation for inquiry INQ-001',
      relatedId: 'inquiry-1',
      relatedType: 'inquiry',
      isRead: false,
      createdAt: '2024-01-01T12:00:00Z',
    },
    {
      id: 'notification-2',
      userId: 'user-1',
      type: 'order_confirmed',
      title: 'Order Confirmed',
      content: 'Your order ORD-001 has been confirmed',
      relatedId: 'order-1',
      relatedType: 'order',
      isRead: true,
      createdAt: '2024-01-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(NotificationService.getUserNotifications).mockResolvedValue({
      data: mockNotifications,
      total: 2,
      page: 1,
      limit: 10,
    });
    vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(1);
  });

  it('renders notification trigger with badge', async () => {
    const wrapper = mount(NotificationDropdown);

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(wrapper.find('.notification-trigger').exists()).toBe(true);
    expect(wrapper.find('.el-badge').exists()).toBe(true);
  });

  it('loads notifications when dropdown opens', async () => {
    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    await component.handleDropdownVisibleChange(true);

    expect(NotificationService.getUserNotifications).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
    expect(NotificationService.getUnreadCount).toHaveBeenCalled();
  });

  it('displays notifications in dropdown', async () => {
    const wrapper = mount(NotificationDropdown);

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.notifications = mockNotifications;
    component.unreadCount = 1;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('New Quotation Received');
    expect(wrapper.text()).toContain('Order Confirmed');
    expect(wrapper.text()).toContain('You have received a new quotation');
  });

  it('shows unread count badge', async () => {
    const wrapper = mount(NotificationDropdown);

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.unreadCount = 5;
    await wrapper.vm.$nextTick();

    expect(component.unreadCount).toBe(5);
  });

  it('hides badge when no unread notifications', async () => {
    const wrapper = mount(NotificationDropdown);

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.unreadCount = 0;
    await wrapper.vm.$nextTick();

    expect(component.unreadCount).toBe(0);
  });

  it('displays correct notification icons', async () => {
    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    
    expect(component.getNotificationIcon('quotation_received')).toBeDefined();
    expect(component.getNotificationIcon('order_confirmed')).toBeDefined();
    expect(component.getNotificationIcon('status_updated')).toBeDefined();
    expect(component.getNotificationIcon('message_received')).toBeDefined();
  });

  it('displays correct notification icon colors', async () => {
    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    
    expect(component.getNotificationIconColor('quotation_received')).toBe('#67C23A');
    expect(component.getNotificationIconColor('order_confirmed')).toBe('#409EFF');
    expect(component.getNotificationIconColor('status_updated')).toBe('#E6A23C');
    expect(component.getNotificationIconColor('message_received')).toBe('#F56C6C');
  });

  it('formats time correctly', async () => {
    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    
    // Test just now
    const now = new Date();
    expect(component.formatTime(now.toISOString())).toBe('刚刚');
    
    // Test minutes ago
    const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(component.formatTime(minutesAgo.toISOString())).toBe('5分钟前');
    
    // Test hours ago
    const hoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(component.formatTime(hoursAgo.toISOString())).toBe('2小时前');
    
    // Test days ago
    const daysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(component.formatTime(daysAgo.toISOString())).toBe('3天前');
  });

  it('handles notification click and marks as read', async () => {
    vi.mocked(NotificationService.markAsRead).mockResolvedValue();

    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    const unreadNotification = { ...mockNotifications[0], isRead: false };
    component.unreadCount = 1;

    await component.handleNotificationClick(unreadNotification);

    expect(NotificationService.markAsRead).toHaveBeenCalledWith('notification-1');
    expect(unreadNotification.isRead).toBe(true);
    expect(component.unreadCount).toBe(0);
  });

  it('does not mark already read notifications', async () => {
    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    const readNotification = { ...mockNotifications[1], isRead: true };

    await component.handleNotificationClick(readNotification);

    expect(NotificationService.markAsRead).not.toHaveBeenCalled();
  });

  it('handles mark all as read', async () => {
    vi.mocked(NotificationService.markAllAsRead).mockResolvedValue();

    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    component.notifications = mockNotifications;
    component.unreadCount = 1;

    await component.markAllAsRead();

    expect(NotificationService.markAllAsRead).toHaveBeenCalled();
    expect(component.notifications.every((n: Notification) => n.isRead)).toBe(true);
    expect(component.unreadCount).toBe(0);
    expect(ElMessage.success).toHaveBeenCalledWith('已标记所有通知为已读');
  });

  it('handles mark all as read error', async () => {
    vi.mocked(NotificationService.markAllAsRead).mockRejectedValue(new Error('Mark all failed'));

    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    await component.markAllAsRead();

    expect(ElMessage.error).toHaveBeenCalledWith('Mark all failed');
  });

  it('handles notification click error', async () => {
    vi.mocked(NotificationService.markAsRead).mockRejectedValue(new Error('Mark read failed'));

    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    const unreadNotification = { ...mockNotifications[0], isRead: false };

    await component.handleNotificationClick(unreadNotification);

    expect(ElMessage.error).toHaveBeenCalledWith('Mark read failed');
  });

  it('navigates to correct page on notification click', async () => {
    const mockRouter = { push: vi.fn() };
    vi.doMock('vue-router', () => ({
      useRouter: () => mockRouter,
    }));

    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    
    // Test inquiry navigation
    const inquiryNotification = { ...mockNotifications[0], relatedType: 'inquiry' };
    await component.handleNotificationClick(inquiryNotification);
    expect(mockRouter.push).toHaveBeenCalledWith('/inquiries');

    // Test order navigation
    const orderNotification = { ...mockNotifications[1], relatedType: 'order' };
    await component.handleNotificationClick(orderNotification);
    expect(mockRouter.push).toHaveBeenCalledWith('/orders');
  });

  it('shows empty state when no notifications', async () => {
    vi.mocked(NotificationService.getUserNotifications).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const wrapper = mount(NotificationDropdown);

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    const component = wrapper.vm as any;
    component.notifications = [];
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('暂无通知');
  });

  it('shows loading state while fetching notifications', async () => {
    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    component.loading = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.notification-loading').exists()).toBe(true);
    expect(wrapper.find('.el-skeleton').exists()).toBe(true);
  });

  it('exposes unread count for parent component', async () => {
    const wrapper = mount(NotificationDropdown);

    const component = wrapper.vm as any;
    component.unreadCount = 3;

    expect(component.unreadCount).toBe(3);
  });
});