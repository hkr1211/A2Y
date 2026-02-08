<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? $t('common.edit') : $t('user.create')"
    width="500px"
    @close="emit('update:visible', false)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item :label="$t('auth.username')" prop="username">
        <el-input v-model="form.username" :disabled="isEdit" />
      </el-form-item>

      <el-form-item
        v-if="!isEdit"
        :label="$t('auth.password')"
        prop="password"
      >
        <el-input v-model="form.password" type="password" show-password />
      </el-form-item>

      <el-form-item :label="$t('user.role')" prop="role">
        <el-select v-model="form.role" style="width: 100%">
          <el-option value="admin" label="Admin" />
          <el-option value="buyer" label="Buyer" />
          <el-option value="supplier" label="Supplier" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('user.company')" prop="company">
        <el-select v-model="form.company" style="width: 100%">
          <el-option value="admin" label="Admin" />
          <el-option value="arroz" label="Arroz" />
          <el-option value="yunjie" label="Yunjie" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('user.language')" prop="language">
        <el-select v-model="form.language" style="width: 100%">
          <el-option value="zh" label="中文" />
          <el-option value="ja" label="日本語" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:visible', false)">
        {{ $t('common.cancel') }}
      </el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ $t('common.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { createUser, updateUser } from '@/services/user';
import type { User } from '@/types';

const props = defineProps<{
  visible: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);
const isEdit = ref(false);

const form = reactive({
  username: '',
  password: '',
  role: 'buyer',
  company: 'arroz',
  language: 'zh',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur', min: 6 }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  company: [{ required: true, message: '请选择公司', trigger: 'change' }],
};

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.user) {
        isEdit.value = true;
        form.username = props.user.username;
        form.password = '';
        form.role = props.user.role;
        form.company = props.user.company;
        form.language = props.user.language;
      } else {
        isEdit.value = false;
        form.username = '';
        form.password = '';
        form.role = 'buyer';
        form.company = 'arroz';
        form.language = 'zh';
      }
      formRef.value?.clearValidate();
    }
  }
);

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    if (isEdit.value && props.user) {
      await updateUser(props.user.id, {
        role: form.role,
        company: form.company,
        language: form.language,
      });
    } else {
      await createUser({
        username: form.username,
        password: form.password,
        role: form.role,
        company: form.company,
        language: form.language,
      });
    }
    ElMessage.success('操作成功');
    emit('update:visible', false);
    emit('saved');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败');
  } finally {
    saving.value = false;
  }
}
</script>
