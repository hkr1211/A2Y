import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import type { User, LoginForm } from '@/types/user';
import type { ApiResponse } from '@/types/api';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
    interceptors: {
      response: {
        use: vi.fn(),
      },
    },
  },
}));

const mockedAxios = vi.mocked(axios);

describe('Auth Store', () => {
  let authStore: ReturnType<typeof useAuthStore>;

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    role: 'buyer',
    company: 'arroz',
    language: 'zh',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    // Clear localStorage first
    localStorageMock.clear();
    vi.clearAllMocks();
    
    setActivePinia(createPinia());
    authStore = useAuthStore();
    
    // Clear axios defaults
    delete mockedAxios.defaults.headers.common['Authorization'];
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(authStore.loading).toBe(false);
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.userRole).toBeNull();
      expect(authStore.userCompany).toBeNull();
      expect(authStore.userLanguage).toBe('zh');
    });

    it('should load token from localStorage', () => {
      localStorageMock.setItem('token', mockToken);
      
      // Create new store instance to test initialization
      setActivePinia(createPinia());
      const newAuthStore = useAuthStore();
      
      expect(newAuthStore.token).toBe(mockToken);
    });
  });

  describe('Login', () => {
    const loginForm: LoginForm = {
      username: 'testuser',
      password: 'password123',
    };

    it('should login successfully', async () => {
      const mockResponse: ApiResponse<{ user: User; token: string }> = {
        success: true,
        data: {
          user: mockUser,
          token: mockToken,
        },
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await authStore.login(loginForm);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', loginForm);
      expect(authStore.user).toEqual(mockUser);
      expect(authStore.token).toBe(mockToken);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.userRole).toBe('buyer');
      expect(authStore.userCompany).toBe('arroz');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken);
      expect(mockedAxios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should handle login failure', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: {
              message: 'Invalid credentials',
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(errorResponse);

      await expect(authStore.login(loginForm)).rejects.toThrow();
      
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockedAxios.post.mockReturnValueOnce(loginPromise);

      const loginCall = authStore.login(loginForm);
      
      expect(authStore.loading).toBe(true);

      resolveLogin!({
        data: {
          success: true,
          data: { user: mockUser, token: mockToken },
        },
      });

      await loginCall;
      
      expect(authStore.loading).toBe(false);
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      // Set up authenticated state
      authStore.user = mockUser;
      authStore.token = mockToken;
      localStorageMock.setItem('token', mockToken);
      mockedAxios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    });

    it('should logout successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await authStore.logout();

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/logout');
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(mockedAxios.defaults.headers.common['Authorization']).toBeUndefined();
    });

    it('should clear state even if logout API fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await authStore.logout();

      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(authStore.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(mockedAxios.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('Check Auth', () => {
    it('should return false when no token exists', async () => {
      const result = await authStore.checkAuth();
      
      expect(result).toBe(false);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should verify token and update user data', async () => {
      authStore.token = mockToken;
      localStorageMock.setItem('token', mockToken);

      const mockResponse: ApiResponse<User> = {
        success: true,
        data: mockUser,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await authStore.checkAuth();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/auth/me');
      expect(mockedAxios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`);
      expect(authStore.user).toEqual(mockUser);
      expect(result).toBe(true);
    });

    it('should logout when token verification fails', async () => {
      authStore.token = mockToken;
      localStorageMock.setItem('token', mockToken);

      mockedAxios.get.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await authStore.checkAuth();

      expect(result).toBe(false);
      expect(authStore.user).toBeNull();
      expect(authStore.token).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Update User Language', () => {
    beforeEach(() => {
      authStore.user = mockUser;
      authStore.token = mockToken;
    });

    it('should update user language successfully', async () => {
      const updatedUser = { ...mockUser, language: 'ja' as const };
      const mockResponse: ApiResponse<User> = {
        success: true,
        data: updatedUser,
      };

      mockedAxios.put.mockResolvedValueOnce({ data: mockResponse });

      await authStore.updateUserLanguage('ja');

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/users/language', {
        language: 'ja',
      });
      expect(authStore.user).toEqual(updatedUser);
      expect(authStore.userLanguage).toBe('ja');
    });

    it('should handle language update failure', async () => {
      mockedAxios.put.mockRejectedValueOnce(new Error('Update failed'));

      await expect(authStore.updateUserLanguage('ja')).rejects.toThrow();
      
      // User should remain unchanged
      expect(authStore.user).toEqual(mockUser);
      expect(authStore.userLanguage).toBe('zh');
    });

    it('should not update when user is not authenticated', async () => {
      authStore.user = null;

      await authStore.updateUserLanguage('ja');

      expect(mockedAxios.put).not.toHaveBeenCalled();
    });
  });

  describe('Initialize Interceptors', () => {
    it('should set up axios response interceptor', () => {
      authStore.initializeInterceptors();

      expect(mockedAxios.interceptors.response.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('Computed Properties', () => {
    it('should compute isAuthenticated correctly', () => {
      expect(authStore.isAuthenticated).toBe(false);

      authStore.token = mockToken;
      expect(authStore.isAuthenticated).toBe(false); // Still false without user

      authStore.user = mockUser;
      expect(authStore.isAuthenticated).toBe(true);
    });

    it('should compute user properties correctly', () => {
      authStore.user = mockUser;

      expect(authStore.userRole).toBe('buyer');
      expect(authStore.userCompany).toBe('arroz');
      expect(authStore.userLanguage).toBe('zh');
    });

    it('should return defaults when user is null', () => {
      authStore.user = null;

      expect(authStore.userRole).toBeNull();
      expect(authStore.userCompany).toBeNull();
      expect(authStore.userLanguage).toBe('zh');
    });
  });
});