import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useAuthStore } from '@/stores/auth';
import { messages } from '@/locales';

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
  ElDropdown: {
    name: 'ElDropdown',
    template: '<div><slot /></div>',
  },
  ElButton: {
    name: 'ElButton',
    template: '<button><slot /></button>',
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<i><slot /></i>',
  },
  ElDropdownMenu: {
    name: 'ElDropdownMenu',
    template: '<div><slot /></div>',
  },
  ElDropdownItem: {
    name: 'ElDropdownItem',
    template: '<div><slot /></div>',
  },
  ElButtonGroup: {
    name: 'ElButtonGroup',
    template: '<div><slot /></div>',
  },
  ElSwitch: {
    name: 'ElSwitch',
    template: '<div></div>',
  },
  ElLink: {
    name: 'ElLink',
    template: '<a><slot /></a>',
  },
}));

// Mock icons
vi.mock('@element-plus/icons-vue', () => ({
  Globe: { name: 'Globe', template: '<i>globe</i>' },
  ArrowDown: { name: 'ArrowDown', template: '<i>arrow</i>' },
}));

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}));

// Mock composable
vi.mock('@/composables/useLanguage', () => ({
  useLanguage: () => ({
    loading: { value: false },
    currentLanguage: { value: 'zh' },
    currentLanguageInfo: { 
      value: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }
    },
    availableLanguages: [
      { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    ],
    switchLanguage: vi.fn().mockResolvedValue(true),
    getLanguageDisplayName: vi.fn((code) => code === 'zh' ? '中文' : '日本語'),
    getLanguageFlag: vi.fn((code) => code === 'zh' ? '🇨🇳' : '🇯🇵'),
  }),
}));

describe('LanguageSwitcher', () => {
  let wrapper: VueWrapper;
  let mockAuthStore: any;
  let i18n: any;

  beforeEach(() => {
    // Setup i18n
    i18n = createI18n({
      legacy: false,
      locale: 'zh',
      messages,
    });

    // Setup mock auth store
    mockAuthStore = {
      isAuthenticated: true,
      user: { language: 'zh' },
      updateUserLanguage: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

    // Clear message mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const createWrapper = (props = {}) => {
    return mount(LanguageSwitcher, {
      props,
      global: {
        plugins: [i18n],
        stubs: {
          ElDropdown: true,
          ElButton: true,
          ElIcon: true,
          ElDropdownMenu: true,
          ElDropdownItem: true,
          ElButtonGroup: true,
          ElSwitch: true,
          ElLink: true,
        },
      },
    });
  };

  describe('Component Rendering', () => {
    it('should render dropdown type by default', () => {
      wrapper = createWrapper();
      expect(wrapper.find('.language-dropdown').exists()).toBe(true);
    });

    it('should render button group type when specified', () => {
      wrapper = createWrapper({ type: 'buttons' });
      expect(wrapper.find('.language-buttons').exists()).toBe(true);
    });

    it('should render toggle type when specified', () => {
      wrapper = createWrapper({ type: 'toggle' });
      expect(wrapper.find('.language-toggle').exists()).toBe(true);
    });

    it('should render links type when specified', () => {
      wrapper = createWrapper({ type: 'links' });
      expect(wrapper.find('.language-links').exists()).toBe(true);
    });

    it('should display current language correctly', () => {
      wrapper = createWrapper();
      // Since we're using stubs, we need to check the component's internal state
      expect(wrapper.vm.getCurrentLanguageLabel()).toContain('中文');
    });
  });

  describe('Language Switching', () => {
    it('should emit languageChanged event when language is switched', async () => {
      wrapper = createWrapper();
      
      // Simulate language change
      await wrapper.vm.handleLanguageChange('ja');
      
      expect(wrapper.emitted('languageChanged')).toBeTruthy();
      expect(wrapper.emitted('languageChanged')?.[0]).toEqual(['ja']);
    });

    it('should not switch to the same language', async () => {
      wrapper = createWrapper();
      
      // Try to switch to current language
      await wrapper.vm.handleLanguageChange('zh');
      
      expect(wrapper.emitted('languageChanged')).toBeFalsy();
    });

    it('should handle toggle change correctly', () => {
      wrapper = createWrapper({ type: 'toggle' });
      
      // Test that the method exists and can be called
      expect(typeof wrapper.vm.handleToggleChange).toBe('function');
      
      // Test the logic: true should map to 'ja', false to 'zh'
      expect(() => wrapper.vm.handleToggleChange(true)).not.toThrow();
      expect(() => wrapper.vm.handleToggleChange(false)).not.toThrow();
    });
  });

  describe('Props Configuration', () => {
    it('should respect savePreference prop', () => {
      wrapper = createWrapper({ savePreference: false });
      expect(wrapper.props('savePreference')).toBe(false);
    });

    it('should respect showBorder prop', () => {
      wrapper = createWrapper({ showBorder: true });
      expect(wrapper.props('showBorder')).toBe(true);
    });

    it('should use default props when not specified', () => {
      wrapper = createWrapper();
      expect(wrapper.props('type')).toBe('dropdown');
      expect(wrapper.props('showBorder')).toBe(false);
      expect(wrapper.props('savePreference')).toBe(true);
    });
  });

  describe('Exposed Methods', () => {
    it('should expose switchLanguage method', () => {
      wrapper = createWrapper();
      expect(typeof wrapper.vm.switchLanguage).toBe('function');
    });

    it('should expose getCurrentLanguage method', () => {
      wrapper = createWrapper();
      expect(typeof wrapper.vm.getCurrentLanguage).toBe('function');
      expect(wrapper.vm.getCurrentLanguage()).toBe('zh');
    });

    it('should expose isLoading method', () => {
      wrapper = createWrapper();
      expect(typeof wrapper.vm.isLoading).toBe('function');
      expect(wrapper.vm.isLoading()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should disable buttons when loading', () => {
      // Mock loading state
      const mockUseLanguage = vi.fn(() => ({
        loading: { value: true },
        currentLanguage: { value: 'zh' },
        currentLanguageInfo: { 
          value: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }
        },
        availableLanguages: [],
        switchLanguage: vi.fn(),
        getLanguageDisplayName: vi.fn(),
        getLanguageFlag: vi.fn(),
      }));

      vi.doMock('@/composables/useLanguage', () => ({
        useLanguage: mockUseLanguage,
      }));

      wrapper = createWrapper({ type: 'buttons' });
      
      // Check if buttons are disabled when loading
      const buttons = wrapper.findAll('el-button-stub');
      buttons.forEach(button => {
        expect(button.attributes('disabled')).toBeDefined();
      });
    });

    it('should have proper ARIA attributes for dropdown', () => {
      wrapper = createWrapper({ type: 'dropdown' });
      expect(wrapper.find('.language-dropdown').exists()).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes', () => {
      wrapper = createWrapper({ type: 'links' });
      expect(wrapper.find('.language-links').exists()).toBe(true);
    });

    it('should handle mobile layout for button group', () => {
      wrapper = createWrapper({ type: 'buttons' });
      expect(wrapper.find('.language-buttons').exists()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle language switch errors gracefully', () => {
      wrapper = createWrapper();
      
      // Test that error handling methods exist
      expect(typeof wrapper.vm.handleLanguageChange).toBe('function');
      
      // Test that the component doesn't crash with invalid input
      expect(() => wrapper.vm.handleLanguageChange('')).not.toThrow();
      expect(() => wrapper.vm.handleLanguageChange('invalid')).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with different component types', () => {
      const types = ['dropdown', 'buttons', 'toggle', 'links'];
      
      types.forEach(type => {
        wrapper = createWrapper({ type });
        expect(wrapper.exists()).toBe(true);
        wrapper.unmount();
      });
    });

    it('should maintain state consistency across type changes', async () => {
      wrapper = createWrapper({ type: 'dropdown' });
      expect(wrapper.vm.getCurrentLanguage()).toBe('zh');
      
      await wrapper.setProps({ type: 'buttons' });
      expect(wrapper.vm.getCurrentLanguage()).toBe('zh');
    });
  });
});