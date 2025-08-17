<template>
  <div class="chat-window" :class="{ 'chat-window--minimized': isMinimized }">
    <!-- Chat Header -->
    <div class="chat-header" @click="toggleMinimize">
      <div class="chat-title">
        <el-icon class="chat-icon">
          <ChatDotRound />
        </el-icon>
        <span>{{ chatTitle }}</span>
        <el-badge v-if="unreadCount > 0" :value="unreadCount" class="unread-badge" />
      </div>
      <div class="chat-actions">
        <el-button
          v-if="canTranslate"
          type="text"
          size="small"
          :icon="Switch"
          @click.stop="handleBatchTranslate"
          :loading="translating"
        >
          {{ $t('chat.translateAll') }}
        </el-button>
        <el-button
          type="text"
          size="small"
          :icon="isMinimized ? ArrowUp : ArrowDown"
          @click.stop="toggleMinimize"
        />
        <el-button
          type="text"
          size="small"
          :icon="Close"
          @click.stop="$emit('close')"
        />
      </div>
    </div>

    <!-- Chat Body -->
    <div v-show="!isMinimized" class="chat-body">
      <!-- Messages Container -->
      <div ref="messagesContainer" class="messages-container" @scroll="handleScroll">
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-for="message in messages" :key="message.id" class="message-wrapper">
          <div
            class="message"
            :class="{
              'message--own': message.senderId === currentUserId,
              'message--other': message.senderId !== currentUserId,
            }"
          >
            <div class="message-header">
              <span class="message-sender">{{ message.senderUsername }}</span>
              <span class="message-time">{{ formatTime(message.createdAt) }}</span>
            </div>
            
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              
              <!-- Translated Content -->
              <div
                v-if="message.translatedContent"
                class="message-translation"
              >
                <el-divider content-position="left">
                  <el-icon><Switch /></el-icon>
                  {{ $t('chat.translation') }}
                </el-divider>
                <div class="translated-text">{{ message.translatedContent }}</div>
              </div>
            </div>
            
            <div class="message-actions">
              <el-button
                v-if="!message.translatedContent && canTranslate"
                type="text"
                size="small"
                :icon="Switch"
                @click="translateMessage(message)"
                :loading="translatingMessages.has(message.id)"
              >
                {{ $t('chat.translate') }}
              </el-button>
              
              <el-button
                v-if="message.senderId === currentUserId"
                type="text"
                size="small"
                :icon="Delete"
                @click="deleteMessage(message)"
              >
                {{ $t('common.delete') }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="typingUsers.length > 0" class="typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">
            {{ getTypingText() }}
          </span>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input-container">
        <el-input
          v-model="newMessage"
          type="textarea"
          :placeholder="$t('chat.typeMessage')"
          :autosize="{ minRows: 1, maxRows: 4 }"
          @keydown.enter.exact="handleSendMessage"
          @keydown.enter.shift.exact.prevent
          @input="handleTyping"
          @blur="handleStopTyping"
        />
        <el-button
          type="primary"
          :icon="Promotion"
          :disabled="!newMessage.trim()"
          @click="handleSendMessage"
          :loading="sending"
        >
          {{ $t('chat.send') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ChatDotRound,
  ArrowUp,
  ArrowDown,
  Close,
  Switch,
  Delete,
  Promotion,
} from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import type { ChatMessage, TypingStatus } from '@/types/chat';
import { ChatService } from '@/services/chatService';
import { socketService } from '@/services/socketService';

interface Props {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
});

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const authStore = useAuthStore();

// State
const messages = ref<ChatMessage[]>([]);
const newMessage = ref('');
const loading = ref(false);
const sending = ref(false);
const translating = ref(false);
const translatingMessages = ref(new Set<string>());
const isMinimized = ref(false);
const unreadCount = ref(0);
const typingUsers = ref<TypingStatus[]>([]);
const messagesContainer = ref<HTMLElement>();

// Typing timer
let typingTimer: NodeJS.Timeout | null = null;
let isTyping = ref(false);

// Computed
const currentUserId = computed(() => authStore.user?.id);
const chatTitle = computed(() => props.title || `${t('chat.title')} - ${props.relatedType} ${props.relatedId}`);
const canTranslate = computed(() => messages.value.length > 0);

// Methods
const loadMessages = async () => {
  loading.value = true;
  try {
    const response = await ChatService.getChatMessages({
      relatedId: props.relatedId,
      relatedType: props.relatedType,
      limit: 50,
    });
    messages.value = response.data;
    await nextTick();
    scrollToBottom();
  } catch (error: any) {
    console.error('Failed to load messages:', error);
    ElMessage.error(error.message || t('chat.loadError'));
  } finally {
    loading.value = false;
  }
};

const handleSendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return;

  const messageContent = newMessage.value.trim();
  newMessage.value = '';
  sending.value = true;

  try {
    const message = await ChatService.sendMessage({
      relatedId: props.relatedId,
      relatedType: props.relatedType,
      content: messageContent,
    });

    // Add message to local state
    messages.value.push(message);
    
    // Send via socket for real-time updates
    socketService.sendMessage(message);
    
    await nextTick();
    scrollToBottom();
  } catch (error: any) {
    console.error('Failed to send message:', error);
    ElMessage.error(error.message || t('chat.sendError'));
    newMessage.value = messageContent; // Restore message
  } finally {
    sending.value = false;
  }
};

const translateMessage = async (message: ChatMessage) => {
  if (translatingMessages.value.has(message.id)) return;

  translatingMessages.value.add(message.id);
  
  try {
    const targetLanguage = authStore.user?.language === 'ja' ? 'zh' : 'ja';
    const translation = await ChatService.translateMessage({
      messageId: message.id,
      targetLanguage,
    });

    // Update message with translation
    const messageIndex = messages.value.findIndex(m => m.id === message.id);
    if (messageIndex !== -1) {
      messages.value[messageIndex].translatedContent = translation.translatedContent;
    }
  } catch (error: any) {
    console.error('Failed to translate message:', error);
    ElMessage.error(error.message || t('chat.translateError'));
  } finally {
    translatingMessages.value.delete(message.id);
  }
};

const handleBatchTranslate = async () => {
  if (translating.value) return;

  translating.value = true;
  
  try {
    const targetLanguage = authStore.user?.language === 'ja' ? 'zh' : 'ja';
    const result = await ChatService.batchTranslateMessages(
      props.relatedId,
      props.relatedType,
      targetLanguage
    );

    ElMessage.success(
      t('chat.batchTranslateSuccess', {
        translated: result.translatedCount,
        total: result.totalMessages,
      })
    );

    // Reload messages to get translations
    await loadMessages();
  } catch (error: any) {
    console.error('Failed to batch translate:', error);
    ElMessage.error(error.message || t('chat.batchTranslateError'));
  } finally {
    translating.value = false;
  }
};

const deleteMessage = async (message: ChatMessage) => {
  try {
    await ElMessageBox.confirm(
      t('chat.deleteMessageConfirm'),
      t('chat.deleteMessageTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await ChatService.deleteMessage(message.id);
    
    // Remove from local state
    const index = messages.value.findIndex(m => m.id === message.id);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }

    ElMessage.success(t('chat.deleteSuccess'));
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete message:', error);
      ElMessage.error(error.message || t('chat.deleteError'));
    }
  }
};

const handleTyping = () => {
  if (!isTyping.value) {
    isTyping.value = true;
    socketService.sendTypingStatus({
      userId: currentUserId.value!,
      username: authStore.user?.username || '',
      isTyping: true,
      relatedId: props.relatedId,
      relatedType: props.relatedType,
    });
  }

  // Clear existing timer
  if (typingTimer) {
    clearTimeout(typingTimer);
  }

  // Set new timer
  typingTimer = setTimeout(() => {
    handleStopTyping();
  }, 2000);
};

const handleStopTyping = () => {
  if (isTyping.value) {
    isTyping.value = false;
    socketService.sendTypingStatus({
      userId: currentUserId.value!,
      username: authStore.user?.username || '',
      isTyping: false,
      relatedId: props.relatedId,
      relatedType: props.relatedType,
    });
  }

  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
};

const handleScroll = () => {
  // TODO: Implement infinite scroll for loading more messages
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
  if (!isMinimized.value) {
    nextTick(() => {
      scrollToBottom();
    });
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getTypingText = () => {
  const names = typingUsers.value.map(user => user.username);
  if (names.length === 1) {
    return t('chat.userTyping', { user: names[0] });
  } else if (names.length === 2) {
    return t('chat.usersTyping', { users: names.join(', ') });
  } else {
    return t('chat.multipleUsersTyping');
  }
};

// Socket event handlers
const handleNewMessage = (message: ChatMessage) => {
  if (message.relatedId === props.relatedId && message.relatedType === props.relatedType) {
    messages.value.push(message);
    if (message.senderId !== currentUserId.value) {
      unreadCount.value++;
    }
    nextTick(() => {
      scrollToBottom();
    });
  }
};

const handleTypingStatus = (status: TypingStatus) => {
  if (status.relatedId === props.relatedId && status.relatedType === props.relatedType) {
    if (status.userId !== currentUserId.value) {
      const existingIndex = typingUsers.value.findIndex(user => user.userId === status.userId);
      
      if (status.isTyping) {
        if (existingIndex === -1) {
          typingUsers.value.push(status);
        }
      } else {
        if (existingIndex !== -1) {
          typingUsers.value.splice(existingIndex, 1);
        }
      }
    }
  }
};

// Lifecycle
onMounted(() => {
  loadMessages();
  
  // Connect socket and join room
  socketService.connect();
  socketService.joinChatRoom(props.relatedId, props.relatedType);
  
  // Setup socket listeners
  socketService.onMessage(handleNewMessage);
  socketService.onTyping(handleTypingStatus);
});

onUnmounted(() => {
  // Leave room and cleanup
  socketService.leaveChatRoom(props.relatedId, props.relatedType);
  socketService.off('new-message', handleNewMessage);
  socketService.off('user-typing', handleTypingStatus);
  
  // Clear typing timer
  if (typingTimer) {
    clearTimeout(typingTimer);
  }
});

// Watch for visibility changes to mark messages as read
watch(isMinimized, (minimized) => {
  if (!minimized && unreadCount.value > 0) {
    ChatService.markMessagesAsRead(props.relatedId, props.relatedType);
    socketService.markAsRead(props.relatedId, props.relatedType);
    unreadCount.value = 0;
  }
});
</script>

<style scoped>
.chat-window {
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 400px;
  max-height: 600px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.chat-window--minimized {
  max-height: 50px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-color-primary);
  color: white;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.chat-icon {
  font-size: 18px;
}

.unread-badge {
  margin-left: 8px;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chat-actions .el-button {
  color: white;
  border-color: transparent;
}

.chat-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.chat-body {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--el-bg-color-page);
}

.loading-container {
  padding: 16px;
}

.message-wrapper {
  margin-bottom: 16px;
}

.message {
  max-width: 80%;
  padding: 12px;
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.message--own {
  margin-left: auto;
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.message--other {
  margin-right: auto;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-sender {
  font-weight: 600;
}

.message-content {
  margin-bottom: 8px;
}

.message-text {
  line-height: 1.5;
  word-wrap: break-word;
}

.message-translation {
  margin-top: 12px;
  padding-top: 8px;
}

.translated-text {
  font-style: italic;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  padding: 8px;
  border-radius: 6px;
}

.message-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message:hover .message-actions {
  opacity: 1;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 12px;
  margin-top: 8px;
  max-width: 200px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--el-color-primary);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.typing-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-input-container {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.message-input-container .el-textarea {
  flex: 1;
}

@media (max-width: 768px) {
  .chat-window {
    width: 100%;
    right: 0;
    left: 0;
    border-radius: 0;
  }
}
</style>