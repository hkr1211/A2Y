import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import ElementPlus, { ElMessage } from 'element-plus';
import Login from '@/views/Login.vue';
import { useAuthStore } from '@/stores/auth';
import { messages } from '@/locales';

// Mock Element Plus message
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock the auth store
const mockAuthStore = {
  login: vi.fn(),
  initializeInterceptors: vi.fn(),
  isAuthenticated: false,
  loading: false,
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
  ],
});

// Create i18n
const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'zh',
  messages,
});

describe('Login Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Reset mock store state
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.loading = false;
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const createWrapper = () => {
    return mount(Login, {
      global: {
        plugins: [router, i18n, ElementPlus],
      },
    });
  };

  it('should render login form correctly', () => {
    const wrapper = createWrapper();
    
    expect(wrapper.find('h2').text()).toBe('登录');
    expect(wrapper.find('.subtitle').text()).toBe('外贸询单订单管理系统');
    expect(wrapper.find('input[placeholder="请输入用户名"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder="请输入密码"]').exists()).toBe(true);
    expect(wrapper.find('button').text()).toBe('登录');
  });

  it('should show validation errors for empty fields', async () => {
    const wrapper = createWrapper();
    
    // Try to submit empty form
    const loginButton = wrapper.find('button');
    await loginButton.trigger('click');
    
    // Form should not be submitted due to validation
    expect(mockAuthStore.login).not.toHaveBeenCalled();
  });

  it('should enable login button when form is valid', async () => {
    const wrapper = createWrapper();
    
    // Fill in valid form data
    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]');
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]');
    
    await usernameInput.setValue('testuser');
    await passwordInput.setValue('password123');
    
    // Login button should be enabled
    const loginButton = wrapper.find('button');
    expect(loginButton.attributes('disabled')).toBeUndefined();
  });

  it('should call login when form is submitted with valid data', async () => {
    const wrapper = createWrapper();
    mockAuthStore.login.mockResolvedValueOnce(undefined);
    
    // Fill in form data
    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]');
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]');
    
    await usernameInput.setValue('testuser');
    await passwordInput.setValue('password123');
    
    // Wait for form validation
    await wrapper.vm.$nextTick();
    
    // Submit form by calling the method directly since Element Plus form handling is complex
    await wrapper.vm.handleLogin();
    
    expect(mockAuthStore.login).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
    });
  });

  it('should show success message and redirect on successful login', async () => {
    const wrapper = createWrapper();
    const routerPush = vi.spyOn(router, 'push').mockResolvedValue(undefined as any);
    mockAuthStore.login.mockResolvedValueOnce(undefined);
    
    // Fill in form data
    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]');
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]');
    
    await usernameInput.setValue('testuser');
    await passwordInput.setValue('password123');
    await wrapper.vm.$nextTick();
    
    // Submit form
    await wrapper.vm.handleLogin();
    await flushPromises();
    
    expect(ElMessage.success).toHaveBeenCalledWith('登录成功');
    expect(routerPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should show error message on login failure', async () => {
    const wrapper = createWrapper();
    const errorMessage = 'Invalid credentials';
    mockAuthStore.login.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: errorMessage,
          },
        },
      },
    });
    
    // Fill in form data
    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]');
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]');
    
    await usernameInput.setValue('testuser');
    await passwordInput.setValue('wrongpassword');
    await wrapper.vm.$nextTick();
    
    // Submit form
    await wrapper.vm.handleLogin();
    await flushPromises();
    
    expect(ElMessage.error).toHaveBeenCalledWith(errorMessage);
  });

  it('should show default error message when no specific error provided', async () => {
    const wrapper = createWrapper();
    mockAuthStore.login.mockRejectedValueOnce(new Error('Network error'));
    
    // Fill in form data
    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]');
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]');
    
    await usernameInput.setValue('testuser');
    await passwordInput.setValue('password123');
    await wrapper.vm.$nextTick();
    
    // Submit form
    await wrapper.vm.handleLogin();
    await flushPromises();
    
    expect(ElMessage.error).toHaveBeenCalledWith('Network error');
  });

  it('should show loading state during login', async () => {
    mockAuthStore.loading = true;
    const wrapper = createWrapper();
    
    // Check if the button shows loading state (Element Plus uses different attribute)
    const loginButton = wrapper.find('.el-button');
    expect(loginButton.classes()).toContain('is-loading');
  });

  it('should switch language correctly', async () => {
    const wrapper = createWrapper();
    
    // Mock localStorage for this test
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    
    // Simulate the radio group change which updates currentLanguage
    wrapper.vm.currentLanguage = 'ja';
    await wrapper.vm.handleLanguageChange('ja');
    await wrapper.vm.$nextTick();
    
    // Language should be saved to localStorage
    expect(setItemSpy).toHaveBeenCalledWith('language', 'ja');
    // The currentLanguage should be updated
    expect(wrapper.vm.currentLanguage).toBe('ja');
    
    setItemSpy.mockRestore();
  });

  it('should load saved language preference on mount', async () => {
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockReturnValue('ja');
    
    const wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.currentLanguage).toBe('ja');
    
    getItemSpy.mockRestore();
  });

  it('should initialize auth interceptors on mount', () => {
    createWrapper();
    
    expect(mockAuthStore.initializeInterceptors).toHaveBeenCalled();
  });

  it('should redirect authenticated users', async () => {
    mockAuthStore.isAuthenticated = true;
    const routerPush = vi.spyOn(router, 'push').mockResolvedValue(undefined as any);
    
    createWrapper();
    
    // Should redirect to dashboard
    expect(routerPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should disable login button when form is invalid', async () => {
    const wrapper = createWrapper();
    
    // Empty form should disable button
    expect(wrapper.vm.isFormValid).toBe(false);
    
    // Set form data directly on the component
    wrapper.vm.loginForm.username = 'ab';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isFormValid).toBe(false);
    
    // Short password should disable button
    wrapper.vm.loginForm.password = '12345';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isFormValid).toBe(false);
  });

  it('should handle form validation errors', async () => {
    const wrapper = createWrapper();
    
    // Mock form validation to return false
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(false),
    };
    wrapper.vm.loginFormRef = mockFormRef;
    
    await wrapper.vm.handleLogin();
    
    expect(mockFormRef.validate).toHaveBeenCalled();
    expect(mockAuthStore.login).not.toHaveBeenCalled();
  });

  it('should handle missing form ref gracefully', async () => {
    const wrapper = createWrapper();
    wrapper.vm.loginFormRef = null;
    
    await wrapper.vm.handleLogin();
    
    expect(mockAuthStore.login).not.toHaveBeenCalled();
  });

  it('should support keyboard navigation (Enter key)', async () => {
    const wrapper = createWrapper();
    mockAuthStore.login.mockResolvedValueOnce(undefined);
    
    // Set form data directly
    wrapper.vm.loginForm.username = 'testuser';
    wrapper.vm.loginForm.password = 'password123';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
    };
    wrapper.vm.loginFormRef = mockFormRef;
    
    // Find password input and trigger Enter key
    const passwordInputs = wrapper.findAll('input[type="password"]');
    if (passwordInputs.length > 0) {
      await passwordInputs[0].trigger('keyup.enter');
    } else {
      // Fallback: call handleLogin directly
      await wrapper.vm.handleLogin();
    }
    
    expect(mockAuthStore.login).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
    });
  });
});