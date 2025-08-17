<template>
  <div class="orders-container">
    <div class="orders-header">
      <h1>{{ $t('orders.title') }}</h1>
      <el-button
        v-if="canCreateOrder"
        type="primary"
        @click="showCreateDialog = true"
      >
        {{ $t('orders.create') }}
      </el-button>
    </div>

    <!-- Orders table -->
    <el-table
      v-loading="loading"
      :data="orders"
      stripe
      style="width: 100%"
    >
      <el-table-column
        prop="orderNumber"
        :label="$t('orders.orderNumber')"
        width="150"
      />
      <el-table-column
        prop="productName"
        :label="$t('orders.productName')"
        min-width="150"
      />
      <el-table-column
        prop="status"
        :label="$t('orders.status.label')"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">
            {{ $t(getStatusLabel(row.status)) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('common.actions')"
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            @click="viewOrder(row)"
          >
            {{ $t('common.view') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <OrderFormDialog
      v-model:visible="showCreateDialog"
      :order="selectedOrder"
      @success="handleFormSuccess"
    />

    <!-- Detail Dialog -->
    <OrderDetailDialog
      v-model:visible="showDetailDialog"
      :order="selectedOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import type { Order, OrderStatus, OrderListParams } from '@/types/order';
import { ORDER_STATUS_CONFIG } from '@/types/order';
import { OrderService } from '@/services/orderService';
import OrderFormDialog from '@/components/OrderFormDialog.vue';
import OrderDetailDialog from '@/components/OrderDetailDialog.vue';

const { t } = useI18n();
const authStore = useAuthStore();

// State
const loading = ref(false);
const orders = ref<Order[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref('');
const statusFilter = ref<OrderStatus | ''>('');

// Dialog states
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const selectedOrder = ref<Order | null>(null);

// Computed properties
const canCreateOrder = computed(() => {
  return authStore.userRole === 'buyer' || authStore.userRole === 'admin';
});

// Permission checks
const canEditOrder = (order: Order) => {
  return (authStore.userRole === 'buyer' && order.createdBy === authStore.user?.id && order.status === 'pending') ||
         authStore.userRole === 'admin';
};

const canConfirmOrder = (order: Order) => {
  return authStore.userRole === 'supplier' && order.status === 'pending';
};

const canUpdateStatus = (order: Order) => {
  return authStore.userRole === 'supplier' && 
         ['confirmed', 'production', 'shipped'].includes(order.status);
};

const canCancelOrder = (order: Order) => {
  return ((authStore.userRole === 'buyer' && order.createdBy === authStore.user?.id) ||
          authStore.userRole === 'supplier') &&
         ['pending', 'confirmed', 'production'].includes(order.status);
};

const canDeleteOrder = (order: Order) => {
  return authStore.userRole === 'admin';
};

const canPerformActions = (order: Order) => {
  return canConfirmOrder(order) || canUpdateStatus(order) || canCancelOrder(order) || canDeleteOrder(order);
};

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

const loadOrders = async () => {
  loading.value = true;
  try {
    const params: OrderListParams = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    if (statusFilter.value) {
      params.status = statusFilter.value;
    }

    const response = await OrderService.getOrders(params);
    orders.value = response.data;
    total.value = response.total;
  } catch (error: any) {
    console.error('Failed to load orders:', error);
    ElMessage.error(error.message || t('orders.loadError'));
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadOrders();
};

const handleFilter = () => {
  currentPage.value = 1;
  loadOrders();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadOrders();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadOrders();
};

const viewOrder = (order: Order) => {
  selectedOrder.value = order;
  showDetailDialog.value = true;
};

const editOrder = (order: Order) => {
  selectedOrder.value = order;
  showCreateDialog.value = true;
};

const handleAction = async ({ action, order }: { action: string; order: Order }) => {
  selectedOrder.value = order;

  switch (action) {
    case 'confirm':
      await confirmOrder(order);
      break;
    case 'cancel':
      await cancelOrder(order);
      break;
    case 'delete':
      await deleteOrder(order);
      break;
  }
};

const confirmOrder = async (order: Order) => {
  try {
    await ElMessageBox.confirm(
      t('orders.confirmOrderMessage'),
      t('orders.confirmOrderTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await OrderService.confirmOrder(order.id);
    ElMessage.success(t('orders.confirmSuccess'));
    loadOrders();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to confirm order:', error);
      ElMessage.error(error.message || t('orders.confirmError'));
    }
  }
};

const cancelOrder = async (order: Order) => {
  try {
    await ElMessageBox.confirm(
      t('orders.cancelOrderMessage'),
      t('orders.cancelOrderTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await OrderService.cancelOrder(order.id);
    ElMessage.success(t('orders.cancelSuccess'));
    loadOrders();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to cancel order:', error);
      ElMessage.error(error.message || t('orders.cancelError'));
    }
  }
};

const deleteOrder = async (order: Order) => {
  try {
    await ElMessageBox.confirm(
      t('orders.deleteOrderMessage'),
      t('orders.deleteOrderTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await OrderService.deleteOrder(order.id);
    ElMessage.success(t('orders.deleteSuccess'));
    loadOrders();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete order:', error);
      ElMessage.error(error.message || t('orders.deleteError'));
    }
  }
};

const handleFormSuccess = () => {
  showCreateDialog.value = false;
  selectedOrder.value = null;
  loadOrders();
};

// Initialize
onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.orders-container {
  padding: 24px;
  background-color: var(--el-bg-color-page);
  min-height: 100vh;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.orders-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>