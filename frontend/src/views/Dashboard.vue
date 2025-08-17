<template>
  <div class="dashboard-container">
    <!-- Access denied alert -->
    <el-alert
      v-if="showAccessDeniedAlert"
      :title="$t('errors.accessDenied')"
      type="warning"
      :closable="true"
      @close="showAccessDeniedAlert = false"
      class="access-denied-alert"
    />

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- Error state -->
    <el-alert
      v-else-if="error"
      :title="$t('dashboard.loadError')"
      :description="error"
      type="error"
      :closable="false"
      class="error-alert"
    >
      <template #default>
        <el-button @click="loadDashboardData" type="primary" size="small">
          {{ $t('common.retry') }}
        </el-button>
      </template>
    </el-alert>

    <!-- Dashboard content -->
    <div v-else class="dashboard-content">
      <!-- Welcome header -->
      <div class="welcome-header">
        <h1>{{ $t('dashboard.title') }}</h1>
        <p class="welcome-message">
          {{ $t('dashboard.welcomeMessage', { role: $t(`header.roles.${dashboardData?.userRole}`) }) }}
        </p>
      </div>

      <!-- Statistics cards -->
      <div class="statistics-section">
        <h2>{{ $t('dashboard.statistics') }}</h2>
        <div class="stats-grid">
          <!-- Admin statistics -->
          <template v-if="dashboardData?.userRole === 'admin'">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon admin-icon">
                  <el-icon><User /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ dashboardData.statistics.totalUsers || 0 }}</div>
                  <div class="stat-label">{{ $t('dashboard.totalUsers') }}</div>
                </div>
              </div>
            </el-card>
          </template>

          <!-- Common statistics for all roles -->
          <el-card v-if="showInquiryStats" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon inquiry-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ dashboardData?.statistics.totalInquiries || 0 }}</div>
                <div class="stat-label">{{ $t('dashboard.totalInquiries') }}</div>
              </div>
            </div>
          </el-card>

          <el-card v-if="showQuotationStats" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon quotation-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ dashboardData?.statistics.pendingQuotations || 0 }}</div>
                <div class="stat-label">{{ $t('dashboard.pendingQuotations') }}</div>
              </div>
            </div>
          </el-card>

          <el-card v-if="showOrderStats" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon order-icon">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ dashboardData?.statistics.activeOrders || 0 }}</div>
                <div class="stat-label">{{ $t('dashboard.activeOrders') }}</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- Feature navigation -->
      <div class="features-section">
        <h2>{{ $t('dashboard.quickAccess') }}</h2>
        <div class="features-grid">
          <el-card
            v-for="feature in availableFeatureCards"
            :key="feature.key"
            class="feature-card"
            :class="{ 'feature-disabled': !feature.enabled }"
            @click="navigateToFeature(feature)"
          >
            <div class="feature-content">
              <div class="feature-icon" :class="feature.iconClass">
                <el-icon>
                  <component :is="feature.icon" />
                </el-icon>
              </div>
              <div class="feature-info">
                <div class="feature-title">{{ $t(feature.title) }}</div>
                <div class="feature-description">{{ $t(feature.description) }}</div>
              </div>
              <div v-if="!feature.enabled" class="feature-badge">
                <el-tag size="small" type="info">{{ $t('dashboard.comingSoon') }}</el-tag>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- Recent activities -->
      <div class="activities-section">
        <h2>{{ $t('dashboard.recentActivities') }}</h2>
        <el-card class="activities-card">
          <div v-if="dashboardData?.recentActivities.length === 0" class="no-activities">
            <el-empty :description="$t('dashboard.noActivities')" />
          </div>
          <div v-else class="activities-list">
            <div
              v-for="activity in dashboardData?.recentActivities"
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon" :class="getActivityIconClass(activity.type)">
                <el-icon>
                  <component :is="getActivityIcon(activity.type)" />
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-description">{{ activity.description }}</div>
                <div class="activity-time">{{ formatActivityTime(activity.timestamp) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- Admin-only sections -->
      <template v-if="dashboardData?.userRole === 'admin'">
        <!-- User statistics -->
        <div class="admin-section">
          <h2>{{ $t('dashboard.userStatistics') }}</h2>
          <el-card class="user-stats-card">
            <div v-if="loadingUserStats" class="loading-stats">
              <el-skeleton :rows="3" animated />
            </div>
            <div v-else-if="userStats" class="user-stats-content">
              <div class="stats-row">
                <div class="stats-item">
                  <div class="stats-label">{{ $t('dashboard.byRole') }}</div>
                  <div class="stats-values">
                    <el-tag
                      v-for="(count, role) in userStats.byRole"
                      :key="role"
                      :type="getRoleTagType(role)"
                      class="role-tag"
                    >
                      {{ $t(`header.roles.${role}`) }}: {{ count }}
                    </el-tag>
                  </div>
                </div>
                <div class="stats-item">
                  <div class="stats-label">{{ $t('dashboard.byCompany') }}</div>
                  <div class="stats-values">
                    <el-tag
                      v-for="(count, company) in userStats.byCompany"
                      :key="company"
                      :type="getCompanyTagType(company)"
                      class="company-tag"
                    >
                      {{ $t(`header.companies.${company}`) }}: {{ count }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- System health -->
        <div class="admin-section">
          <h2>{{ $t('dashboard.systemHealth') }}</h2>
          <el-card class="health-card">
            <div v-if="loadingSystemHealth" class="loading-health">
              <el-skeleton :rows="2" animated />
            </div>
            <div v-else-if="systemHealth" class="health-content">
              <div class="health-status">
                <el-tag
                  :type="getHealthStatusType(systemHealth.status)"
                  size="large"
                  class="health-tag"
                >
                  {{ $t(`dashboard.healthStatus.${systemHealth.status}`) }}
                </el-tag>
                <span class="health-time">
                  {{ $t('dashboard.lastChecked') }}: {{ formatTime(systemHealth.timestamp) }}
                </span>
              </div>
              <div class="health-services">
                <div
                  v-for="(service, name) in systemHealth.services"
                  :key="name"
                  class="service-item"
                >
                  <span class="service-name">{{ $t(`dashboard.services.${name}`) }}</span>
                  <el-tag
                    :type="getServiceStatusType(service.status)"
                    size="small"
                  >
                    {{ service.status }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import {
  User,
  Document,
  Money,
  ShoppingCart,
  Setting,
  ChatDotRound,
  Files,
  Bell,
  DataAnalysis,
  Plus,
  View,
  Edit
} from '@element-plus/icons-vue';
import { DashboardService } from '@/services/dashboardService';
import type { DashboardData, UserStatistics, SystemHealth } from '@/services/dashboardService';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

// Reactive state
const loading = ref(true);
const error = ref<string | null>(null);
const showAccessDeniedAlert = ref(false);
const dashboardData = ref<DashboardData | null>(null);
const userStats = ref<UserStatistics | null>(null);
const systemHealth = ref<SystemHealth | null>(null);
const loadingUserStats = ref(false);
const loadingSystemHealth = ref(false);

// Computed properties
const showInquiryStats = computed(() => {
  const role = dashboardData.value?.userRole;
  return role === 'admin' || role === 'buyer';
});

const showQuotationStats = computed(() => {
  const role = dashboardData.value?.userRole;
  return role === 'admin' || role === 'supplier';
});

const showOrderStats = computed(() => {
  return dashboardData.value?.userRole !== undefined;
});

const availableFeatureCards = computed(() => {
  const features = dashboardData.value?.availableFeatures || [];
  const featureCards = [
    {
      key: 'user_management',
      title: 'dashboard.features.userManagement',
      description: 'dashboard.features.userManagementDesc',
      icon: User,
      iconClass: 'user-icon',
      route: '/users',
      enabled: features.includes('user_management')
    },
    {
      key: 'inquiry_management',
      title: 'dashboard.features.inquiryManagement',
      description: 'dashboard.features.inquiryManagementDesc',
      icon: Document,
      iconClass: 'inquiry-icon',
      route: '/inquiries',
      enabled: features.includes('inquiry_management')
    },
    {
      key: 'inquiry_view',
      title: 'dashboard.features.inquiryView',
      description: 'dashboard.features.inquiryViewDesc',
      icon: View,
      iconClass: 'inquiry-icon',
      route: '/inquiries',
      enabled: features.includes('inquiry_view')
    },
    {
      key: 'quotation_management',
      title: 'dashboard.features.quotationManagement',
      description: 'dashboard.features.quotationManagementDesc',
      icon: Money,
      iconClass: 'quotation-icon',
      route: '/quotations',
      enabled: features.includes('quotation_management')
    },
    {
      key: 'quotation_view',
      title: 'dashboard.features.quotationView',
      description: 'dashboard.features.quotationViewDesc',
      icon: Money,
      iconClass: 'quotation-icon',
      route: '/quotations',
      enabled: features.includes('quotation_view')
    },
    {
      key: 'order_management',
      title: 'dashboard.features.orderManagement',
      description: 'dashboard.features.orderManagementDesc',
      icon: ShoppingCart,
      iconClass: 'order-icon',
      route: '/orders',
      enabled: features.includes('order_management')
    },
    {
      key: 'order_tracking',
      title: 'dashboard.features.orderTracking',
      description: 'dashboard.features.orderTrackingDesc',
      icon: ShoppingCart,
      iconClass: 'order-icon',
      route: '/orders',
      enabled: features.includes('order_tracking')
    },
    {
      key: 'file_management',
      title: 'dashboard.features.fileManagement',
      description: 'dashboard.features.fileManagementDesc',
      icon: Files,
      iconClass: 'file-icon',
      route: '/files',
      enabled: features.includes('file_management')
    },
    {
      key: 'chat_communication',
      title: 'dashboard.features.chatCommunication',
      description: 'dashboard.features.chatCommunicationDesc',
      icon: ChatDotRound,
      iconClass: 'chat-icon',
      route: '/chat',
      enabled: features.includes('chat_communication')
    },
    {
      key: 'notification_management',
      title: 'dashboard.features.notificationManagement',
      description: 'dashboard.features.notificationManagementDesc',
      icon: Bell,
      iconClass: 'notification-icon',
      route: '/notifications',
      enabled: features.includes('notification_management')
    },
    {
      key: 'system_settings',
      title: 'dashboard.features.systemSettings',
      description: 'dashboard.features.systemSettingsDesc',
      icon: Setting,
      iconClass: 'settings-icon',
      route: '/settings',
      enabled: features.includes('system_settings')
    },
    {
      key: 'reports',
      title: 'dashboard.features.reports',
      description: 'dashboard.features.reportsDesc',
      icon: DataAnalysis,
      iconClass: 'reports-icon',
      route: '/reports',
      enabled: features.includes('reports')
    }
  ];

  // Filter out features that are not available for the current user
  return featureCards.filter(card => 
    features.includes(card.key) || 
    (card.key === 'inquiry_view' && features.includes('inquiry_view')) ||
    (card.key === 'quotation_view' && features.includes('quotation_view')) ||
    (card.key === 'order_tracking' && features.includes('order_tracking'))
  );
});

// Methods
const loadDashboardData = async () => {
  loading.value = true;
  error.value = null;

  try {
    dashboardData.value = await DashboardService.getDashboardData();
    
    // Load admin-specific data
    if (dashboardData.value.userRole === 'admin') {
      await loadAdminData();
    }
  } catch (err: any) {
    console.error('Failed to load dashboard data:', err);
    error.value = err.message || t('dashboard.loadError');
  } finally {
    loading.value = false;
  }
};

const loadAdminData = async () => {
  // Load user statistics
  loadingUserStats.value = true;
  try {
    userStats.value = await DashboardService.getUserStatistics();
  } catch (err: any) {
    console.error('Failed to load user statistics:', err);
  } finally {
    loadingUserStats.value = false;
  }

  // Load system health
  loadingSystemHealth.value = true;
  try {
    systemHealth.value = await DashboardService.getSystemHealth();
  } catch (err: any) {
    console.error('Failed to load system health:', err);
  } finally {
    loadingSystemHealth.value = false;
  }
};

const navigateToFeature = (feature: any) => {
  if (!feature.enabled) {
    ElMessage.info(t('dashboard.featureNotAvailable'));
    return;
  }

  router.push(feature.route);
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'user_created':
      return User;
    case 'inquiry_created':
      return Document;
    case 'quotation_received':
      return Money;
    case 'order_confirmed':
      return ShoppingCart;
    case 'status_updated':
      return Edit;
    default:
      return Bell;
  }
};

const getActivityIconClass = (type: string) => {
  switch (type) {
    case 'user_created':
      return 'activity-user';
    case 'inquiry_created':
      return 'activity-inquiry';
    case 'quotation_received':
      return 'activity-quotation';
    case 'order_confirmed':
      return 'activity-order';
    case 'status_updated':
      return 'activity-status';
    default:
      return 'activity-default';
  }
};

const formatActivityTime = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('dashboard.timeAgo.justNow');
  if (minutes < 60) return t('dashboard.timeAgo.minutesAgo', { count: minutes });
  if (hours < 24) return t('dashboard.timeAgo.hoursAgo', { count: hours });
  if (days < 7) return t('dashboard.timeAgo.daysAgo', { count: days });
  
  return timestamp.toLocaleDateString();
};

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const getRoleTagType = (role: string) => {
  switch (role) {
    case 'admin': return 'danger';
    case 'buyer': return 'primary';
    case 'supplier': return 'success';
    default: return 'info';
  }
};

const getCompanyTagType = (company: string) => {
  switch (company) {
    case 'admin': return 'danger';
    case 'arroz': return 'primary';
    case 'yunjie': return 'success';
    default: return 'info';
  }
};

const getHealthStatusType = (status: string) => {
  switch (status) {
    case 'healthy': return 'success';
    case 'degraded': return 'warning';
    case 'unhealthy': return 'danger';
    default: return 'info';
  }
};

const getServiceStatusType = (status: string) => {
  switch (status) {
    case 'healthy': return 'success';
    case 'unhealthy': return 'danger';
    case 'not_implemented': return 'info';
    default: return 'warning';
  }
};

// Lifecycle
onMounted(() => {
  // Check for access denied error from router
  if (route.query.error === 'access_denied') {
    showAccessDeniedAlert.value = true;
  }

  // Load dashboard data
  loadDashboardData();
});
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.access-denied-alert,
.error-alert {
  margin-bottom: 24px;
}

.loading-container {
  padding: 24px;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Welcome header */
.welcome-header {
  text-align: center;
  margin-bottom: 16px;
}

.welcome-header h1 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 32px;
  font-weight: 600;
}

.welcome-message {
  margin: 0;
  color: #606266;
  font-size: 16px;
}

/* Statistics section */
.statistics-section h2,
.features-section h2,
.activities-section h2,
.admin-section h2 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.stat-card {
  cursor: default;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.admin-icon { background: linear-gradient(135deg, #f56565, #e53e3e); }
.inquiry-icon { background: linear-gradient(135deg, #4299e1, #3182ce); }
.quotation-icon { background: linear-gradient(135deg, #48bb78, #38a169); }
.order-icon { background: linear-gradient(135deg, #ed8936, #dd6b20); }

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

/* Features section */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.feature-card {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.feature-card:hover:not(.feature-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.feature-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.feature-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.user-icon { background: linear-gradient(135deg, #f56565, #e53e3e); }
.file-icon { background: linear-gradient(135deg, #9f7aea, #805ad5); }
.chat-icon { background: linear-gradient(135deg, #4299e1, #3182ce); }
.notification-icon { background: linear-gradient(135deg, #ed8936, #dd6b20); }
.settings-icon { background: linear-gradient(135deg, #718096, #4a5568); }
.reports-icon { background: linear-gradient(135deg, #38b2ac, #319795); }

.feature-info {
  flex: 1;
}

.feature-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.feature-description {
  font-size: 14px;
  color: #909399;
}

.feature-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

/* Activities section */
.activities-card {
  min-height: 200px;
}

.no-activities {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
  flex-shrink: 0;
}

.activity-user { background: #f56565; }
.activity-inquiry { background: #4299e1; }
.activity-quotation { background: #48bb78; }
.activity-order { background: #ed8936; }
.activity-status { background: #9f7aea; }
.activity-default { background: #718096; }

.activity-content {
  flex: 1;
}

.activity-description {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: #909399;
}

/* Admin sections */
.admin-section {
  margin-top: 16px;
}

.user-stats-card,
.health-card {
  min-height: 120px;
}

.loading-stats,
.loading-health {
  padding: 16px;
}

.user-stats-content {
  padding: 8px 0;
}

.stats-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.stats-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-tag,
.company-tag {
  font-size: 12px;
}

.health-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.health-tag {
  font-size: 14px;
}

.health-time {
  font-size: 12px;
  color: #909399;
}

.health-services {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.service-name {
  font-size: 12px;
  color: #606266;
}

/* Responsive design */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .stats-grid,
  .features-grid {
    grid-template-columns: 1fr;
  }

  .welcome-header h1 {
    font-size: 24px;
  }

  .feature-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .stats-row {
    gap: 12px;
  }

  .health-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>