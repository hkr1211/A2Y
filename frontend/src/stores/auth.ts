import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import type { User, LoginForm, AuthState } from '@/types/user';
import type { ApiResponse } from '@/types/api';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const loading = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const userRole = computed(() => user.value?.role || null);
  const userCompany = computed(() => user.value?.company || null);
  const userLanguage = computed(() => user.value?.language || 'zh');

  // Actions
  const login = async (loginForm: LoginForm): Promise<void> => {
    loading.value = true;
    try {
      const response = await axios.post<ApiResponse<{ user: User; token: string }>>(
        '/api/auth/login',
        loginForm
      );

      if (response.data.success && response.data.data) {
        const { user: userData, token: authToken } = response.data.data;
        
        // Update state
        user.value = userData;
        token.value = authToken;
        
        // Store token in localStorage
        localStorage.setItem('token', authToken);
        
        // Set default axios header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (error: any) {
      // Clear any existing auth data
      await logout();
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout API if token exists
      if (token.value) {
        await axios.post('/api/auth/logout');
      }
    } catch (error) {
      // Ignore logout API errors, still clear local state
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear state
      user.value = null;
      token.value = null;
      
      // Clear localStorage
      localStorage.removeItem('token');
      
      // Clear axios header
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    if (!token.value) {
      return false;
    }

    try {
      // Set axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
      
      // Verify token with server
      const response = await axios.get<ApiResponse<User>>('/api/auth/me');
      
      if (response.data.success && response.data.data) {
        user.value = response.data.data;
        return true;
      } else {
        await logout();
        return false;
      }
    } catch (error) {
      await logout();
      return false;
    }
  };

  const updateUserLanguage = async (language: 'zh' | 'ja'): Promise<void> => {
    if (!user.value) return;

    try {
      const response = await axios.put<ApiResponse<User>>('/api/users/language', {
        language,
      });

      if (response.data.success && response.data.data) {
        user.value = response.data.data;
      }
    } catch (error) {
      console.error('Failed to update user language:', error);
      throw error;
    }
  };

  // Initialize axios interceptor for token refresh
  const initializeInterceptors = () => {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && token.value) {
          // Token expired or invalid
          await logout();
          // Redirect to login will be handled by router guard
        }
        return Promise.reject(error);
      }
    );
  };

  return {
    // State
    user,
    token,
    loading,
    
    // Getters
    isAuthenticated,
    userRole,
    userCompany,
    userLanguage,
    
    // Actions
    login,
    logout,
    checkAuth,
    updateUserLanguage,
    initializeInterceptors,
  };
});