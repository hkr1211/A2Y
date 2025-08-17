<template>
  <div class="chat-manager">
    <!-- Chat Windows -->
    <ChatWindow
      v-for="chat in openChats"
      :key="`${chat.relatedType}-${chat.relatedId}`"
      :related-id="chat.relatedId"
      :related-type="chat.relatedType"
      :title="chat.title"
      @close="closeChat(chat.relatedId, chat.relatedType)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import ChatWindow from './ChatWindow.vue';

interface ChatInfo {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  title: string;
}

// State
const openChats = ref<ChatInfo[]>([]);

// Methods
const openChat = (relatedId: string, relatedType: 'inquiry' | 'order', title?: string) => {
  const existingChat = openChats.value.find(
    chat => chat.relatedId === relatedId && chat.relatedType === relatedType
  );

  if (!existingChat) {
    openChats.value.push({
      relatedId,
      relatedType,
      title: title || `${relatedType.toUpperCase()} ${relatedId}`,
    });
  }
};

const closeChat = (relatedId: string, relatedType: 'inquiry' | 'order') => {
  const index = openChats.value.findIndex(
    chat => chat.relatedId === relatedId && chat.relatedType === relatedType
  );

  if (index !== -1) {
    openChats.value.splice(index, 1);
  }
};

const closeAllChats = () => {
  openChats.value = [];
};

// Provide methods to child components
provide('chatManager', {
  openChat,
  closeChat,
  closeAllChats,
});

// Expose methods for parent components
defineExpose({
  openChat,
  closeChat,
  closeAllChats,
});
</script>

<style scoped>
.chat-manager {
  position: relative;
  z-index: 1000;
}
</style>