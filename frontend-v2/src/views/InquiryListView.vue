<template>
  <div class="inquiry-list">
    <div class="page-header">
      <h2>{{ $t('inquiry.title') }}</h2>
      <el-button
        v-if="authStore.userRole === 'buyer'"
        type="primary"
        @click="showCreateDialog"
      >
        {{ $t('inquiry.create') }}
      </el-button>
    </div>

    <el-card>
      <div class="filter-bar">
        <el-input
          v-model="search"
          :placeholder="$t('common.search')"
          clearable
          style="width: 240px"
          @clear="loadInquiries"
          @keyup.enter="loadInquiries"
        />
        <el-select
          v-model="statusFilter"
          :placeholder="$t('inquiry.status')"
          clearable
          style="width: 140px"
          @change="loadInquiries"
        >
          <el-option value="draft" :label="$t('inquiry.draft')" />
          <el-option value="published" :label="$t('inquiry.published')" />
          <el-option value="quoted" :label="$t('inquiry.quoted')" />
          <el-option value="converted" :label="$t('inquiry.converted')" />
          <el-option value="cancelled" :label="$t('inquiry.cancelled')" />
        </el-select>
      </div>

      <el-table :data="inquiries" v-loading="loading" stripe>
        <el-table-column
          prop="inquiryNumber"
          :label="$t('inquiry.inquiryNo')"
          width="200"
        />
        <el-table-column
          prop="productName"
          :label="$t('inquiry.productName')"
        />
        <el-table-column
          prop="materialType"
          :label="$t('inquiry.materialType')"
          width="140"
        />
        <el-table-column
          prop="quantity"
          :label="$t('inquiry.quantity')"
          width="100"
        />
        <el-table-column
          :label="$t('inquiry.status')"
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ $t(`inquiry.${row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('inquiry.creator')"
          width="120"
        >
          <template #default="{ row }">
            {{ creatorName(row.createdBy) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('inquiry.createdAt')"
          width="180"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="240"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">
              {{ $t('inquiry.detail') }}
            </el-button>
            <template v-if="canEdit(row)">
              <el-button size="small" @click="showEditDialog(row)">
                {{ $t('common.edit') }}
              </el-button>
            </template>
            <template v-if="canPublish(row)">
              <el-popconfirm
                :title="$t('inquiry.confirmPublish')"
                @confirm="handlePublish(row.id)"
              >
                <template #reference>
                  <el-button size="small" type="success">
                    {{ $t('inquiry.publish') }}
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
            <template v-if="canCancel(row)">
              <el-popconfirm
                :title="$t('inquiry.confirmCancel')"
                @confirm="handleCancel(row.id)"
              >
                <template #reference>
                  <el-button size="small" type="danger">
                    {{ $t('inquiry.cancel') }}
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
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

    <InquiryFormDialog
      v-model:visible="dialogVisible"
      :inquiry="editingInquiry"
      @saved="loadInquiries"
    />

    <InquiryDetailDialog
      v-model:visible="detailVisible"
      :inquiry="viewingInquiry"
      @updated="loadInquiries"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { usePagination } from '@/composables/usePagination';
import { useAuthStore } from '@/stores/auth';
import {
  getInquiries,
  performInquiryAction,
} from '@/services/inquiry';
import InquiryFormDialog from '@/components/dialogs/InquiryFormDialog.vue';
import InquiryDetailDialog from '@/components/dialogs/InquiryDetailDialog.vue';
import { INQUIRY_STATUS_TYPES } from '@/utils/constants';
import type { Inquiry, InquiryStatus } from '@/types';

const authStore = useAuthStore();
const { loading, pagination, handlePageChange, handleSizeChange } =
  usePagination();

const inquiries = ref<Inquiry[]>([]);
const search = ref('');
const statusFilter = ref('');
const dialogVisible = ref(false);
const editingInquiry = ref<Inquiry | null>(null);
const detailVisible = ref(false);
const viewingInquiry = ref<Inquiry | null>(null);

async function loadInquiries() {
  loading.value = true;
  try {
    const data = await getInquiries({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: search.value,
      status: statusFilter.value || undefined,
    });
    inquiries.value = data.items;
    pagination.total = data.total;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败');
  } finally {
    loading.value = false;
  }
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function isCreator(row: Inquiry) {
  if (!authStore.user) return false;
  if (typeof row.createdBy === 'object' && row.createdBy) {
    return row.createdBy.id === authStore.user.id;
  }
  return row.createdBy === authStore.user.id;
}

function canEdit(row: Inquiry) {
  return (
    isCreator(row) && ['draft', 'published'].includes(row.status)
  );
}

function canPublish(row: Inquiry) {
  return isCreator(row) && row.status === 'draft';
}

function canCancel(row: Inquiry) {
  return isCreator(row) && row.status === 'published';
}

function showCreateDialog() {
  editingInquiry.value = null;
  dialogVisible.value = true;
}

function showEditDialog(inquiry: Inquiry) {
  editingInquiry.value = inquiry;
  dialogVisible.value = true;
}

function viewDetail(inquiry: Inquiry) {
  viewingInquiry.value = inquiry;
  detailVisible.value = true;
}

async function handlePublish(id: string) {
  try {
    await performInquiryAction(id, 'publish');
    ElMessage.success('询单已发布');
    await loadInquiries();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '发布失败');
  }
}

async function handleCancel(id: string) {
  try {
    await performInquiryAction(id, 'cancel');
    ElMessage.success('询单已取消');
    await loadInquiries();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '取消失败');
  }
}

watch(
  () => pagination.page,
  () => loadInquiries()
);

watch(
  () => pagination.pageSize,
  () => loadInquiries()
);

onMounted(loadInquiries);
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
