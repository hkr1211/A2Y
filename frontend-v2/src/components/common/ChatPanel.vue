<template>
  <div class="chat-panel">
    <div class="panel-header">
      <span class="panel-title">{{ $t('chat.title') }}</span>
    </div>

    <div ref="messageListRef" class="message-list">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="{ own: msg.sender.id === authStore.user?.id }"
      >
        <div class="message-sender">
          {{ msg.sender.username }}
          <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
        </div>
        <div class="message-content">{{ msg.content }}</div>
      </div>
      <div v-if="messages.length === 0" class="no-messages">
        {{ $t('chat.placeholder') }}
      </div>
    </div>

    <div class="message-input">
      <el-input
        v-model="inputContent"
        :placeholder="$t('chat.placeholder')"
        @keyup.enter="handleSend"
        :disabled="sending"
      />
      <el-button
        type="primary"
        :loading="sending"
        :disabled="!inputContent.trim()"
        @click="handleSend"
      >
        {{ $t('chat.send') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getChatMessages,
  sendChatMessage,
  markChatRead,
} from '@/services/chat';
import type { ChatMessage } from '@/services/chat';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  relatedType: 'inquiry' | 'order';
  relatedId: string;
  active?: boolean;
}>();

const authStore = useAuthStore();
const messages = ref<ChatMessage[]>([]);
const inputContent = ref('');
const sending = ref(false);
const messageListRef = ref<HTMLElement>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastMessageTime: string | null = null;

watch(
  () => props.active,
  (val) => {
    if (val) {
      loadMessages();
      markAsRead();
      startPolling();
    } else {
      stopPolling();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  stopPolling();
});

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (!lastMessageTime) return;
    try {
      const data = await getChatMessages(props.relatedType, props.relatedId, {
        since: lastMessageTime,
      });
      if (data.items.length > 0) {
        messages.value.push(...data.items);
        lastMessageTime = data.items[data.items.length - 1].createdAt;
        scrollToBottom();
        markAsRead();
      }
    } catch {
      // Silently ignore polling errors
    }
  }, 2000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function loadMessages() {
  try {
    const data = await getChatMessages(props.relatedType, props.relatedId, {
      pageSize: 100,
    });
    messages.value = data.items;
    if (data.items.length > 0) {
      lastMessageTime = data.items[data.items.length - 1].createdAt;
    } else {
      lastMessageTime = new Date().toISOString();
    }
    scrollToBottom();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载消息失败');
  }
}

async function markAsRead() {
  try {
    await markChatRead(props.relatedType, props.relatedId);
  } catch {
    // Silently ignore
  }
}

async function handleSend() {
  const content = inputContent.value.trim();
  if (!content) return;

  sending.value = true;
  try {
    const msg = await sendChatMessage(
      props.relatedType,
      props.relatedId,
      content
    );
    messages.value.push(msg);
    lastMessageTime = msg.createdAt;
    inputContent.value = '';
    scrollToBottom();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '发送失败');
  } finally {
    sending.value = false;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
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
</script>

<style scoped>
.chat-panel {
  margin-top: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.panel-header {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.message-list {
  height: 250px;
  overflow-y: auto;
  padding: 8px 12px;
}

.message-item {
  margin-bottom: 12px;
}

.message-item.own {
  text-align: right;
}

.message-sender {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.message-time {
  margin-left: 8px;
}

.message-item.own .message-time {
  margin-left: 0;
  margin-right: 8px;
}

.message-content {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f0f2f5;
  font-size: 14px;
  max-width: 80%;
  word-break: break-all;
  text-align: left;
}

.message-item.own .message-content {
  background: #409eff;
  color: #fff;
}

.no-messages {
  text-align: center;
  color: #909399;
  padding: 40px 0;
  font-size: 13px;
}

.message-input {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #e4e7ed;
}
</style>
