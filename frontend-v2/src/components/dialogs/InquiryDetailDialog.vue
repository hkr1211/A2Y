<template>
  <el-dialog
    :model-value="visible"
    :title="$t('inquiry.detail')"
    width="700px"
    @close="handleClose"
  >
    <div v-if="detail" v-loading="detailLoading">
      <el-descriptions :column="2" border>
        <el-descriptions-item :label="$t('inquiry.inquiryNo')" :span="2">
          {{ detail.inquiryNumber }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.status')">
          <el-tag :type="statusTagType(detail.status)">
            {{ $t(`inquiry.${detail.status}`) }}
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
        <el-descriptions-item :label="$t('inquiry.createdAt')">
          {{ formatDate(detail.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('inquiry.creator')">
          {{ creatorName(detail.createdBy) }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- Convert to Order button for buyer when inquiry is quoted -->
      <div v-if="canConvertToOrder" class="section-header">
        <el-popconfirm
          :title="$t('order.confirmConvert')"
          @confirm="handleConvertToOrder"
        >
          <template #reference>
            <el-button type="success">
              {{ $t('order.convertToOrder') }}
            </el-button>
          </template>
        </el-popconfirm>
      </div>

      <!-- Quotation history section -->
      <div class="section-header">
        <h4>{{ $t('quotation.title') }}</h4>
        <el-button
          v-if="canQuote"
          type="primary"
          size="small"
          @click="showQuotationForm"
        >
          {{ $t('quotation.create') }}
        </el-button>
        <el-popconfirm
          v-if="canWithdraw"
          :title="$t('quotation.confirmWithdraw')"
          @confirm="handleWithdraw"
        >
          <template #reference>
            <el-button type="danger" size="small">
              {{ $t('quotation.withdraw') }}
            </el-button>
          </template>
        </el-popconfirm>
      </div>

      <el-table
        v-if="detail.quotations && detail.quotations.length > 0"
        :data="detail.quotations"
        size="small"
        stripe
      >
        <el-table-column
          :label="$t('quotation.version')"
          width="80"
        >
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column :label="$t('quotation.unitPrice')" width="120">
          <template #default="{ row }">
            {{ row.unitPrice.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('quotation.totalPrice')" width="140">
          <template #default="{ row }">
            {{ row.totalPrice.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('quotation.deliveryDays')"
          width="100"
        >
          <template #default="{ row }">{{ row.deliveryDays }}天</template>
        </el-table-column>
        <el-table-column :label="$t('quotation.remarks')">
          <template #default="{ row }">
            {{ row.remarks || '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('inquiry.status')" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isWithdrawn" type="info" size="small">
              {{ $t('quotation.withdrawn') }}
            </el-tag>
            <el-tag v-else type="success" size="small">
              {{ $t('quotation.active') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('inquiry.creator')" width="100">
          <template #default="{ row }">
            {{ quotationCreatorName(row.createdBy) }}
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-else
        :description="$t('quotation.noQuotations')"
        :image-size="60"
      />
    </div>
    <div v-else v-loading="detailLoading" style="min-height: 200px" />

    <template #footer>
      <el-button @click="handleClose">{{ $t('common.confirm') }}</el-button>
    </template>

    <QuotationFormDialog
      v-model:visible="quotationDialogVisible"
      :inquiry-id="detail?.id || ''"
      :quantity="detail?.quantity || 0"
      @saved="loadDetail"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getInquiry } from '@/services/inquiry';
import { withdrawQuotations } from '@/services/quotation';
import { createOrderFromInquiry } from '@/services/order';
import { useAuthStore } from '@/stores/auth';
import { INQUIRY_STATUS_TYPES } from '@/utils/constants';
import QuotationFormDialog from './QuotationFormDialog.vue';
import type { Inquiry, InquiryStatus } from '@/types';

const props = defineProps<{
  visible: boolean;
  inquiry: Inquiry | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  updated: [];
}>();

const authStore = useAuthStore();
const detail = ref<Inquiry | null>(null);
const detailLoading = ref(false);
const quotationDialogVisible = ref(false);

const canQuote = ref(false);
const canWithdraw = ref(false);
const canConvertToOrder = ref(false);

watch(
  () => props.visible,
  async (val) => {
    if (val && props.inquiry) {
      await loadDetail();
    } else {
      detail.value = null;
    }
  }
);

async function loadDetail() {
  if (!props.inquiry) return;
  detailLoading.value = true;
  try {
    const data = await getInquiry(props.inquiry.id);
    detail.value = data;
    updatePermissions();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败');
  } finally {
    detailLoading.value = false;
  }
}

function updatePermissions() {
  if (!detail.value || !authStore.user) {
    canQuote.value = false;
    canWithdraw.value = false;
    return;
  }

  const isSupplier = authStore.user.role === 'supplier';
  const status = detail.value.status;

  // Supplier can quote on published or quoted inquiries
  canQuote.value =
    isSupplier && ['published', 'quoted'].includes(status);

  // Buyer can convert quoted inquiry to order
  const isBuyer = authStore.user.role === 'buyer';
  canConvertToOrder.value = isBuyer && status === 'quoted';

  // Supplier can withdraw if they have active quotations
  const hasOwnActive =
    detail.value.quotations?.some(
      (q) => {
        const creatorId =
          typeof q.createdBy === 'object' ? q.createdBy.id : q.createdBy;
        return creatorId === authStore.user!.id && !q.isWithdrawn;
      }
    ) ?? false;

  canWithdraw.value =
    isSupplier && hasOwnActive && status !== 'converted';
}

function statusTagType(status: InquiryStatus) {
  return INQUIRY_STATUS_TYPES[status] || 'info';
}

function creatorName(
  createdBy: { id: string; username: string } | string | undefined
) {
  if (!createdBy) return '-';
  if (typeof createdBy === 'string') return createdBy;
  return createdBy.username;
}

function quotationCreatorName(
  createdBy: { id: string; username: string } | string
) {
  if (typeof createdBy === 'string') return createdBy;
  return createdBy.username;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function showQuotationForm() {
  quotationDialogVisible.value = true;
}

async function handleConvertToOrder() {
  if (!detail.value) return;
  try {
    await createOrderFromInquiry({ inquiryId: detail.value.id });
    ElMessage.success('订单创建成功');
    await loadDetail();
    emit('updated');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建订单失败');
  }
}

async function handleWithdraw() {
  if (!detail.value) return;
  try {
    await withdrawQuotations(detail.value.id);
    ElMessage.success('报价已撤回');
    await loadDetail();
    emit('updated');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '撤回失败');
  }
}

function handleClose() {
  emit('update:visible', false);
}
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 8px;
}

.section-header h4 {
  margin: 0;
  flex: 1;
}
</style>
