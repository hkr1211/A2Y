import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/types/user';

// Define route meta interface
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresGuest?: boolean;
    roles?: UserRole[];
    title?: string;
  }
}

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
      component: () => import('@/views/Login.vue'),
      meta: { 
        requiresGuest: true,
        title: 'login.title'
      },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { 
        requiresAuth: true,
        title: 'dashboard.title'
      },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/Users.vue'),
      meta: { 
        requiresAuth: true,
        roles: ['admin'],
        title: 'users.title'
      },
    },
    {
      path: '/inquiries',
      name: 'inquiries',
      component: () => import('@/views/Inquiries.vue'),
      meta: { 
        requiresAuth: true,
        roles: ['admin', 'buyer', 'supplier'],
        title: 'inquiries.title'
      },
    },
    {
      path: '/quotations',
      name: 'quotations',
      component: () => import('@/views/Quotations.vue'),
      meta: { 
        requiresAuth: true,
        roles: ['admin', 'supplier'],
        title: 'quotations.title'
      },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/Orders.vue'),
      meta: { 
        requiresAuth: true,
        roles: ['admin', 'buyer', 'supplier'],
        title: 'orders.title'
      },
    },
    {
      path: '/chat-demo',
      name: 'chat-demo',
      component: () => import('@/components/ChatDemo.vue'),
      meta: { 
        requiresAuth: true,
        roles: ['admin', 'buyer', 'supplier'],
        title: 'Chat Demo'
      },
    },
  ],
});

// Authentication and authorization guard
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

export default router;