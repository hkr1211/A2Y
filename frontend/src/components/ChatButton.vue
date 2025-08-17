<template>
  <el-button
    type="primary"
    :icon="ChatDotRound"
    @click="openChat"
    class="chat-button"
  >
    {{ $t('chat.openChat') }}
    <el-badge v-if="unreadCount > 0" :value="unreadCount" class="chat-badge" />
  </el-button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ChatDotRound } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { socketService } from '@/services/socketService';
import type { ChatMessage } from '@/types/chat';

interface Props {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  openChat: [relatedId: string, relatedType: 'inquiry' | 'order'];
}>();

const { t } = useI18n();

// State
const unreadCount = ref(0);

// Methods
const openChat = () => {
  emit('openChat', props.relatedId, props.relatedType);
  unreadCount.value = 0; // Reset unread count when opening chat
};

const handleNewMessage = (message: ChatMessage) => {
  if (message.relatedId === props.relatedId && message.relatedType === props.relatedType) {
    unreadCount.value++;
  }
};

const handleMessageRead = (data: { relatedId: string; relatedType: string }) => {
  if (data.relatedId === props.relatedId && data.relatedType === props.relatedType) {
    unreadCount.value = 0;
  }
};

// Lifecycle
onMounted(() => {
  socketService.connect();
  socketService.onMessage(handleNewMessage);
  socketService.onMessageRead(handleMessageRead);
});

onUnmounted(() => {
  socketService.off('new-message', handleNewMessage);
  socketService.off('message-read', handleMessageRead);
});
</script>

<style scoped>
.chat-button {
  position: relative;
}

.chat-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}
</style>