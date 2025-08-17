import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { createI18n } from 'vue-i18n';

import App from './App.vue';
import router from './router';
import { messages } from './locales';
import './services/api'; // Initialize axios configuration

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'zh',
  messages,
});

const app = createApp(App);

// Register Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.use(i18n);

app.mount('#app');