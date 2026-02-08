import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/types';

const mockUser: User = {
  id: 'test-id',
  username: 'testuser',
  role: 'admin',
  company: 'admin',
  language: 'zh',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initializes with no auth', () => {
    const store = useAuthStore();
    expect(store.isLoggedIn).toBe(false);
    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
  });

  it('setAuth stores token and user', () => {
    const store = useAuthStore();
    store.setAuth('test-token', mockUser);

    expect(store.isLoggedIn).toBe(true);
    expect(store.token).toBe('test-token');
    expect(store.user).toEqual(mockUser);
    expect(store.userRole).toBe('admin');
    expect(store.userCompany).toBe('admin');
    expect(store.userLanguage).toBe('zh');
    expect(localStorage.getItem('token')).toBe('test-token');
  });

  it('clearAuth removes token and user', () => {
    const store = useAuthStore();
    store.setAuth('test-token', mockUser);
    store.clearAuth();

    expect(store.isLoggedIn).toBe(false);
    expect(store.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('updateUser updates user data', () => {
    const store = useAuthStore();
    store.setAuth('test-token', mockUser);

    const updated = { ...mockUser, language: 'ja' as const };
    store.updateUser(updated);

    expect(store.user?.language).toBe('ja');
  });

  it('userLanguage defaults to zh when no user', () => {
    const store = useAuthStore();
    expect(store.userLanguage).toBe('zh');
  });
});
