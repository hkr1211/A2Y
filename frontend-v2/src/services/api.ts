import axios from 'axios';
import type { ApiErrorResponse } from '@/types';

const FALLBACK_MESSAGES: Record<string, { request: string; network: string }> = {
  zh: { request: '请求失败', network: '网络连接失败' },
  ja: { request: 'リクエスト失敗', network: 'ネットワーク接続失敗' },
};

function getFallback(key: 'request' | 'network'): string {
  const lang = localStorage.getItem('language') || 'zh';
  return (FALLBACK_MESSAGES[lang] || FALLBACK_MESSAGES.zh)[key];
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data as ApiErrorResponse;

      // Token expired or invalid
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Return the error message from API
      const message = data?.error?.message || getFallback('request');
      return Promise.reject(new Error(message));
    }

    // Network error
    return Promise.reject(new Error(getFallback('network')));
  }
);

export default api;
