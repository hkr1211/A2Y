<template>
  <div class="order-list">
    <div class="page-header">
      <h2>{{ $t('order.title') }}</h2>
      <el-button
        v-if="authStore.userRole === 'buyer'"
        type="primary"
        @click="showCreateDialog"
      >
        {{ $t('order.create') }}
      </el-button>
    </div>

    <el-card>
      <div class="filter-bar">
        <el-input
          v-model="search"
          :placeholder="$t('common.search')"
          clearable
          style="width: 240px"
          @clear="loadOrders"
          @keyup.enter="loadOrders"
        />
        <el-select
          v-model="statusFilter"
          :placeholder="$t('order.status')"
          clearable
          style="width: 140px"
          @change="loadOrders"
        >
          <el-option value="pending" :label="$t('order.pending')" />
          <el-option value="confirmed" :label="$t('order.confirmed')" />
          <el-option value="production" :label="$t('order.production')" />
          <el-option value="shipped" :label="$t('order.shipped')" />
          <el-option value="completed" :label="$t('order.completed')" />
          <el-option value="rejected" :label="$t('order.rejected')" />
          <el-option value="cancelled" :label="$t('order.cancelled')" />
        </el-select>
      </div>

      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column
          prop="orderNumber"
          :label="$t('order.orderNo')"
          width="200"
        />
        <el-table-column
          prop="productName"
          :label="$t('inquiry.productName')"
        />
        <el-table-column :label="$t('quotation.unitPrice')" width="100">
          <template #default="{ row }">
            {{ row.unitPrice.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="quantity"
          :label="$t('inquiry.quantity')"
          width="80"
        />
        <el-table-column :label="$t('order.totalPrice')" width="120">
          <template #default="{ row }">
            {{ row.totalPrice.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('order.status')" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ $t(`order.${row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('inquiry.creator')" width="100">
          <template #default="{ row }">
            {{ personName(row.createdBy) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('inquiry.createdAt')" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="100"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              {{ $t('order.detail') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="pagination.total > 0"
        class="pagination"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>

    <OrderFormDialog
      v-model:visible="formDialogVisible"
      @saved="loadOrders"
    />

    <OrderDetailDialog
      v-model:visible="detailVisible"
      :order="viewingOrder"
      @updated="loadOrders"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { usePagination } from '@/composables/usePagination';
import { useAuthStore } from '@/stores/auth';
import { getOrders } from '@/services/order';
import OrderFormDialog from '@/components/dialogs/OrderFormDialog.vue';
import OrderDetailDialog from '@/components/dialogs/OrderDetailDialog.vue';
import { ORDER_STATUS_TYPES } from '@/utils/constants';
import type { Order, OrderStatus } from '@/types';

const authStore = useAuthStore();
const { loading, pagination, handlePageChange, handleSizeChange } =
  usePagination();

const orders = ref<Order[]>([]);
const search = ref('');
const statusFilter = ref('');
const formDialogVisible = ref(false);
const detailVisible = ref(false);
const viewingOrder = ref<Order | null>(null);

async function loadOrders() {
  loading.value = true;
  try {
    const data = await getOrders({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: search.value,
      status: statusFilter.value || undefined,
    });
    orders.value = data.items;
    pagination.total = data.total;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

function statusTagType(status: OrderStatus) {
  return ORDER_STATUS_TYPES[status] || 'info';
}

function personName(
  person: { id: string; username: string } | string | null
) {
  if (!person) return '-';
  return typeof person === 'object' ? person.username : person;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function showCreateDialog() {
  formDialogVisible.value = true;
}

function viewDetail(order: Order) {
  viewingOrder.value = order;
  detailVisible.value = true;
}

watch(
  () => pagination.page,
  () => loadOrders()
);

watch(
  () => pagination.pageSize,
  () => loadOrders()
);

onMounted(loadOrders);
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
