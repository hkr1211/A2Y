<template>
  <el-dialog
    :model-value="visible"
    :title="$t('inquiries.detail')"
    width="800px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="inquiry" class="inquiry-detail">
      <!-- Basic Information -->
      <el-card class="detail-section">
        <template #header>
          <div class="section-header">
            <span>{{ $t('inquiries.basicInfo') }}</span>
            <el-tag :type="getStatusTagType(inquiry.status)">
              {{ $t(getStatusLabel(inquiry.status)) }}
            </el-tag>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('inquiries.inquiryNumber')">
            {{ inquiry.inquiryNumber }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('inquiries.status.label')">
            <el-tag :type="getStatusTagType(inquiry.status)">
              {{ $t(getStatusLabel(inquiry.status)) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('inquiries.productName')">
            {{ inquiry.productName }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('inquiries.materialType')">
            {{ inquiry.materialType }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('inquiries.quantity')">
            {{ inquiry.quantity }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('inquiries.createdAt')">
            {{ formatDate(inquiry.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Specifications -->
      <el-card class="detail-section">
        <template #header>
          <span>{{ $t('inquiries.specifications') }}</span>
        </template>
        <div class="content-text">
          {{ inquiry.specifications }}
        </div>
      </el-card>

      <!-- Special Requirements -->
      <el-card v-if="inquiry.specialRequirements" class="detail-section">
        <template #header>
          <span>{{ $t('inquiries.specialRequirements') }}</span>
        </template>
        <div class="content-text">
          {{ inquiry.specialRequirements }}
        </div>
      </el-card>

      <!-- File Attachments -->
      <el-card class="detail-section">
        <template #header>
          <div class="section-header">
            <span>{{ $t('inquiries.attachments') }}</span>
            <el-button
              v-if="canUploadFiles"
              type="primary"
              size="small"
              :icon="Upload"
              @click="showUploadDialog = true"
            >
              {{ $t('inquiries.uploadFile') }}
            </el-button>
          </div>
        </template>
        
        <div v-if="attachments.length === 0" class="no-attachments">
          <el-empty :description="$t('inquiries.noAttachments')" />
        </div>
        <div v-else class="attachments-list">
          <div
            v-for="attachment in attachments"
            :key="attachment.id"
            class="attachment-item"
          >
            <div class="attachment-info">
              <el-icon class="attachment-icon">
                <Document />
              </el-icon>
              <span class="attachment-name">{{ attachment.originalName }}</span>
              <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
            </div>
            <div class="attachment-actions">
              <el-button
                type="primary"
                size="small"
                :icon="Download"
                @click="downloadFile(attachment)"
              >
                {{ $t('common.download') }}
              </el-button>
              <el-button
                v-if="canDeleteFile(attachment)"
                type="danger"
                size="small"
                :icon="Delete"
                @click="deleteFile(attachment)"
              >
                {{ $t('common.delete') }}
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ChatButton
          v-if="inquiry"
          :related-id="inquiry.id"
          related-type="inquiry"
          @open-chat="handleOpenChat"
        />
        <el-button @click="$emit('update:visible', false)">
          {{ $t('common.close') }}
        </el-button>
      </div>
    </template>

    <!-- File Upload Dialog -->
    <FileUploadDialog
      v-model:visible="showUploadDialog"
      :related-id="inquiry?.id"
      related-type="inquiry"
      @success="handleFileUploaded"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload, Document, Download, Delete } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import type { Inquiry, InquiryStatus } from '@/types/inquiry';
import type { FileAttachment } from '@/types/file';
import { INQUIRY_STATUS_CONFIG } from '@/types/inquiry';
import FileUploadDialog from '@/components/FileUploadDialog.vue';
import ChatButton from '@/components/ChatButton.vue';

interface Props {
  visible: boolean;
  inquiry: Inquiry | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const authStore = useAuthStore();
const chatManager = inject('chatManager');

// State
const attachments = ref<FileAttachment[]>([]);
const showUploadDialog = ref(false);

// Computed
const canUploadFiles = computed(() => {
  if (!props.inquiry) return false;
  if (authStore.userRole === 'admin') return true;
  if (props.inquiry.createdBy !== authStore.userId) return false;
  return props.inquiry.status === 'draft' || props.inquiry.status === 'published';
});

// Methods
const getStatusTagType = (status: InquiryStatus) => {
  return INQUIRY_STATUS_CONFIG[status].type;
};

const getStatusLabel = (status: InquiryStatus) => {
  return INQUIRY_STATUS_CONFIG[status].label;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const canDeleteFile = (attachment: FileAttachment): boolean => {
  if (authStore.userRole === 'admin') return true;
  return attachment.uploadedBy === authStore.userId;
};

const downloadFile = async (attachment: FileAttachment) => {
  try {
    // TODO: Implement file download
    ElMessage.info(t('common.featureComingSoon'));
  } catch (error: any) {
    ElMessage.error(error.message || t('errors.downloadError'));
  }
};

const deleteFile = async (attachment: FileAttachment) => {
  try {
    // TODO: Implement file deletion
    ElMessage.info(t('common.featureComingSoon'));
  } catch (error: any) {
    ElMessage.error(error.message || t('errors.deleteError'));
  }
};

const handleFileUploaded = () => {
  showUploadDialog.value = false;
  // TODO: Reload attachments
  ElMessage.success(t('inquiries.fileUploadSuccess'));
};

const handleOpenChat = (relatedId: string, relatedType: 'inquiry' | 'order') => {
  if (chatManager?.value) {
    const title = `${t('inquiries.inquiry')} ${props.inquiry?.inquiryNumber}`;
    chatManager.value.openChat(relatedId, relatedType, title);
  }
};

const loadAttachments = async () => {
  if (!props.inquiry) return;
  
  try {
    // TODO: Load attachments from API
    attachments.value = [];
  } catch (error: any) {
    ElMessage.error(error.message || t('errors.loadAttachmentsError'));
  }
};

// Watch for inquiry changes
watch(
  () => props.inquiry,
  (newInquiry) => {
    if (newInquiry && props.visible) {
      loadAttachments();
    }
  },
  { immediate: true }
);

watch(
  () => props.visible,
  (visible) => {
    if (visible && props.inquiry) {
      loadAttachments();
    }
  }
);
</script>

<style scoped>
.inquiry-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.no-attachments {
  text-align: center;
  padding: 20px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.attachment-icon {
  color: #409eff;
  font-size: 18px;
}

.attachment-name {
  font-weight: 500;
  color: #303133;
}

.attachment-size {
  color: #909399;
  font-size: 12px;
}

.attachment-actions {
  display: flex;
  gap: 8px;
}

.dialog-footer {
  text-align: right;
}
</style>