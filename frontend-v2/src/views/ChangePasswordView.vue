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
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { changePassword } from '@/services/auth';

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const rules: FormRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (err?: Error) => void) => {
        if (value !== form.newPassword) {
          callback(new Error('两次输入的密码不一致'));
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
    ElMessage.success('密码修改成功');
    router.push('/');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '修改失败');
  } finally {
    loading.value = false;
  }
}
</script>
