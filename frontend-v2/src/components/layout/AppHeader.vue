<template>
  <el-header class="app-header">
    <div class="header-left">
      <span class="logo">A2Y</span>
    </div>
    <div class="header-right">
      <span class="username">{{ authStore.user?.username }}</span>
      <el-dropdown @command="handleCommand">
        <el-button text>
          <el-icon><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="password">
              {{ $t('user.changePassword') }}
            </el-dropdown-item>
            <el-dropdown-item command="logout" divided>
              {{ $t('auth.logout') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ArrowDown } from '@element-plus/icons-vue';

const router = useRouter();
const authStore = useAuthStore();

function handleCommand(command: string) {
  if (command === 'logout') {
    authStore.clearAuth();
    router.push('/login');
  } else if (command === 'password') {
    router.push('/change-password');
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  height: 60px;
}

.header-left .logo {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  color: #606266;
  font-size: 14px;
}
</style>
