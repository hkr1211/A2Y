<template>
  <el-dropdown 
    trigger="click" 
    placement="bottom-end"
    @visible-change="handleDropdownVisibleChange"
  >
    <div class="notification-trigger">
      <el-badge 
        :value="unreadCount" 
        :hidden="unreadCount === 0"
        :max="99"
      >
        <el-button 
          :icon="Bell" 
          circle 
          text
          size="large"
          class="notification-button"
        />
      </el-badge>
    </div>

    <template #dropdown>
      <el-dropdown-menu class="notification-dropdown">
        <div class="notification-header">
          <span class="notification-title">{{ $t('notifications.title') }}</span>
          <el-button 
            v-if="unreadCount > 0"
            type="primary" 
            link 
            size="small"
            @click="markAllAsRead"
          >
            {{ $t('notifications.markAllRead') }}
          </el-button>
        </div>

        <div class="notification-content">
          <div v-if="loading" class="notification-loading">
            <el-skeleton :rows="3" animated />
          </div>

          <div v-else-if="notifications.length === 0" class="notification-empty">
            <el-empty 
              :description="$t('notifications.noNotifications')"
              :image-size="60"
            />
          </div>

          <div v-else class="notification-list">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-item"
              :class="{ 'unread': !notification.isRead }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-icon">
                <el-icon 
                  :color="getNotificationIconColor(notification.type)"
                  size="16"
                >
                  <component :is="getNotificationIcon(notification.type)" />
                </el-icon>
              </div>

              <div class="notification-body">
                <div class="notification-title-text">{{ notification.title }}</div>
                <div class="notification-content-text">{{ notification.content }}</div>
                <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
              </div>

              <div v-if="!notification.isRead" class="notification-dot"></div>
            </div>
          </div>
        </div>

        <div class="notification-footer">
          <el-button 
            type="primary" 
            link 
            @click="viewAllNotifications"
          >
            {{ $t('notifications.viewAll') }}
          </el-button>
        </div>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Bell, ChatDotRound, ShoppingCart, DocumentChecked, Message } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { NotificationService, type Notification } from '@/services/notificationService';

const { t } = useI18n();
const router = useRouter();

// Data
const notifications = ref<Notification[]>([]);
const unreadCount = ref(0);
const loading = ref(false);

// Load notifications
const loadNotifications = async () => {
  loading.value = true;
  try {
    const response = await NotificationService.getUserNotifications({
      page: 1,
      limit: 10
    });
    notifications.value = response.data;
    
    // Load unread count
    unreadCount.value = await NotificationService.getUnreadCount();
  } catch (error: any) {
    console.error('Failed to load notifications:', error);
  } finally {
    loading.value = false;
  }
};

// Get notification icon based on type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'quotation_received':
      return DocumentChecked;
    case 'order_confirmed':
      return ShoppingCart;
    case 'status_updated':
      return DocumentChecked;
    case 'message_received':
      return Message;
    default:
      return Bell;
  }
};

// Get notification icon color based on type
const getNotificationIconColor = (type: string) => {
  switch (type) {
    case 'quotation_received':
      return '#67C23A';
    case 'order_confirmed':
      return '#409EFF';
    case 'status_updated':
      return '#E6A23C';
    case 'message_received':
      return '#F56C6C';
    default:
      return '#909399';
  }
};

// Format notification time
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) {
    return t('dashboard.timeAgo.justNow');
  } else if (minutes < 60) {
    return t('dashboard.timeAgo.minutesAgo', { count: minutes });
  } else if (hours < 24) {
    return t('dashboard.timeAgo.hoursAgo', { count: hours });
  } else {
    return t('dashboard.timeAgo.daysAgo', { count: days });
  }
};

// Handle dropdown visibility change
const handleDropdownVisibleChange = (visible: boolean) => {
  if (visible) {
    loadNotifications();
  }
};

// Handle notification click
const handleNotificationClick = async (notification: Notification) => {
  try {
    // Mark as read if unread
    if (!notification.isRead) {
      await NotificationService.markAsRead(notification.id);
      notification.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }

    // Navigate to related page
    if (notification.relatedType === 'inquiry') {
      router.push('/inquiries');
    } else if (notification.relatedType === 'order') {
      router.push('/orders');
    }
  } catch (error: any) {
    console.error('Failed to handle notification click:', error);
    ElMessage.error(error.message || t('notifications.markReadError'));
  }
};

// Mark all notifications as read
const markAllAsRead = async () => {
  try {
    await NotificationService.markAllAsRead();
    notifications.value.forEach(n => n.isRead = true);
    unreadCount.value = 0;
    ElMessage.success(t('notifications.markAllReadSuccess'));
  } catch (error: any) {
    console.error('Failed to mark all as read:', error);
    ElMessage.error(error.message || t('notifications.markAllReadError'));
  }
};

// View all notifications
const viewAllNotifications = () => {
  router.push('/notifications');
};

// Initialize
onMounted(() => {
  loadNotifications();
});

// Expose methods for parent component
defineExpose({
  loadNotifications,
  unreadCount: computed(() => unreadCount.value)
});
</script>

<style scoped>
.notification-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-button {
  color: var(--el-text-color-primary);
}

.notification-button:hover {
  color: var(--el-color-primary);
}

.notification-dropdown {
  width: 350px;
  max-height: 500px;
  padding: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-fill-color-lighter);
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.notification-content {
  max-height: 400px;
  overflow-y: auto;
}

.notification-loading {
  padding: 16px;
}

.notification-empty {
  padding: 20px;
  text-align: center;
}

.notification-list {
  padding: 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.notification-item:hover {
  background-color: var(--el-fill-color-light);
}

.notification-item.unread {
  background-color: var(--el-color-primary-light-9);
}

.notification-item.unread:hover {
  background-color: var(--el-color-primary-light-8);
}

.notification-icon {
  margin-right: 12px;
  margin-top: 2px;
  flex-shrink: 0;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title-text {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-content-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--el-color-primary);
  margin-left: 8px;
  margin-top: 6px;
  flex-shrink: 0;
}

.notification-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: center;
  background-color: var(--el-fill-color-lighter);
}

:deep(.el-badge__content) {
  font-size: 10px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  min-width: 16px;
}
</style>