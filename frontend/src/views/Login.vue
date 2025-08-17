<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('login.title') }}</h2>
          <p class="subtitle">{{ $t('login.subtitle') }}</p>
        </div>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="0"
        size="large"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            :placeholder="$t('login.usernamePlaceholder')"
            prefix-icon="User"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            :placeholder="$t('login.passwordPlaceholder')"
            prefix-icon="Lock"
            show-password
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="authStore.loading"
            :disabled="!isFormValid"
            class="login-button"
            @click="handleLogin"
          >
            {{ $t('login.loginButton') }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="language-switch">
        <el-radio-group v-model="currentLanguage" @change="handleLanguageChange">
          <el-radio-button label="zh">中文</el-radio-button>
          <el-radio-button label="ja">日本語</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import type { LoginForm } from '@/types/user';

const router = useRouter();
const { t, locale } = useI18n();
const authStore = useAuthStore();

// Form reference
const loginFormRef = ref<FormInstance>();

// Form data
const loginForm = reactive<LoginForm>({
  username: '',
  password: '',
});

// Current language
const currentLanguage = ref(locale.value);

// Form validation rules
const loginRules: FormRules = {
  username: [
    { required: true, message: () => t('login.usernameRequired'), trigger: 'blur' },
    { min: 3, max: 50, message: () => t('login.usernameLength'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: () => t('login.passwordRequired'), trigger: 'blur' },
    { min: 6, message: () => t('login.passwordLength'), trigger: 'blur' },
  ],
};

// Computed properties
const isFormValid = computed(() => {
  return loginForm.username.length >= 3 && loginForm.password.length >= 6;
});

// Methods
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  try {
    // Validate form
    const valid = await loginFormRef.value.validate();
    if (!valid) return;

    // Attempt login
    await authStore.login(loginForm);
    
    // Show success message
    ElMessage.success(t('login.loginSuccess'));
    
    // Redirect to dashboard
    await router.push('/dashboard');
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Show error message
    const errorMessage = error.response?.data?.error?.message || error.message || t('login.loginError');
    ElMessage.error(errorMessage);
  }
};

const handleLanguageChange = (lang: string) => {
  locale.value = lang;
  localStorage.setItem('language', lang);
};

// Lifecycle
onMounted(() => {
  // Initialize auth interceptors
  authStore.initializeInterceptors();
  
  // Check if already authenticated
  if (authStore.isAuthenticated) {
    router.push('/dashboard');
  }
  
  // Load saved language preference
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'ja')) {
    currentLanguage.value = savedLanguage;
    locale.value = savedLanguage;
  }
});
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  text-align: center;
  margin-bottom: 0;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.language-switch {
  margin-top: 20px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__inner) {
  height: 44px;
  line-height: 44px;
}

:deep(.el-card__header) {
  padding: 20px 20px 0 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}
</style>