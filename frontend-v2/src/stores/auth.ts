import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, UserRole, Company, Language } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(
    (() => {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    })()
  );

  const isLoggedIn = computed(() => !!token.value);
  const userRole = computed<UserRole | null>(() => user.value?.role ?? null);
  const userCompany = computed<Company | null>(
    () => user.value?.company ?? null
  );
  const userLanguage = computed<Language>(
    () => user.value?.language ?? 'zh'
  );

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function updateUser(updated: User) {
    user.value = updated;
    localStorage.setItem('user', JSON.stringify(updated));
  }

  return {
    token,
    user,
    isLoggedIn,
    userRole,
    userCompany,
    userLanguage,
    setAuth,
    clearAuth,
    updateUser,
  };
});
