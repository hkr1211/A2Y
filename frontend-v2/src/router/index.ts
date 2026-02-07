import { createRouter, createWebHistory } from 'vue-router';

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
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: 'menu.dashboard' },
    },
    // Phase 2+: More routes will be added here
  ],
});

// Navigation guard: redirect to login if not authenticated
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');

  if (to.meta.public) {
    // If already logged in, redirect to dashboard
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

  next();
});

export default router;
