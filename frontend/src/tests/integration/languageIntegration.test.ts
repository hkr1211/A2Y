import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createPinia } from 'pinia';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { messages } from '@/locales';

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    user: { language: 'zh' },
    updateUserLanguage: vi.fn().mockResolvedValue({}),
  })),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Language Integration Tests', () => {
  let i18n: any;
  let pinia: any;

  beforeEach(() => {
    // Setup i18n
    i18n = createI18n({
      legacy: false,
      locale: 'zh',
      messages,
    });

    // Setup pinia
    pinia = createPinia();

    // Clear mocks
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Language Switching Integration', () => {
    it('should integrate with i18n and change locale', async () => {
      const wrapper = mount(LanguageSwitcher, {
        props: {
          type: 'dropdown',
          savePreference: false, // Don't save to avoid API calls
        },
        global: {
          plugins: [i18n, pinia],
        },
      });

      // Initial locale should be Chinese
      expect(i18n.global.locale.value).toBe('zh');

      // Switch to Japanese
      await wrapper.vm.handleLanguageChange('ja');

      // Locale should be updated
      expect(i18n.global.locale.value).toBe('ja');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('language', 'ja');

      wrapper.unmount();
    });

    it('should handle different component types', () => {
      const types = ['dropdown', 'buttons', 'toggle', 'links'];

      types.forEach(type => {
        const wrapper = mount(LanguageSwitcher, {
          props: { type },
          global: {
            plugins: [i18n, pinia],
          },
        });

        expect(wrapper.exists()).toBe(true);
        expect(wrapper.vm.getCurrentLanguage()).toBe('zh');

        wrapper.unmount();
      });
    });

    it('should maintain language state across component instances', async () => {
      // Create first instance and switch language
      const wrapper1 = mount(LanguageSwitcher, {
        props: { savePreference: false },
        global: {
          plugins: [i18n, pinia],
        },
      });

      await wrapper1.vm.handleLanguageChange('ja');
      expect(i18n.global.locale.value).toBe('ja');

      // Create second instance - should reflect the current language
      const wrapper2 = mount(LanguageSwitcher, {
        props: { savePreference: false },
        global: {
          plugins: [i18n, pinia],
        },
      });

      expect(wrapper2.vm.getCurrentLanguage()).toBe('ja');

      wrapper1.unmount();
      wrapper2.unmount();
    });

    it('should emit events correctly', async () => {
      const wrapper = mount(LanguageSwitcher, {
        props: { savePreference: false },
        global: {
          plugins: [i18n, pinia],
        },
      });

      await wrapper.vm.handleLanguageChange('ja');

      expect(wrapper.emitted('languageChanged')).toBeTruthy();
      expect(wrapper.emitted('languageChanged')?.[0]).toEqual(['ja']);

      wrapper.unmount();
    });

    it('should handle localStorage integration', async () => {
      const wrapper = mount(LanguageSwitcher, {
        props: { savePreference: false },
        global: {
          plugins: [i18n, pinia],
        },
      });

      await wrapper.vm.handleLanguageChange('ja');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('language', 'ja');

      wrapper.unmount();
    });

    it('should not switch to same language', async () => {
      const wrapper = mount(LanguageSwitcher, {
        props: { savePreference: false },
        global: {
          plugins: [i18n, pinia],
        },
      });

      const initialLocale = i18n.global.locale.value;
      
      await wrapper.vm.handleLanguageChange('zh'); // Same as current

      expect(i18n.global.locale.value).toBe(initialLocale);
      expect(wrapper.emitted('languageChanged')).toBeFalsy();

      wrapper.unmount();
    });
  });

  describe('Accessibility and UX', () => {
    it('should provide proper language labels', () => {
      const wrapper = mount(LanguageSwitcher, {
        global: {
          plugins: [i18n, pinia],
        },
      });

      const label = wrapper.vm.getCurrentLanguageLabel();
      expect(label).toContain('🇨🇳');
      expect(label).toContain('中文');

      wrapper.unmount();
    });

    it('should handle loading states', () => {
      const wrapper = mount(LanguageSwitcher, {
        global: {
          plugins: [i18n, pinia],
        },
      });

      expect(wrapper.vm.isLoading()).toBe(false);

      wrapper.unmount();
    });

    it('should expose required methods', () => {
      const wrapper = mount(LanguageSwitcher, {
        global: {
          plugins: [i18n, pinia],
        },
      });

      expect(typeof wrapper.vm.switchLanguage).toBe('function');
      expect(typeof wrapper.vm.getCurrentLanguage).toBe('function');
      expect(typeof wrapper.vm.isLoading).toBe('function');

      wrapper.unmount();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid language codes gracefully', async () => {
      const wrapper = mount(LanguageSwitcher, {
        props: { savePreference: false },
        global: {
          plugins: [i18n, pinia],
        },
      });

      // Test that the component doesn't crash with invalid input
      expect(() => wrapper.vm.handleLanguageChange('invalid')).not.toThrow();
      expect(() => wrapper.vm.handleLanguageChange('')).not.toThrow();
      expect(() => wrapper.vm.handleLanguageChange(null as any)).not.toThrow();

      wrapper.unmount();
    });

    it('should handle component unmounting gracefully', () => {
      const wrapper = mount(LanguageSwitcher, {
        global: {
          plugins: [i18n, pinia],
        },
      });

      expect(() => wrapper.unmount()).not.toThrow();
    });
  });
});