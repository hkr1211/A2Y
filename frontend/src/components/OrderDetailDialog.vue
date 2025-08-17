<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('orders.detail')"
    width="800px"
    @close="handleClose"
  >
    <div v-if="order" class="order-detail">
      <!-- Basic Information -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <span>{{ $t('orders.basicInfo') }}</span>
            <el-tag :type="getStatusTagType(order.status)">
              {{ $t(getStatusLabel(order.status)) }}
            </el-tag>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('orders.orderNumber')">
            {{ order.orderNumber }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('orders.status.label')">
            <el-tag :type="getStatusTagType(order.status)">
              {{ $t(getStatusLabel(order.status)) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('orders.productName')">
            {{ order.productName }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('orders.materialType')">
            {{ order.materialType }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('orders.quantity')">
            {{ order.quantity }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('orders.unitPrice')">
            ¥{{ order.unitPrice.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('orders.totalPrice')">
            <strong>¥{{ order.totalPrice.toFixed(2) }}</strong>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('orders.createdAt')">
            {{ formatDate(order.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="order.inquiryId" :label="$t('orders.relatedInquiry')">
            <el-button type="text" @click="viewRelatedInquiry">
              {{ order.inquiryId }}
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item v-if="order.creatorName" :label="$t('orders.createdBy')">
            {{ order.creatorName }}
          </el-descriptions-item>
          <el-descriptions-item v-if="order.confirmerName" :label="$t('orders.confirmedBy')">
            {{ order.confirmerName }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- Specifications -->
        <div class="specifications-section">
          <h4>{{ $t('orders.specifications') }}</h4>
          <p class="specifications-text">{{ order.specifications }}</p>
        </div>

        <!-- Special Requirements -->
        <div v-if="order.specialRequirements" class="requirements-section">
          <h4>{{ $t('orders.specialRequirements') }}</h4>
          <p class="requirements-text">{{ order.specialRequirements }}</p>
        </div>
      </el-card>

      <!-- Status Tracking -->
      <el-card class="detail-card">
        <template #header>
          <span>{{ $t('orders.statusTracking') }}</span>
        </template>

        <el-timeline>
          <el-timeline-item
            v-for="step in statusSteps"
            :key="step.status"
            :type="step.type"
            :timestamp="step.timestamp"
            :hollow="!step.completed"
          >
            <div class="timeline-content">
              <h4>{{ $t(step.label) }}</h4>
              <p v-if="step.description">{{ step.description }}</p>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- Attachments -->
      <el-card class="detail-card">
        <template #header>
          <span>{{ $t('orders.attachments') }}</span>
        </template>

        <div v-if="attachments.length > 0" class="attachments-list">
          <div
            v-for="attachment in attachments"
            :key="attachment.id"
            class="attachment-item"
          >
            <el-icon class="attachment-icon">
              <Document />
            </el-icon>
            <span class="attachment-name">{{ attachment.originalName }}</span>
            <div class="attachment-actions">
              <el-button
                type="primary"
                size="small"
                :icon="Download"
                @click="downloadAttachment(attachment)"
              >
                {{ $t('common.download') }}
              </el-button>
            </div>
          </div>
        </div>
        <div v-else class="no-attachments">
          <el-empty :description="$t('orders.noAttachments')" />
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <ChatButton
          v-if="order"
          :related-id="order.id"
          related-type="order"
          @open-chat="handleOpenChat"
        />
        <el-button @click="handleClose">
          {{ $t('common.close') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, Download } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import type { Order, OrderStatus } from '@/types/order';
import type { FileAttachment } from '@/types/file';
import { ORDER_STATUS_CONFIG } from '@/types/order';
import ChatButton from '@/components/ChatButton.vue';

interface Props {
  visible: boolean;
  order: Order | null;
}

interface Emits {
  (e: 'update:visible', visible: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const chatManager = inject('chatManager');

// State
const attachments = ref<FileAttachment[]>([]);

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const statusSteps = computed(() => {
  if (!props.order) return [];

  const steps = [
    {
      status: 'pending',
      label: 'orders.status.pending',
      completed: true,
      type: 'primary' as const,
      timestamp: formatDate(props.order.createdAt),
      description: t('orders.statusDescription.pending'),
    },
    {
      status: 'confirmed',
      label: 'orders.status.confirmed',
      completed: ['confirmed', 'production', 'shipped', 'completed'].includes(props.order.status),
      type: 'success' as const,
      timestamp: props.order.status !== 'pending' ? formatDate(props.order.updatedAt) : '',
      description: t('orders.statusDescription.confirmed'),
    },
    {
      status: 'production',
      label: 'orders.status.production',
      completed: ['production', 'shipped', 'completed'].includes(props.order.status),
      type: 'warning' as const,
      timestamp: props.order.status === 'production' ? formatDate(props.order.updatedAt) : '',
      description: t('orders.statusDescription.production'),
    },
    {
      status: 'shipped',
      label: 'orders.status.shipped',
      completed: ['shipped', 'completed'].includes(props.order.status),
      type: 'success' as const,
      timestamp: props.order.status === 'shipped' ? formatDate(props.order.updatedAt) : '',
      description: t('orders.statusDescription.shipped'),
    },
    {
      status: 'completed',
      label: 'orders.status.completed',
      completed: props.order.status === 'completed',
      type: 'success' as const,
      timestamp: props.order.status === 'completed' ? formatDate(props.order.updatedAt) : '',
      description: t('orders.statusDescription.completed'),
    },
  ];

  // Handle cancelled status
  if (props.order.status === 'cancelled') {
    return [
      steps[0], // pending
      {
        status: 'cancelled',
        label: 'orders.status.cancelled',
        completed: true,
        type: 'danger' as const,
        timestamp: formatDate(props.order.updatedAt),
        description: t('orders.statusDescription.cancelled'),
      },
    ];
  }

  return steps;
});

// Methods
const getStatusTagType = (status: OrderStatus) => {
  return ORDER_STATUS_CONFIG[status].type;
};

const getStatusLabel = (status: OrderStatus) => {
  return ORDER_STATUS_CONFIG[status].label;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const viewRelatedInquiry = () => {
  // TODO: Implement view related inquiry functionality
  ElMessage.info(t('orders.viewInquiryFeature'));
};

const downloadAttachment = (attachment: FileAttachment) => {
  // TODO: Implement file download functionality
  ElMessage.info(t('common.featureComingSoon'));
};

const handleClose = () => {
  dialogVisible.value = false;
};

const handleOpenChat = (relatedId: string, relatedType: 'inquiry' | 'order') => {
  if (chatManager?.value) {
    const title = `${t('orders.order')} ${props.order?.orderNumber}`;
    chatManager.value.openChat(relatedId, relatedType, title);
  }
};

// Load attachments when order changes
watch(
  () => props.order,
  (order) => {
    if (order) {
      // TODO: Load attachments from API
      attachments.value = [];
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.order-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-card {
  margin-bottom: 20px;
}

.detail-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.specifications-section,
.requirements-section {
  margin-top: 20px;
}

.specifications-section h4,
.requirements-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.specifications-text,
.requirements-text {
  margin: 0;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}

.timeline-content h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 600;
}

.timeline-content p {
  margin: 0;
  color: #909399;
  font-size: 12px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.attachment-icon {
  margin-right: 10px;
  color: #409eff;
}

.attachment-name {
  flex: 1;
  color: #303133;
}

.attachment-actions {
  margin-left: 10px;
}

.no-attachments {
  text-align: center;
  padding: 20px;
}

.dialog-footer {
  text-align: right;
}
</style>