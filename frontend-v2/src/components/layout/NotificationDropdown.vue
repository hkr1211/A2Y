<template>
  <el-popover
    placement="bottom-end"
    :width="360"
    trigger="click"
    @show="loadNotifications"
  >
    <template #reference>
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-button text>
          {{ $t('notification.title') }}
        </el-button>
      </el-badge>
    </template>

    <div class="notification-header">
      <span>{{ $t('notification.title') }}</span>
      <el-button
        v-if="unreadCount > 0"
        text
        size="small"
        @click="handleMarkAllRead"
      >
        {{ $t('notification.markAllRead') }}
      </el-button>
    </div>

    <div class="notification-list">
      <div
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.isRead }"
        @click="handleClick(item)"
      >
        <div class="notification-title">{{ item.title }}</div>
        <div v-if="item.content" class="notification-content">
          {{ item.content }}
        </div>
        <div class="notification-time">{{ formatTime(item.createdAt) }}</div>
      </div>
      <div v-if="notifications.length === 0" class="no-notifications">
        {{ $t('notification.noNotification') }}
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notification';
import type { NotificationItem } from '@/services/notification';

const unreadCount = ref(0);
const notifications = ref<NotificationItem[]>([]);
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function pollUnreadCount() {
  try {
    unreadCount.value = await getUnreadCount();
  } catch {
    // Silently ignore
  }
}

async function loadNotifications() {
  try {
    const data = await getNotifications({ pageSize: 20 });
    notifications.value = data.items;
  } catch {
    // Silently ignore
  }
}

async function handleMarkAllRead() {
  try {
    await markAllNotificationsRead();
    unreadCount.value = 0;
    notifications.value.forEach((n) => (n.isRead = true));
  } catch {
    // Silently ignore
  }
}

async function handleClick(item: NotificationItem) {
  if (!item.isRead) {
    try {
      await markNotificationRead(item.id);
      item.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch {
      // Silently ignore
    }
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  pollUnreadCount();
  pollTimer = setInterval(pollUnreadCount, 5000);
});

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>

<style scoped>
.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 8px;
  font-weight: 600;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f5f7fa;
}

.notification-item.unread {
  background: #ecf5ff;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
}

.notification-content {
  font-size: 13px;
  color: #606266;
  margin-top: 2px;
}

.notification-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.no-notifications {
  text-align: center;
  color: #909399;
  padding: 24px 0;
  font-size: 13px;
}
</style>
