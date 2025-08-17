import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

export interface LanguageOption {
  code: 'zh' | 'ja';
  name: string;
  nativeName: string;
  flag: string;
}

export const useLanguage = () => {
  const { t, locale } = useI18n();
  const authStore = useAuthStore();
  const loading = ref(false);

  // Available languages
  const availableLanguages: LanguageOption[] = [
    {
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      flag: '🇨🇳',
    },
    {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flag: '🇯🇵',
    },
  ];

  // Current language
  const currentLanguage = computed(() => locale.value as 'zh' | 'ja');
  
  // Current language info
  const currentLanguageInfo = computed(() => 
    availableLanguages.find(lang => lang.code === currentLanguage.value)
  );

  // Check if language is supported
  const isLanguageSupported = (lang: string): lang is 'zh' | 'ja' => {
    return ['zh', 'ja'].includes(lang);
  };

  // Switch language
  const switchLanguage = async (
    targetLanguage: 'zh' | 'ja',
    savePreference: boolean = true
  ): Promise<boolean> => {
    if (targetLanguage === currentLanguage.value || loading.value) {
      return false;
    }

    loading.value = true;
    const previousLanguage = currentLanguage.value;

    try {
      // Update UI language immediately
      locale.value = targetLanguage;
      localStorage.setItem('language', targetLanguage);

      // Save user preference if enabled and authenticated
      if (savePreference && authStore.isAuthenticated) {
        await authStore.updateUserLanguage(targetLanguage);
        ElMessage.success(t('language.saveSuccess'));
      } else {
        ElMessage.success(t('language.switchSuccess'));
      }

      return true;
    } catch (error) {
      console.error('Failed to switch language:', error);

      // Revert locale on error
      locale.value = previousLanguage;
      localStorage.setItem('language', previousLanguage);

      const errorMessage = savePreference && authStore.isAuthenticated 
        ? t('language.saveError')
        : t('language.switchError');

      ElMessage.error(errorMessage);
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Toggle between Chinese and Japanese
  const toggleLanguage = async (savePreference: boolean = true): Promise<boolean> => {
    const targetLanguage = currentLanguage.value === 'zh' ? 'ja' : 'zh';
    return await switchLanguage(targetLanguage, savePreference);
  };

  // Initialize language from various sources
  const initializeLanguage = (): void => {
    // Priority: User preference > localStorage > browser language > default
    let targetLanguage: string | null = null;

    // 1. Check authenticated user preference
    if (authStore.isAuthenticated && authStore.user?.language) {
      targetLanguage = authStore.user.language;
    }

    // 2. Check localStorage
    if (!targetLanguage) {
      targetLanguage = localStorage.getItem('language');
    }

    // 3. Check browser language
    if (!targetLanguage) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('ja')) {
        targetLanguage = 'ja';
      } else if (browserLang.startsWith('zh')) {
        targetLanguage = 'zh';
      }
    }

    // 4. Use default
    if (!targetLanguage || !isLanguageSupported(targetLanguage)) {
      targetLanguage = 'zh';
    }

    // Set the language without saving preference (to avoid API call during init)
    if (targetLanguage !== currentLanguage.value) {
      locale.value = targetLanguage;
      localStorage.setItem('language', targetLanguage);
    }
  };

  // Get language display name
  const getLanguageDisplayName = (
    langCode: 'zh' | 'ja', 
    format: 'native' | 'english' | 'both' = 'native'
  ): string => {
    const lang = availableLanguages.find(l => l.code === langCode);
    if (!lang) return langCode;

    switch (format) {
      case 'native':
        return lang.nativeName;
      case 'english':
        return lang.name;
      case 'both':
        return `${lang.nativeName} (${lang.name})`;
      default:
        return lang.nativeName;
    }
  };

  // Get language flag
  const getLanguageFlag = (langCode: 'zh' | 'ja'): string => {
    const lang = availableLanguages.find(l => l.code === langCode);
    return lang?.flag || '';
  };

  return {
    // State
    loading: computed(() => loading.value),
    currentLanguage,
    currentLanguageInfo,
    availableLanguages,

    // Methods
    switchLanguage,
    toggleLanguage,
    initializeLanguage,
    isLanguageSupported,
    getLanguageDisplayName,
    getLanguageFlag,
  };
};