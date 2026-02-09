<template>
  <div class="file-upload-panel">
    <div class="panel-header">
      <span class="panel-title">{{ $t('file.title') }}</span>
      <el-upload
        v-if="canUpload"
        :show-file-list="false"
        :before-upload="handleBeforeUpload"
        :http-request="handleUpload"
        :accept="acceptTypes"
        multiple
      >
        <el-button size="small" type="primary">
          {{ $t('file.upload') }}
        </el-button>
      </el-upload>
    </div>

    <el-table
      v-if="files.length > 0"
      :data="files"
      size="small"
      stripe
    >
      <el-table-column :label="$t('file.fileName')" min-width="180">
        <template #default="{ row }">
          <span class="file-name">{{ row.originalName }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('file.fileSize')" width="100">
        <template #default="{ row }">
          {{ formatSize(row.size) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('file.uploader')" width="100">
        <template #default="{ row }">
          {{ typeof row.uploadedBy === 'object' ? row.uploadedBy.username : row.uploadedBy }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.actions')" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleDownload(row)">
            {{ $t('file.download') }}
          </el-button>
          <el-popconfirm
            v-if="canDelete(row)"
            :title="$t('file.confirmDelete')"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button size="small" type="danger">
                {{ $t('common.delete') }}
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div v-else class="no-files">
      {{ $t('file.noFiles') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import type { UploadRawFile, UploadRequestOptions } from 'element-plus';
import { uploadFile, getDownloadUrl, deleteFile } from '@/services/file';
import type { FileAttachmentResponse } from '@/services/file';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  files: FileAttachmentResponse[];
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  canUpload?: boolean;
}>();

const emit = defineEmits<{
  uploaded: [];
}>();

const authStore = useAuthStore();

const acceptTypes =
  '.jpg,.jpeg,.png,.pdf,.xlsx,.xls,.docx,.doc,.step,.stp,.stl';

const MAX_SIZE = 20 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function canDelete(file: FileAttachmentResponse): boolean {
  if (!authStore.user) return false;
  if (authStore.user.role === 'admin') return true;
  const uploaderId =
    typeof file.uploadedBy === 'object' ? file.uploadedBy.id : file.uploadedBy;
  return uploaderId === authStore.user.id;
}

function handleBeforeUpload(rawFile: UploadRawFile): boolean {
  if (rawFile.size > MAX_SIZE) {
    ElMessage.error('文件大小不能超过 20MB');
    return false;
  }
  return true;
}

async function handleUpload(options: UploadRequestOptions) {
  try {
    await uploadFile(
      options.file,
      props.relatedId,
      props.relatedType
    );
    ElMessage.success('上传成功');
    emit('uploaded');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '上传失败');
  }
}

async function handleDownload(file: FileAttachmentResponse) {
  try {
    const { url, originalName } = await getDownloadUrl(file.id);
    // Create a temporary link and click it to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '下载失败');
  }
}

async function handleDelete(file: FileAttachmentResponse) {
  try {
    await deleteFile(file.id);
    ElMessage.success('删除成功');
    emit('uploaded');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败');
  }
}
</script>

<style scoped>
.file-upload-panel {
  margin-top: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.file-name {
  word-break: break-all;
}

.no-files {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 12px 0;
}
</style>
