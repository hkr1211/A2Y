<template>
  <div class="change-password">
    <h2>{{ $t('user.changePassword') }}</h2>

    <el-card style="max-width: 500px; margin-top: 16px">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item :label="$t('user.oldPassword')" prop="oldPassword">
          <el-input
            v-model="form.oldPassword"
            type="password"
            show-password
          />
        </el-form-item>

        <el-form-item :label="$t('user.newPassword')" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            show-password
          />
        </el-form-item>

        <el-form-item
          :label="$t('user.confirmPassword')"
          prop="confirmPassword"
        >
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">
            {{ $t('common.submit') }}
          </el-button>
          <el-button @click="router.back()">
            {{ $t('common.back') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { changePassword } from '@/services/auth';

const { t } = useI18n();
const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const rules: FormRules = {
  oldPassword: [{ required: true, message: t('user.oldPasswordRequired'), trigger: 'blur' }],
  newPassword: [
    { required: true, message: t('user.newPasswordRequired'), trigger: 'blur' },
    { min: 6, message: t('user.newPasswordMin'), trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: t('user.confirmPasswordRequired'), trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (err?: Error) => void) => {
        if (value !== form.newPassword) {
          callback(new Error(t('user.passwordMismatch')));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await changePassword(form.oldPassword, form.newPassword);
    ElMessage.success(t('user.changePasswordSuccess'));
    router.push('/');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : t('common.failed'));
  } finally {
    loading.value = false;
  }
}
</script>
