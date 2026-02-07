<template>
  <div class="login-container">
    <div class="login-card">
      <h1>{{ $t('auth.loginTitle') }}</h1>
      <p class="subtitle">{{ $t('auth.loginSubtitle') }}</p>
      <p class="placeholder-text">{{ $t('auth.login') }} — Phase 1</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Login form will be implemented in Phase 1
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 400px;
}

h1 {
  margin-bottom: 8px;
  color: #303133;
}

.subtitle {
  color: #909399;
  margin-bottom: 24px;
}

.placeholder-text {
  color: #c0c4cc;
  font-style: italic;
}
</style>
