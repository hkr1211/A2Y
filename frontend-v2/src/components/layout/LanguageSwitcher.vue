<template>
  <el-dropdown @command="handleSwitch">
    <el-button text size="small">
      {{ currentLanguage === 'zh' ? '中文' : '日本語' }}
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="zh" :disabled="currentLanguage === 'zh'">
          中文
        </el-dropdown-item>
        <el-dropdown-item command="ja" :disabled="currentLanguage === 'ja'">
          日本語
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';

const { currentLanguage, switchLanguage } = useLanguage();

function handleSwitch(lang: string) {
  switchLanguage(lang as 'zh' | 'ja');
}
</script>
