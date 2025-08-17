<template>
  <el-dialog
    :model-value="visible"
    :title="isEditing ? $t('users.edit') : $t('users.create')"
    width="500px"
    @update:model-value="$emit('update:visible', $event)"
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item
        :label="$t('users.username')"
        prop="username"
      >
        <el-input
          v-model="formData.username"
          :placeholder="$t('users.username')"
          :disabled="isEditing"
        />
      </el-form-item>

      <el-form-item
        v-if="!isEditing"
        :label="$t('users.password')"
        prop="password"
      >
        <el-input
          v-model="formData.password"
          type="password"
          :placeholder="$t('users.password')"
          show-password
        />
      </el-form-item>

      <el-form-item
        v-if="!isEditing"
        :label="$t('users.confirmPassword')"
        prop="confirmPassword"
      >
        <el-input
          v-model="formData.confirmPassword"
          type="password"
          :placeholder="$t('users.confirmPassword')"
          show-password
        />
      </el-form-item>

      <el-form-item
        :label="$t('users.role')"
        prop="role"
      >
        <el-select
          v-model="formData.role"
          :placeholder="$t('users.role')"
          style="width: 100%"
        >
          <el-option
            v-for="role in roleOptions"
            :key="role.value"
            :label="role.label"
            :value="role.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item
        :label="$t('users.company')"
        prop="company"
      >
        <el-select
          v-model="formData.company"
          :placeholder="$t('users.company')"
          style="width: 100%"
        >
          <el-option
            v-for="company in companyOptions"
            :key="company.value"
            :label="company.label"
            :value="company.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item
        :label="$t('users.language')"
        prop="language"
      >
        <el-select
          v-model="formData.language"
          :placeholder="$t('users.language')"
          style="width: 100%"
        >
          <el-option
            v-for="language in languageOptions"
            :key="language.value"
            :label="language.label"
            :value="language.value"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ $t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useI18n } from 'vue-i18n';
import type { User, CreateUserForm, UserRole, Company, Language } from '@/types/user';
import { UserService, type UpdateUserForm } from '@/services/userService';

interface Props {
  visible: boolean;
  user: User | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

// Form state
const formRef = ref<FormInstance>();
const submitting = ref(false);

const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  role: '' as UserRole | '',
  company: '' as Company | '',
  language: 'zh' as Language,
});

// Computed
const isEditing = computed(() => !!props.user);

const roleOptions = computed(() => [
  { value: 'admin', label: t('users.roles.admin') },
  { value: 'customer', label: t('users.roles.customer') },
  { value: 'supplier', label: t('users.roles.supplier') },
]);

const companyOptions = computed(() => [
  { value: 'admin', label: t('users.companies.admin') },
  { value: 'arroz', label: t('users.companies.arroz') },
  { value: 'yunjie', label: t('users.companies.yunjie') },
]);

const languageOptions = computed(() => [
  { value: 'zh', label: t('users.languages.zh') },
  { value: 'ja', label: t('users.languages.ja') },
]);

// Form validation rules
const formRules = computed<FormRules>(() => ({
  username: [
    { required: true, message: t('users.usernameRequired'), trigger: 'blur' },
    { min: 3, max: 50, message: t('users.usernameLength'), trigger: 'blur' },
  ],
  password: isEditing.value ? [] : [
    { required: true, message: t('users.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('users.passwordLength'), trigger: 'blur' },
  ],
  confirmPassword: isEditing.value ? [] : [
    { required: true, message: t('users.confirmPasswordRequired'), trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== formData.password) {
          callback(new Error(t('users.passwordMismatch')));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  role: [
    { required: true, message: t('users.roleRequired'), trigger: 'change' },
  ],
  company: [
    { required: true, message: t('users.companyRequired'), trigger: 'change' },
  ],
}));

// Methods
const resetForm = () => {
  formData.username = '';
  formData.password = '';
  formData.confirmPassword = '';
  formData.role = '';
  formData.company = '';
  formData.language = 'zh';
  formRef.value?.resetFields();
};

const loadUserData = () => {
  if (props.user) {
    formData.username = props.user.username;
    formData.role = props.user.role;
    formData.company = props.user.company;
    formData.language = props.user.language;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitting.value = true;

    if (isEditing.value && props.user) {
      // Update user
      const updateData: UpdateUserForm = {
        role: formData.role as UserRole,
        company: formData.company as Company,
        language: formData.language,
      };

      await UserService.updateUser(props.user.id, updateData);
      ElMessage.success(t('users.updateSuccess'));
    } else {
      // Create user
      const createData: CreateUserForm = {
        username: formData.username,
        password: formData.password,
        role: formData.role as UserRole,
        company: formData.company as Company,
        language: formData.language,
      };

      await UserService.createUser(createData);
      ElMessage.success(t('users.createSuccess'));
    }

    emit('success');
  } catch (error: any) {
    const errorMessage = isEditing.value ? t('users.updateError') : t('users.createError');
    ElMessage.error(error.message || errorMessage);
  } finally {
    submitting.value = false;
  }
};

// Watch for user prop changes
watch(
  () => props.user,
  () => {
    if (props.visible) {
      if (props.user) {
        loadUserData();
      } else {
        resetForm();
      }
    }
  },
  { immediate: true }
);

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.user) {
        loadUserData();
      } else {
        resetForm();
      }
    }
  }
);
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>