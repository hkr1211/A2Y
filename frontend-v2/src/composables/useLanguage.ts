import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { updateUser } from '@/services/user';

export function useLanguage() {
  const { locale } = useI18n();
  const authStore = useAuthStore();

  const currentLanguage = computed(() => locale.value);

  async function switchLanguage(lang: 'zh' | 'ja') {
    locale.value = lang;
    localStorage.setItem('language', lang);

    // Save preference to backend if logged in
    if (authStore.user) {
      try {
        await updateUser(authStore.user.id, { language: lang });
        authStore.updateUser({ ...authStore.user, language: lang });
      } catch {
        // Silently ignore - local change already applied
      }
    }
  }

  return { currentLanguage, switchLanguage };
}
