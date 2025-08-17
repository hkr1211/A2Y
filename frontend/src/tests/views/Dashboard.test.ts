import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import ElementPlus, { ElMessage } from 'element-plus';
import Dashboard from '@/views/Dashboard.vue';
import { DashboardService } from '@/services/dashboardService';
import { messages } from '@/locales';
import type { DashboardData, UserStatistics, SystemHealth } from '@/services/dashboardService';

// Mock Element Plus message
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock DashboardService
vi.mock('@/services/dashboardService', () => ({
  DashboardService: {
    getDashboardData: vi.fn(),
    getUserStatistics: vi.fn(),
    getSystemHealth: vi.fn(),
  },
}));

const mockDashboardService = vi.mocked(DashboardService);

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/dashboard', component: Dashboard },
    { path: '/users', component: { template: '<div>Users</div>' } },
    { path: '/inquiries', component: { template: '<div>Inquiries</div>' } },
    { path: '/orders', component: { template: '<div>Orders</div>' } },
  ],
});

// Create i18n
const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'zh',
  messages,
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = (routeQuery = {}) => {
    router.push({ path: '/dashboard', query: routeQuery });
    return mount(Dashboard, {
      global: {
        plugins: [router, i18n, ElementPlus],
      },
    });
  };

  const mockAdminDashboardData: DashboardData = {
    userRole: 'admin',
    availableFeatures: [
      'user_management',
      'inquiry_management',
      'quotation_management',
      'order_management',
      'system_settings',
      'reports',
      'file_management',
      'notification_management'
    ],
    statistics: {
      totalUsers: 10,
      totalInquiries: 25,
      pendingQuotations: 5,
      activeOrders: 8,
    },
    recentActivities: [
      {
        id: '1',
        type: 'user_created',
        description: 'New buyer user "testuser" was created',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        relatedId: 'user1',
      },
      {
        id: '2',
        type: 'inquiry_created',
        description: 'New inquiry INQ-001 was created',
        timestamp: new Date('2024-01-01T09:00:00Z'),
        relatedId: 'inquiry1',
      },
    ],
  };

  const mockBuyerDashboardData: DashboardData = {
    userRole: 'buyer',
    availableFeatures: [
      'inquiry_management',
      'quotation_view',
      'order_management',
      'file_management',
      'chat_communication',
      'profile_settings'
    ],
    statistics: {
      totalInquiries: 15,
      activeOrders: 3,
    },
    recentActivities: [
      {
        id: '1',
        type: 'quotation_received',
        description: 'New quotation received for INQ-001',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        relatedId: 'quotation1',
      },
    ],
  };

  const mockSupplierDashboardData: DashboardData = {
    userRole: 'supplier',
    availableFeatures: [
      'inquiry_view',
      'quotation_management',
      'order_tracking',
      'file_management',
      'chat_communication',
      'profile_settings'
    ],
    statistics: {
      pendingQuotations: 7,
      activeOrders: 5,
    },
    recentActivities: [
      {
        id: '1',
        type: 'order_confirmed',
        description: 'Order ORD-001 was confirmed',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        relatedId: 'order1',
      },
    ],
  };

  const mockUserStats: UserStatistics = {
    total: 10,
    byRole: { admin: 1, buyer: 5, supplier: 4 },
    byCompany: { admin: 1, arroz: 5, yunjie: 4 },
    byLanguage: { zh: 6, ja: 4 },
    recentUsers: [
      {
        id: '1',
        username: 'testuser',
        role: 'buyer',
        company: 'arroz',
        createdAt: '2024-01-01T10:00:00Z',
      },
    ],
  };

  const mockSystemHealth: SystemHealth = {
    status: 'healthy',
    timestamp: '2024-01-01T10:00:00Z',
    services: {
      database: { status: 'healthy', userCount: 10 },
      redis: { status: 'not_implemented', message: 'Redis not implemented' },
      fileSystem: { status: 'not_implemented', message: 'File system not implemented' },
    },
    uptime: 3600,
    memory: { used: 50000000, total: 100000000, external: 5000000 },
  };

  describe('Loading and Error States', () => {
    it('should show loading skeleton while fetching data', async () => {
      mockDashboardService.getDashboardData.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAdminDashboardData), 100))
      );

      const wrapper = createWrapper();
      
      expect(wrapper.find('.loading-container').exists()).toBe(true);
      expect(wrapper.find('.el-skeleton').exists()).toBe(true);
    });

    it('should show error alert when data loading fails', async () => {
      const errorMessage = 'Failed to load dashboard data';
      mockDashboardService.getDashboardData.mockRejectedValue(new Error(errorMessage));

      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find('.error-alert').exists()).toBe(true);
      expect(wrapper.text()).toContain('加载仪表板数据失败');
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockDashboardService.getDashboardData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockAdminDashboardData);

      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find('.error-alert').exists()).toBe(true);

      const retryButton = wrapper.find('.error-alert button');
      await retryButton.trigger('click');
      await flushPromises();

      expect(wrapper.find('.dashboard-content').exists()).toBe(true);
      expect(mockDashboardService.getDashboardData).toHaveBeenCalledTimes(2);
    });

    it('should show access denied alert when redirected with error query', async () => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);

      // Navigate to the route with error query first
      await router.push({ path: '/dashboard', query: { error: 'access_denied' } });
      
      const wrapper = mount(Dashboard, {
        global: {
          plugins: [router, i18n, ElementPlus],
        },
      });
      
      await flushPromises();

      expect(wrapper.find('.access-denied-alert').exists()).toBe(true);
    });
  });

  describe('Admin Dashboard', () => {
    beforeEach(() => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);
      mockDashboardService.getUserStatistics.mockResolvedValue(mockUserStats);
      mockDashboardService.getSystemHealth.mockResolvedValue(mockSystemHealth);
    });

    it('should render admin dashboard with all statistics', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('欢迎回来，超级管理员');
      expect(wrapper.text()).toContain('10'); // Total users
      expect(wrapper.text()).toContain('25'); // Total inquiries
      expect(wrapper.text()).toContain('5'); // Pending quotations
      expect(wrapper.text()).toContain('8'); // Active orders
    });

    it('should show admin-specific features', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('用户管理');
      expect(wrapper.text()).toContain('系统设置');
      expect(wrapper.text()).toContain('报表分析');
      expect(wrapper.text()).toContain('通知管理');
    });

    it('should display user statistics for admin', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('用户统计');
      expect(wrapper.text()).toContain('按角色分布');
      expect(wrapper.text()).toContain('按公司分布');
      expect(wrapper.text()).toContain('超级管理员: 1');
      expect(wrapper.text()).toContain('买方用户: 5');
    });

    it('should display system health for admin', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('系统健康状态');
      expect(wrapper.text()).toContain('健康');
      expect(wrapper.text()).toContain('数据库');
    });

    it('should handle admin data loading errors gracefully', async () => {
      mockDashboardService.getUserStatistics.mockRejectedValue(new Error('Stats error'));
      mockDashboardService.getSystemHealth.mockRejectedValue(new Error('Health error'));

      const wrapper = createWrapper();
      await flushPromises();

      // Should still show main dashboard content
      expect(wrapper.find('.dashboard-content').exists()).toBe(true);
      // Admin sections should still be present but without data
      expect(wrapper.text()).toContain('用户统计');
      expect(wrapper.text()).toContain('系统健康状态');
    });
  });

  describe('Buyer Dashboard', () => {
    beforeEach(() => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockBuyerDashboardData);
    });

    it('should render buyer dashboard with relevant statistics', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('欢迎回来，买方用户');
      expect(wrapper.text()).toContain('15'); // Total inquiries
      expect(wrapper.text()).toContain('3'); // Active orders
      expect(wrapper.text()).not.toContain('总用户数'); // Should not show admin stats
    });

    it('should show buyer-specific features', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('询单管理');
      expect(wrapper.text()).toContain('报价查看');
      expect(wrapper.text()).toContain('订单管理');
      expect(wrapper.text()).not.toContain('用户管理'); // Should not show admin features
    });

    it('should not show admin-only sections', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Check that admin-specific sections are not present
      expect(wrapper.find('.admin-section').exists()).toBe(false);
      expect(wrapper.find('.user-stats-card').exists()).toBe(false);
      expect(wrapper.find('.health-card').exists()).toBe(false);
    });
  });

  describe('Supplier Dashboard', () => {
    beforeEach(() => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockSupplierDashboardData);
    });

    it('should render supplier dashboard with relevant statistics', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('欢迎回来，供应商用户');
      expect(wrapper.text()).toContain('7'); // Pending quotations
      expect(wrapper.text()).toContain('5'); // Active orders
      expect(wrapper.text()).not.toContain('总询单数'); // Should not show buyer stats
    });

    it('should show supplier-specific features', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('询单查看');
      expect(wrapper.text()).toContain('报价管理');
      expect(wrapper.text()).toContain('订单跟踪');
      expect(wrapper.text()).not.toContain('询单管理'); // Should not show buyer features
    });
  });

  describe('Feature Navigation', () => {
    beforeEach(() => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);
    });

    it('should navigate to feature when enabled feature card is clicked', async () => {
      const routerPush = vi.spyOn(router, 'push');
      const wrapper = createWrapper();
      await flushPromises();

      const userManagementCard = wrapper.find('.feature-card');
      await userManagementCard.trigger('click');

      expect(routerPush).toHaveBeenCalledWith('/users');
    });

    it('should show info message when disabled feature is clicked', async () => {
      // Mock dashboard data with a disabled feature
      const dashboardDataWithDisabled = {
        ...mockAdminDashboardData,
        availableFeatures: ['user_management'], // Only one feature enabled
      };
      mockDashboardService.getDashboardData.mockResolvedValue(dashboardDataWithDisabled);

      const wrapper = createWrapper();
      await flushPromises();

      // Find a disabled feature card (should have feature-disabled class)
      const disabledCards = wrapper.findAll('.feature-disabled');
      if (disabledCards.length > 0) {
        await disabledCards[0].trigger('click');
        expect(ElMessage.info).toHaveBeenCalledWith('该功能暂未开放');
      }
    });
  });

  describe('Recent Activities', () => {
    beforeEach(() => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);
    });

    it('should display recent activities with correct formatting', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('最近活动');
      expect(wrapper.text()).toContain('New buyer user "testuser" was created');
      expect(wrapper.text()).toContain('New inquiry INQ-001 was created');
    });

    it('should show empty state when no activities', async () => {
      const emptyActivitiesData = {
        ...mockAdminDashboardData,
        recentActivities: [],
      };
      mockDashboardService.getDashboardData.mockResolvedValue(emptyActivitiesData);

      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.text()).toContain('暂无活动记录');
    });

    it('should format activity timestamps correctly', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      // Check that timestamps are formatted (exact format depends on current time)
      const activityItems = wrapper.findAll('.activity-item');
      expect(activityItems.length).toBeGreaterThan(0);
      
      activityItems.forEach(item => {
        expect(item.find('.activity-time').exists()).toBe(true);
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);
    });

    it('should apply responsive classes correctly', async () => {
      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find('.stats-grid').exists()).toBe(true);
      expect(wrapper.find('.features-grid').exists()).toBe(true);
    });
  });

  describe('Internationalization', () => {
    it('should display Japanese translations when locale is ja', async () => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);

      const jaI18n = createI18n({
        legacy: false,
        locale: 'ja',
        fallbackLocale: 'zh',
        messages,
      });

      const wrapper = mount(Dashboard, {
        global: {
          plugins: [router, jaI18n, ElementPlus],
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain('ダッシュボード');
      expect(wrapper.text()).toContain('おかえりなさい');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      mockDashboardService.getDashboardData.mockRejectedValue(networkError);

      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find('.error-alert').exists()).toBe(true);
      expect(wrapper.text()).toContain('加载仪表板数据失败');
    });

    it('should handle API errors with specific messages', async () => {
      const apiError = {
        response: {
          data: {
            error: {
              message: 'Unauthorized access',
            },
          },
        },
      };
      mockDashboardService.getDashboardData.mockRejectedValue(apiError);

      const wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find('.error-alert').exists()).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should load dashboard data on mount', async () => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);

      createWrapper();
      await flushPromises();

      expect(mockDashboardService.getDashboardData).toHaveBeenCalledTimes(1);
    });

    it('should load admin data when user is admin', async () => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockAdminDashboardData);
      mockDashboardService.getUserStatistics.mockResolvedValue(mockUserStats);
      mockDashboardService.getSystemHealth.mockResolvedValue(mockSystemHealth);

      createWrapper();
      await flushPromises();

      expect(mockDashboardService.getUserStatistics).toHaveBeenCalledTimes(1);
      expect(mockDashboardService.getSystemHealth).toHaveBeenCalledTimes(1);
    });

    it('should not load admin data when user is not admin', async () => {
      mockDashboardService.getDashboardData.mockResolvedValue(mockBuyerDashboardData);

      createWrapper();
      await flushPromises();

      expect(mockDashboardService.getUserStatistics).not.toHaveBeenCalled();
      expect(mockDashboardService.getSystemHealth).not.toHaveBeenCalled();
    });
  });
});