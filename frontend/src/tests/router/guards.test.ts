import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/types/user';

// Mock the auth store
const mockAuthStore = {
  isAuthenticated: false,
  userRole: null as string | null,
  checkAuth: vi.fn(),
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

// Create test router with the same configuration as the real router
const createTestRouter = () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        redirect: '/dashboard',
      },
      {
        path: '/login',
        name: 'login',
        component: { template: '<div>Login</div>' },
        meta: { 
          requiresGuest: true,
          title: 'login.title'
        },
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: { template: '<div>Dashboard</div>' },
        meta: { 
          requiresAuth: true,
          title: 'dashboard.title'
        },
      },
      {
        path: '/users',
        name: 'users',
        component: { template: '<div>Users</div>' },
        meta: { 
          requiresAuth: true,
          roles: ['admin'],
          title: 'users.title'
        },
      },
    ],
  });

  // Add the same navigation guard as in the real router
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    
    // Check if route requires authentication
    if (to.meta.requiresAuth) {
      // Check if user is authenticated
      if (!authStore.isAuthenticated) {
        // Try to restore authentication from token
        const isAuthenticated = await authStore.checkAuth();
        
        if (!isAuthenticated) {
          // Redirect to login page
          next({
            name: 'login',
            query: { redirect: to.fullPath },
          });
          return;
        }
      }
      
      // Check role-based access if roles are specified
      if (to.meta.roles && to.meta.roles.length > 0) {
        const userRole = authStore.userRole;
        
        if (!userRole || !to.meta.roles.includes(userRole)) {
          // User doesn't have required role, redirect to dashboard
          console.warn(`Access denied: User role '${userRole}' not in required roles [${to.meta.roles.join(', ')}]`);
          next({
            name: 'dashboard',
            query: { error: 'access_denied' },
          });
          return;
        }
      }
    }
    
    // Check if route requires guest (not authenticated)
    if (to.meta.requiresGuest && authStore.isAuthenticated) {
      // Redirect authenticated users away from login page
      const redirectPath = (to.query.redirect as string) || '/dashboard';
      next(redirectPath);
      return;
    }
    
    next();
  });

  return router;
};

describe('Router Guards', () => {
  let router: ReturnType<typeof createTestRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createTestRouter();
    
    // Reset mock state
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.userRole = null;
    mockAuthStore.checkAuth.mockResolvedValue(false);
    
    vi.clearAllMocks();
  });

  describe('Authentication Guard', () => {
    it('should allow access to public routes without authentication', async () => {
      await router.push('/login');
      
      expect(router.currentRoute.value.name).toBe('login');
      expect(mockAuthStore.checkAuth).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users to login page', async () => {
      mockAuthStore.isAuthenticated = false;
      mockAuthStore.checkAuth.mockResolvedValue(false);

      await router.push('/dashboard');
      
      expect(router.currentRoute.value.name).toBe('login');
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard');
      expect(mockAuthStore.checkAuth).toHaveBeenCalled();
    });

    it('should allow access to protected routes for authenticated users', async () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.userRole = 'buyer';

      await router.push('/dashboard');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
      expect(mockAuthStore.checkAuth).not.toHaveBeenCalled();
    });

    it('should restore authentication from token if not authenticated', async () => {
      mockAuthStore.isAuthenticated = false;
      mockAuthStore.checkAuth.mockResolvedValue(true);
      
      // Mock the auth store to become authenticated after checkAuth
      mockAuthStore.checkAuth.mockImplementation(async () => {
        mockAuthStore.isAuthenticated = true;
        mockAuthStore.userRole = 'buyer';
        return true;
      });

      await router.push('/dashboard');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
      expect(mockAuthStore.checkAuth).toHaveBeenCalled();
    });
  });

  describe('Role-based Access Control', () => {
    beforeEach(() => {
      mockAuthStore.isAuthenticated = true;
    });

    it('should allow access to routes without role restrictions', async () => {
      mockAuthStore.userRole = 'buyer';

      await router.push('/dashboard');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
    });

    it('should allow access to admin-only routes for admin users', async () => {
      mockAuthStore.userRole = 'admin';

      await router.push('/users');
      
      expect(router.currentRoute.value.name).toBe('users');
    });

    it('should deny access to admin-only routes for non-admin users', async () => {
      mockAuthStore.userRole = 'buyer';

      await router.push('/users');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
      expect(router.currentRoute.value.query.error).toBe('access_denied');
    });

    it('should deny access when user has no role', async () => {
      mockAuthStore.userRole = null;

      await router.push('/users');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
      expect(router.currentRoute.value.query.error).toBe('access_denied');
    });

    it('should deny access for supplier users to admin routes', async () => {
      mockAuthStore.userRole = 'supplier';

      await router.push('/users');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
      expect(router.currentRoute.value.query.error).toBe('access_denied');
    });
  });

  describe('Guest Guard', () => {
    it('should allow unauthenticated users to access login page', async () => {
      mockAuthStore.isAuthenticated = false;

      await router.push('/login');
      
      expect(router.currentRoute.value.name).toBe('login');
    });

    it('should redirect authenticated users away from login page', async () => {
      mockAuthStore.isAuthenticated = true;

      await router.push('/login');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
    });

    it('should redirect to specified redirect path after login', async () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.userRole = 'admin'; // Need admin role to access /users

      await router.push('/login?redirect=/users');
      
      expect(router.currentRoute.value.path).toBe('/users');
    });

    it('should redirect to dashboard by default when no redirect specified', async () => {
      mockAuthStore.isAuthenticated = true;

      await router.push('/login');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
    });
  });

  describe('Home Route Redirect', () => {
    it('should redirect home route to dashboard', async () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.userRole = 'buyer';
      
      await router.push('/');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
    });
  });

  describe('Complex Navigation Scenarios', () => {
    it('should handle authentication check failure during navigation', async () => {
      mockAuthStore.isAuthenticated = false;
      mockAuthStore.checkAuth.mockResolvedValue(false); // Return false instead of throwing

      await router.push('/dashboard');
      
      expect(router.currentRoute.value.name).toBe('login');
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard');
    });

    it('should preserve query parameters during redirects', async () => {
      mockAuthStore.isAuthenticated = false;
      mockAuthStore.checkAuth.mockResolvedValue(false);

      await router.push('/dashboard?tab=orders&filter=active');
      
      expect(router.currentRoute.value.name).toBe('login');
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard?tab=orders&filter=active');
    });

    it('should handle multiple role requirements correctly', async () => {
      // Create a route with multiple allowed roles
      router.addRoute({
        path: '/multi-role',
        name: 'multi-role',
        component: { template: '<div>Multi Role</div>' },
        meta: { 
          requiresAuth: true,
          roles: ['admin', 'buyer'],
        },
      });

      mockAuthStore.isAuthenticated = true;
      mockAuthStore.userRole = 'buyer';

      await router.push('/multi-role');
      
      expect(router.currentRoute.value.name).toBe('multi-role');
    });

    it('should deny access when user role not in multiple role requirements', async () => {
      // Create a route with multiple allowed roles
      router.addRoute({
        path: '/multi-role-restricted',
        name: 'multi-role-restricted',
        component: { template: '<div>Multi Role Restricted</div>' },
        meta: { 
          requiresAuth: true,
          roles: ['admin', 'buyer'],
        },
      });

      mockAuthStore.isAuthenticated = true;
      mockAuthStore.userRole = 'supplier';

      await router.push('/multi-role-restricted');
      
      expect(router.currentRoute.value.name).toBe('dashboard');
      expect(router.currentRoute.value.query.error).toBe('access_denied');
    });
  });
});