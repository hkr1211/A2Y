<template>
  <el-container class="app-layout">
    <AppHeader />
    <el-container>
      <AppSidebar />
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-main {
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}
</style>
