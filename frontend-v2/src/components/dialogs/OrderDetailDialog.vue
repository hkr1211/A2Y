<template>
  <el-dialog
    :model-value="visible"
    :title="$t('order.detail')"
    width="650px"
    @close="handleClose"
  >
    <div v-if="detail" v-loading="detailLoading">
      <el-descriptions :column="2" border>
        <el-descriptions-item :label="$t('order.orderNo')" :span="2">
          {{ detail.orderNumber }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('order.status')">
          <el-tag :type="statusTagType(detail.status)">
            {{ $t(`order.${detail.status}`) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.quantity')">
          {{ detail.quantity }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.productName')" :span="2">
          {{ detail.productName }}
        </el-descriptions-item>
        <el-descriptions-item
          :label="$t('inquiry.materialType')"
          :span="2"
        >
          {{ detail.materialType }}
        </el-descriptions-item>
        <el-descriptions-item
          :label="$t('inquiry.specifications')"
          :span="2"
        >
          {{ detail.specifications }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detail.specialRequirements"
          :label="$t('inquiry.specialRequirements')"
          :span="2"
        >
          {{ detail.specialRequirements }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('quotation.unitPrice')">
          {{ detail.unitPrice.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('order.totalPrice')">
          {{ detail.totalPrice.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.creator')">
          {{ personName(detail.createdBy) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('order.confirmedBy')">
          {{ detail.confirmedBy ? personName(detail.confirmedBy) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detail.rejectReason"
          :label="$t('order.rejectionReason')"
          :span="2"
        >
          {{ detail.rejectReason }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="detail.relatedInquiry"
          :label="$t('order.relatedInquiry')"
          :span="2"
        >
          {{ detail.relatedInquiry.inquiryNumber }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.createdAt')">
          {{ formatDate(detail.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('order.updatedAt')">
          {{ formatDate(detail.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- File attachments section -->
      <FileUploadPanel
        :files="detail.attachments || []"
        :related-id="detail.id"
        related-type="order"
        :can-upload="!['completed', 'cancelled', 'rejected'].includes(detail.status)"
        @uploaded="loadDetail"
      />

      <!-- Action buttons -->
      <div v-if="actionButtons.length > 0" class="action-bar">
        <template v-for="btn in actionButtons" :key="btn.action">
          <el-popconfirm
            v-if="btn.action === 'reject'"
            :title="$t('order.confirmReject')"
            @confirm="handleReject"
          >
            <template #reference>
              <el-button :type="btn.type" size="small">
                {{ btn.label }}
              </el-button>
            </template>
          </el-popconfirm>
          <el-popconfirm
            v-else
            :title="btn.confirmMsg"
            @confirm="handleAction(btn.action)"
          >
            <template #reference>
              <el-button :type="btn.type" size="small">
                {{ btn.label }}
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </div>
    </div>
    <div v-else v-loading="detailLoading" style="min-height: 200px" />

    <template #footer>
      <el-button @click="handleClose">{{ $t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { getOrder, performOrderAction } from '@/services/order';
import FileUploadPanel from '@/components/common/FileUploadPanel.vue';
import type { OrderAction } from '@/services/order';
import { useAuthStore } from '@/stores/auth';
import { ORDER_STATUS_TYPES } from '@/utils/constants';
import type { Order, OrderStatus } from '@/types';

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  updated: [];
}>();

const authStore = useAuthStore();
const detail = ref<Order | null>(null);
const detailLoading = ref(false);

watch(
  () => props.visible,
  async (val) => {
    if (val && props.order) {
      await loadDetail();
    } else {
      detail.value = null;
    }
  }
);

async function loadDetail() {
  if (!props.order) return;
  detailLoading.value = true;
  try {
    detail.value = await getOrder(props.order.id);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败');
  } finally {
    detailLoading.value = false;
  }
}

const actionButtons = computed(() => {
  if (!detail.value || !authStore.user) return [];
  const btns: {
    action: OrderAction;
    label: string;
    type: string;
    confirmMsg: string;
  }[] = [];
  const status = detail.value.status;
  const isCreator = getPersonId(detail.value.createdBy) === authStore.user.id;
  const isSupplier = authStore.user.role === 'supplier';

  if (status === 'pending') {
    if (isCreator) {
      btns.push({
        action: 'cancel',
        label: t('order.cancelOrder'),
        type: 'danger',
        confirmMsg: t('order.confirmCancel'),
      });
    }
    if (isSupplier) {
      btns.push({
        action: 'confirm',
        label: t('order.confirm'),
        type: 'success',
        confirmMsg: t('order.confirmConfirm'),
      });
      btns.push({
        action: 'reject',
        label: t('order.reject'),
        type: 'danger',
        confirmMsg: t('order.confirmReject'),
      });
    }
  } else if (status === 'confirmed' && isSupplier) {
    btns.push({
      action: 'start_production',
      label: t('order.startProduction'),
      type: 'warning',
      confirmMsg: t('order.confirmStartProduction'),
    });
  } else if (status === 'production' && isSupplier) {
    btns.push({
      action: 'ship',
      label: t('order.ship'),
      type: 'primary',
      confirmMsg: t('order.confirmShip'),
    });
  } else if (status === 'shipped' && isCreator) {
    btns.push({
      action: 'complete',
      label: t('order.complete'),
      type: 'success',
      confirmMsg: t('order.confirmComplete'),
    });
  }

  return btns;
});

function getPersonId(
  person: { id: string; username: string } | string | null
) {
  if (!person) return '';
  return typeof person === 'object' ? person.id : person;
}

function personName(
  person: { id: string; username: string } | string | null
) {
  if (!person) return '-';
  return typeof person === 'object' ? person.username : person;
}

function statusTagType(status: OrderStatus) {
  return ORDER_STATUS_TYPES[status] || 'info';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

async function handleAction(action: OrderAction) {
  if (!detail.value) return;
  try {
    await performOrderAction(detail.value.id, action);
    ElMessage.success('操作成功');
    await loadDetail();
    emit('updated');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '操作失败');
  }
}

async function handleReject() {
  if (!detail.value) return;
  try {
    const result = await ElMessageBox.prompt(
      t('order.rejectionReason'),
      t('order.reject'),
      { inputPattern: /.+/, inputErrorMessage: '请输入拒绝原因' }
    );
    const reason = typeof result === 'string' ? result : result.value;
    await performOrderAction(detail.value.id, 'reject', reason);
    ElMessage.success('订单已拒绝');
    await loadDetail();
    emit('updated');
  } catch {
    // User cancelled
  }
}

function handleClose() {
  emit('update:visible', false);
}
</script>

<style scoped>
.action-bar {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
