<template>
  <el-aside width="200px" class="app-sidebar">
    <el-menu
      :default-active="route.path"
      router
      :collapse="false"
    >
      <el-menu-item index="/">
        <span>{{ $t('menu.dashboard') }}</span>
      </el-menu-item>

      <el-menu-item index="/inquiries">
        <span>{{ $t('menu.inquiries') }}</span>
      </el-menu-item>

      <el-menu-item index="/orders">
        <span>{{ $t('menu.orders') }}</span>
      </el-menu-item>

      <el-menu-item
        v-if="authStore.userRole === 'admin'"
        index="/users"
      >
        <span>{{ $t('menu.users') }}</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
</script>

<style scoped>
.app-sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.app-sidebar .el-menu {
  border-right: none;
}
</style>
