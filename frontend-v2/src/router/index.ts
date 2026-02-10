import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'menu.dashboard' },
        },
        {
          path: 'inquiries',
          name: 'Inquiries',
          component: () => import('@/views/InquiryListView.vue'),
          meta: { title: 'menu.inquiries' },
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('@/views/OrderListView.vue'),
          meta: { title: 'menu.orders' },
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/UserListView.vue'),
          meta: { title: 'menu.users', requiredRole: 'admin' },
        },
        {
          path: 'audit-logs',
          name: 'AuditLogs',
          component: () => import('@/views/AuditLogView.vue'),
          meta: { title: 'menu.audit', requiredRole: 'admin' },
        },
        {
          path: 'trash',
          name: 'Trash',
          component: () => import('@/views/TrashView.vue'),
          meta: { title: 'menu.trash', requiredRole: 'admin' },
        },
        {
          path: 'change-password',
          name: 'ChangePassword',
          component: () => import('@/views/ChangePasswordView.vue'),
          meta: { title: 'user.changePassword' },
        },
      ],
    },
  ],
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');

  if (to.meta.public) {
    if (token && to.name === 'Login') {
      next({ name: 'Dashboard' });
    } else {
      next();
    }
    return;
  }

  if (!token) {
    next({ name: 'Login' });
    return;
  }

  // Role-based access control
  if (to.meta.requiredRole) {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (user?.role !== to.meta.requiredRole) {
      next({ name: 'Dashboard' });
      return;
    }
  }

  next();
});

export default router;
