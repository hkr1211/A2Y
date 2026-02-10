<template>
  <div class="dashboard">
    <div class="welcome-section">
      <h1>{{ $t('dashboard.welcome') }}</h1>
      <p class="subtitle">{{ $t('dashboard.subtitle') }}</p>
    </div>

    <!-- Quick action cards -->
    <div class="quick-actions">
      <h3>{{ $t('dashboard.quickActions') }}</h3>
      <div class="action-cards">
        <el-card
          v-if="authStore.userRole === 'buyer'"
          class="action-card"
          shadow="hover"
          @click="router.push('/inquiries')"
        >
          <el-icon :size="28" color="#409eff"><Document /></el-icon>
          <span>{{ $t('dashboard.viewInquiries') }}</span>
        </el-card>
        <el-card
          v-if="authStore.userRole === 'buyer'"
          class="action-card"
          shadow="hover"
          @click="router.push('/orders')"
        >
          <el-icon :size="28" color="#67c23a"><List /></el-icon>
          <span>{{ $t('dashboard.viewOrders') }}</span>
        </el-card>
        <el-card
          v-if="authStore.userRole === 'supplier'"
          class="action-card"
          shadow="hover"
          @click="router.push('/inquiries')"
        >
          <el-icon :size="28" color="#409eff"><Document /></el-icon>
          <span>{{ $t('dashboard.viewInquiries') }}</span>
        </el-card>
        <el-card
          v-if="authStore.userRole === 'supplier'"
          class="action-card"
          shadow="hover"
          @click="router.push('/orders')"
        >
          <el-icon :size="28" color="#67c23a"><List /></el-icon>
          <span>{{ $t('dashboard.viewOrders') }}</span>
        </el-card>
        <el-card
          v-if="authStore.userRole === 'admin'"
          class="action-card"
          shadow="hover"
          @click="router.push('/users')"
        >
          <el-icon :size="28" color="#e6a23c"><User /></el-icon>
          <span>{{ $t('menu.users') }}</span>
        </el-card>
        <el-card
          v-if="authStore.userRole === 'admin'"
          class="action-card"
          shadow="hover"
          @click="router.push('/inquiries')"
        >
          <el-icon :size="28" color="#409eff"><Document /></el-icon>
          <span>{{ $t('dashboard.viewInquiries') }}</span>
        </el-card>
        <el-card
          v-if="authStore.userRole === 'admin'"
          class="action-card"
          shadow="hover"
          @click="router.push('/orders')"
        >
          <el-icon :size="28" color="#67c23a"><List /></el-icon>
          <span>{{ $t('dashboard.viewOrders') }}</span>
        </el-card>
        <el-card
          v-if="authStore.userRole === 'admin'"
          class="action-card"
          shadow="hover"
          @click="router.push('/audit-logs')"
        >
          <el-icon :size="28" color="#909399"><Tickets /></el-icon>
          <span>{{ $t('menu.audit') }}</span>
        </el-card>
      </div>
    </div>

    <!-- Role info -->
    <div class="role-info">
      <el-card>
        <template #header>
          <span>{{ $t('auth.username') }}: {{ authStore.user?.username }}</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('user.role')">
            <el-tag>{{ roleLabel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('user.company')">
            {{ authStore.user?.company }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Document, List, User, Tickets } from '@element-plus/icons-vue';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const roleLabel = computed(() => {
  const role = authStore.userRole;
  if (role === 'admin') return t('user.roleAdmin');
  if (role === 'buyer') return t('user.roleBuyer');
  if (role === 'supplier') return t('user.roleSupplier');
  return role;
});
</script>

<style scoped>
.dashboard {
  padding: 24px;
}

.welcome-section {
  margin-bottom: 32px;
}

.welcome-section h1 {
  color: #303133;
  font-size: 24px;
  margin-bottom: 8px;
}

.welcome-section .subtitle {
  color: #909399;
  font-size: 14px;
}

.quick-actions {
  margin-bottom: 32px;
}

.quick-actions h3 {
  color: #606266;
  margin-bottom: 16px;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.action-card {
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s;
}

.action-card:hover {
  transform: translateY(-2px);
}

.action-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
}

.action-card span {
  font-size: 14px;
  color: #606266;
}

.role-info {
  max-width: 600px;
}
</style>
