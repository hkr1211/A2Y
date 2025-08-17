<template>
  <div id="app">
    <el-container v-if="showLayout" class="app-container">
      <AppHeader />
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
    <router-view v-else />
    
    <!-- Chat Manager - Always present when authenticated -->
    <ChatManager v-if="authStore.isAuthenticated" ref="chatManager" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, provide } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/AppHeader.vue';
import ChatManager from '@/components/ChatManager.vue';
import { useAuthStore } from '@/stores/auth';
import { useLanguage } from '@/composables/useLanguage';
import { socketService } from '@/services/socketService';

const route = useRoute();
const authStore = useAuthStore();
const { initializeLanguage } = useLanguage();
const chatManager = ref();

// Show layout for authenticated pages
const showLayout = computed(() => {
  return route.name !== 'login' && authStore.isAuthenticated;
});

// Provide chat manager to child components
provide('chatManager', chatManager);

// Initialize app
onMounted(async () => {
  // Initialize auth interceptors
  authStore.initializeInterceptors();
  
  // Check authentication status first
  if (authStore.token && !authStore.user) {
    await authStore.checkAuth();
  }
  
  // Initialize language after auth check (to get user preference)
  initializeLanguage();
  
  // Initialize socket connection when authenticated
  if (authStore.isAuthenticated) {
    socketService.connect();
  }
});
</script>

<style>
#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh;
}

body {
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.app-container {
  height: 100vh;
}

.app-main {
  padding: 20px;
  background-color: #f5f5f5;
  overflow-y: auto;
}

/* Element Plus customization */
.el-header {
  height: 60px !important;
  line-height: 60px;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>