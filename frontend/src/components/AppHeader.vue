<template>
  <el-header class="app-header">
    <div class="header-left">
      <h1 class="app-title">{{ $t('login.subtitle') }}</h1>
      
      <!-- Navigation menu for admin users -->
      <el-menu
        v-if="authStore.userRole === 'admin'"
        :default-active="activeIndex"
        class="header-menu"
        mode="horizontal"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/dashboard">
          {{ $t('dashboard.title') }}
        </el-menu-item>
        <el-menu-item index="/users">
          {{ $t('users.title') }}
        </el-menu-item>
        <el-menu-item index="/chat-demo">
          聊天演示
        </el-menu-item>
      </el-menu>
    </div>
    
    <div class="header-right">
      <!-- Notification dropdown -->
      <NotificationDropdown v-if="authStore.isAuthenticated" />

      <!-- Language switcher -->
      <LanguageSwitcher 
        type="dropdown" 
        :save-preference="true"
        @language-changed="onLanguageChanged"
      />

      <!-- User menu -->
      <el-dropdown class="user-dropdown" @command="handleUserMenuCommand">
        <el-button text>
          <el-icon><User /></el-icon>
          {{ authStore.user?.username }}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              {{ $t('header.role') }}: {{ getRoleText(authStore.user?.role) }}
            </el-dropdown-item>
            <el-dropdown-item disabled>
              {{ $t('header.company') }}: {{ getCompanyText(authStore.user?.company) }}
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              {{ $t('header.logout') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, User, SwitchButton } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import type { UserRole, Company } from '@/types/user';
import NotificationDropdown from './NotificationDropdown.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();

// Active menu index
const activeIndex = computed(() => route.path);

// Methods
const handleMenuSelect = (index: string) => {
  router.push(index);
};

const onLanguageChanged = (language: string) => {
  console.log('Language changed to:', language);
  // Additional logic can be added here if needed
};

const handleUserMenuCommand = async (command: string) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm(
        t('header.logoutConfirm'),
        t('header.logoutTitle'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning',
        }
      );
      
      await authStore.logout();
      ElMessage.success(t('header.logoutSuccess'));
      await router.push('/login');
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('Logout error:', error);
        ElMessage.error(t('header.logoutError'));
      }
    }
  }
};

const getRoleText = (role?: UserRole): string => {
  if (!role) return '';
  
  const roleMap = {
    admin: t('header.roles.admin'),
    buyer: t('header.roles.buyer'),
    supplier: t('header.roles.supplier'),
  };
  
  return roleMap[role] || role;
};

const getCompanyText = (company?: Company): string => {
  if (!company) return '';
  
  const companyMap = {
    admin: t('header.companies.admin'),
    arroz: t('header.companies.arroz'),
    yunjie: t('header.companies.yunjie'),
  };
  
  return companyMap[company] || company;
};
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.app-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-dropdown {
  cursor: pointer;
}

:deep(.el-button) {
  border: none;
  background: none;
  color: #606266;
  font-size: 14px;
}

:deep(.el-button:hover) {
  color: #409eff;
  background-color: #f5f7fa;
}

.header-menu {
  border-bottom: none;
  background: transparent;
}

:deep(.header-menu .el-menu-item) {
  border-bottom: none;
}

:deep(.header-menu .el-menu-item:hover) {
  background-color: #f5f7fa;
}

:deep(.header-menu .el-menu-item.is-active) {
  border-bottom: 2px solid #409eff;
  color: #409eff;
}
</style>