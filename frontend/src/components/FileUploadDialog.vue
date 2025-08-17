<template>
  <el-dialog
    :model-value="visible"
    :title="$t('files.upload')"
    width="500px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="upload-container">
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        :action="uploadUrl"
        :headers="uploadHeaders"
        :data="uploadData"
        :before-upload="beforeUpload"
        :on-success="handleSuccess"
        :on-error="handleError"
        :file-list="fileList"
        multiple
      >
        <el-icon class="el-icon--upload">
          <Upload />
        </el-icon>
        <div class="el-upload__text">
          {{ $t('files.dragOrClick') }}
        </div>
        <template #tip>
          <div class="el-upload__tip">
            {{ $t('files.uploadTip') }}
          </div>
        </template>
      </el-upload>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="uploading"
          @click="handleUpload"
        >
          {{ $t('files.startUpload') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

interface Props {
  visible: boolean;
  relatedId?: string;
  relatedType: 'inquiry' | 'order';
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const authStore = useAuthStore();

// State
const uploadRef = ref();
const fileList = ref([]);
const uploading = ref(false);

// Computed
const uploadUrl = computed(() => '/api/files/upload');

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`,
}));

const uploadData = computed(() => ({
  relatedId: props.relatedId,
  relatedType: props.relatedType,
}));

// Methods
const beforeUpload = (file: File) => {
  const isValidType = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ].includes(file.type);

  if (!isValidType) {
    ElMessage.error(t('files.invalidType'));
    return false;
  }

  const isValidSize = file.size / 1024 / 1024 < 10; // 10MB
  if (!isValidSize) {
    ElMessage.error(t('files.sizeLimit'));
    return false;
  }

  return true;
};

const handleSuccess = (response: any, file: any) => {
  ElMessage.success(t('files.uploadSuccess', { filename: file.name }));
};

const handleError = (error: any, file: any) => {
  ElMessage.error(t('files.uploadError', { filename: file.name }));
};

const handleUpload = () => {
  if (fileList.value.length === 0) {
    ElMessage.warning(t('files.selectFiles'));
    return;
  }

  uploading.value = true;
  uploadRef.value?.submit();
  
  // Simulate upload completion
  setTimeout(() => {
    uploading.value = false;
    emit('success');
  }, 2000);
};
</script>

<style scoped>
.upload-container {
  padding: 20px 0;
}

.dialog-footer {
  text-align: right;
}
</style>