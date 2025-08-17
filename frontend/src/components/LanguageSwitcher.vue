<template>
  <div class="language-switcher">
    <!-- Dropdown style switcher -->
    <el-dropdown 
      v-if="type === 'dropdown'"
      class="language-dropdown" 
      @command="handleLanguageChange"
      :disabled="loading"
    >
      <el-button :text="!showBorder" :type="showBorder ? 'default' : undefined">
        <el-icon><Globe /></el-icon>
        {{ getCurrentLanguageLabel() }}
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item 
            command="zh" 
            :disabled="currentLanguage === 'zh'"
          >
            <span class="language-item">
              <span class="language-flag">🇨🇳</span>
              {{ $t('language.chinese') }}
            </span>
          </el-dropdown-item>
          <el-dropdown-item 
            command="ja" 
            :disabled="currentLanguage === 'ja'"
          >
            <span class="language-item">
              <span class="language-flag">🇯🇵</span>
              {{ $t('language.japanese') }}
            </span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- Button group style switcher -->
    <el-button-group v-else-if="type === 'buttons'" class="language-buttons">
      <el-button
        :type="currentLanguage === 'zh' ? 'primary' : 'default'"
        :disabled="loading"
        @click="handleLanguageChange('zh')"
        size="small"
      >
        🇨🇳 {{ $t('language.chinese') }}
      </el-button>
      <el-button
        :type="currentLanguage === 'ja' ? 'primary' : 'default'"
        :disabled="loading"
        @click="handleLanguageChange('ja')"
        size="small"
      >
        🇯🇵 {{ $t('language.japanese') }}
      </el-button>
    </el-button-group>

    <!-- Toggle style switcher -->
    <el-switch
      v-else-if="type === 'toggle'"
      v-model="isJapanese"
      class="language-toggle"
      :disabled="loading"
      :active-text="$t('language.japanese')"
      :inactive-text="$t('language.chinese')"
      @change="handleToggleChange"
    />

    <!-- Simple text links -->
    <div v-else class="language-links">
      <el-link
        :type="currentLanguage === 'zh' ? 'primary' : 'default'"
        :disabled="loading || currentLanguage === 'zh'"
        @click="handleLanguageChange('zh')"
      >
        🇨🇳 {{ $t('language.chinese') }}
      </el-link>
      <span class="separator">|</span>
      <el-link
        :type="currentLanguage === 'ja' ? 'primary' : 'default'"
        :disabled="loading || currentLanguage === 'ja'"
        @click="handleLanguageChange('ja')"
      >
        🇯🇵 {{ $t('language.japanese') }}
      </el-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Location, ArrowDown } from '@element-plus/icons-vue';
import { useLanguage } from '@/composables/useLanguage';

// Props
interface Props {
  type?: 'dropdown' | 'buttons' | 'toggle' | 'links';
  showBorder?: boolean;
  savePreference?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'dropdown',
  showBorder: false,
  savePreference: true,
});

// Emits
const emit = defineEmits<{
  languageChanged: [language: string];
}>();

// Composables
const { t } = useI18n();
const {
  loading,
  currentLanguage,
  currentLanguageInfo,
  availableLanguages,
  switchLanguage,
  getLanguageDisplayName,
  getLanguageFlag,
} = useLanguage();

// State
const isJapanese = ref(currentLanguage.value === 'ja');

// Watch for external locale changes
watch(currentLanguage, (newLang) => {
  isJapanese.value = newLang === 'ja';
});

// Methods
const getCurrentLanguageLabel = (): string => {
  if (!currentLanguageInfo.value) return '';
  return `${currentLanguageInfo.value.flag} ${currentLanguageInfo.value.nativeName}`;
};

const handleLanguageChange = async (lang: string) => {
  if (lang === currentLanguage.value || loading.value) {
    return;
  }

  const success = await switchLanguage(lang as 'zh' | 'ja', props.savePreference);
  
  if (success) {
    // Emit event
    emit('languageChanged', lang);
  }
};

const handleToggleChange = (value: boolean) => {
  const lang = value ? 'ja' : 'zh';
  handleLanguageChange(lang);
};

// Expose methods for parent components
defineExpose({
  switchLanguage: handleLanguageChange,
  getCurrentLanguage: () => currentLanguage.value,
  isLoading: () => loading.value,
});
</script>

<style scoped>
.language-switcher {
  display: inline-block;
}

.language-dropdown {
  cursor: pointer;
}

.language-dropdown :deep(.el-button) {
  border: none;
  background: none;
  color: #606266;
  font-size: 14px;
}

.language-dropdown :deep(.el-button:hover) {
  color: #409eff;
  background-color: #f5f7fa;
}

.language-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-flag {
  font-size: 16px;
}

.language-buttons {
  display: flex;
}

.language-toggle {
  --el-switch-on-color: #409eff;
  --el-switch-off-color: #dcdfe6;
}

.language-links {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.separator {
  color: #dcdfe6;
  user-select: none;
}

.language-links .el-link {
  font-size: 14px;
  text-decoration: none;
}

.language-links .el-link:hover {
  text-decoration: underline;
}

/* Responsive design */
@media (max-width: 768px) {
  .language-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .language-links {
    flex-direction: column;
    gap: 4px;
  }
  
  .separator {
    display: none;
  }
}
</style>