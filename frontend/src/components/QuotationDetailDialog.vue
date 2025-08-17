<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('quotations.quotationDetail')"
    width="700px"
    :before-close="handleClose"
  >
    <div v-if="quotation" class="quotation-detail">
      <!-- Basic Information -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <div class="section-header">
            <h3>{{ $t('quotations.basicInfo') }}</h3>
            <el-tag 
              :type="QUOTATION_STATUS_CONFIG[quotation.status].type"
              size="large"
            >
              {{ $t(QUOTATION_STATUS_CONFIG[quotation.status].label) }}
            </el-tag>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('quotations.unitPrice')">
            <span class="price-text">¥{{ quotation.unitPrice.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('quotations.totalPrice')">
            <span class="price-text total-price">¥{{ quotation.totalPrice.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('quotations.deliveryTime')">
            {{ quotation.deliveryTime }} {{ $t('quotations.deliveryTimeUnit') }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.createdAt')">
            {{ formatDateTime(quotation.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.updatedAt')">
            {{ formatDateTime(quotation.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Remarks -->
      <el-card v-if="quotation.remarks" class="detail-section" shadow="never">
        <template #header>
          <h3>{{ $t('quotations.remarks') }}</h3>
        </template>
        <div class="remarks-content">
          {{ quotation.remarks }}
        </div>
      </el-card>

      <!-- Related Inquiry Information -->
      <el-card v-if="inquiry" class="detail-section" shadow="never">
        <template #header>
          <div class="section-header">
            <h3>{{ $t('quotations.relatedInquiry') }}</h3>
            <el-button 
              type="primary" 
              link 
              @click="viewInquiry"
            >
              {{ $t('quotations.viewInquiry') }}
            </el-button>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('inquiries.inquiryNumber')">
            {{ inquiry.inquiryNumber }}
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
          <el-descriptions-item :label="$t('inquiries.specifications')" :span="2">
            <div class="specifications-text">{{ inquiry.specifications }}</div>
          </el-descriptions-item>
          <el-descriptions-item 
            v-if="inquiry.specialRequirements" 
            :label="$t('inquiries.specialRequirements')" 
            :span="2"
          >
            <div class="requirements-text">{{ inquiry.specialRequirements }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <div v-else class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ $t('common.close') }}
        </el-button>
        <el-button 
          v-if="canEdit" 
          type="primary" 
          @click="editQuotation"
        >
          {{ $t('common.edit') }}
        </el-button>
        <el-button 
          v-if="canCancel" 
          type="danger" 
          @click="cancelQuotation"
        >
          {{ $t('quotations.cancel') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import type { Quotation } from '@/types/quotation';
import type { Inquiry } from '@/types/inquiry';
import { QUOTATION_STATUS_CONFIG } from '@/types/quotation';
import { QuotationService } from '@/services/quotationService';
import { InquiryService } from '@/services/inquiryService';

interface Props {
  visible: boolean;
  quotationId: string | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'edit', quotation: Quotation, inquiry: Inquiry): void;
  (e: 'refresh'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const authStore = useAuthStore();

// Dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// Data
const quotation = ref<Quotation | null>(null);
const inquiry = ref<Inquiry | null>(null);
const loading = ref(false);

// Computed properties
const canEdit = computed(() => {
  if (!quotation.value) return false;
  
  // Only suppliers can edit their own quotations
  return authStore.userRole === 'supplier' && 
         quotation.value.createdBy === authStore.user?.id &&
         quotation.value.status === 'active';
});

const canCancel = computed(() => {
  if (!quotation.value) return false;
  
  // Only suppliers can cancel their own quotations
  return authStore.userRole === 'supplier' && 
         quotation.value.createdBy === authStore.user?.id &&
         quotation.value.status === 'active';
});

// Load quotation data when dialog opens
watch([() => props.visible, () => props.quotationId], async () => {
  if (props.visible && props.quotationId) {
    await loadQuotationData();
  }
});

// Load quotation and related inquiry data
const loadQuotationData = async () => {
  if (!props.quotationId) return;

  loading.value = true;
  try {
    // Load quotation
    quotation.value = await QuotationService.getQuotation(props.quotationId);
    
    // Load related inquiry
    if (quotation.value.inquiryId) {
      inquiry.value = await InquiryService.getInquiry(quotation.value.inquiryId);
    }
  } catch (error: any) {
    console.error('Failed to load quotation data:', error);
    ElMessage.error(error.message || t('quotations.loadError'));
    handleClose();
  } finally {
    loading.value = false;
  }
};

// Format date time
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// View related inquiry
const viewInquiry = () => {
  if (inquiry.value) {
    // This would typically navigate to inquiry detail or emit an event
    // For now, we'll just show a message
    ElMessage.info(t('quotations.viewInquiryFeature'));
  }
};

// Edit quotation
const editQuotation = () => {
  if (quotation.value && inquiry.value) {
    emit('edit', quotation.value, inquiry.value);
    handleClose();
  }
};

// Cancel quotation
const cancelQuotation = async () => {
  if (!quotation.value) return;

  try {
    await ElMessageBox.confirm(
      t('quotations.cancelConfirmMessage'),
      t('quotations.cancelConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await QuotationService.cancelQuotation(quotation.value.id);
    
    ElMessage.success(t('quotations.cancelSuccess'));
    emit('refresh');
    handleClose();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to cancel quotation:', error);
      ElMessage.error(error.message || t('quotations.cancelError'));
    }
  }
};

// Handle dialog close
const handleClose = () => {
  quotation.value = null;
  inquiry.value = null;
  dialogVisible.value = false;
};
</script>

<style scoped>
.quotation-detail {
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

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.price-text {
  font-weight: 600;
  color: var(--el-color-primary);
}

.total-price {
  font-size: 18px;
  color: var(--el-color-success);
}

.remarks-content {
  padding: 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.specifications-text,
.requirements-text {
  line-height: 1.6;
  white-space: pre-wrap;
}

.loading-container {
  padding: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-descriptions__body) {
  background-color: var(--el-bg-color);
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}
</style>