<template>
  <div class="inquiries-container">
    <div class="inquiries-header">
      <h1>{{ $t('inquiries.title') }}</h1>
      <el-button
        v-if="canCreateInquiry"
        type="primary"
        :icon="Plus"
        @click="showCreateDialog = true"
      >
        {{ $t('inquiries.create') }}
      </el-button>
    </div>

    <!-- Search and filters -->
    <div class="inquiries-filters">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            :placeholder="$t('common.search')"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
          />
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="statusFilter"
            :placeholder="$t('inquiries.status.label')"
            clearable
            @change="handleFilter"
          >
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button @click="resetFilters">
            {{ $t('common.reset') }}
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- Inquiries table -->
    <el-table
      v-loading="loading"
      :data="inquiries"
      stripe
      class="inquiries-table"
    >
      <el-table-column
        prop="inquiryNumber"
        :label="$t('inquiries.inquiryNumber')"
        width="140"
        fixed="left"
      />
      <el-table-column
        prop="productName"
        :label="$t('inquiries.productName')"
        min-width="150"
        show-overflow-tooltip
      />
      <el-table-column
        prop="materialType"
        :label="$t('inquiries.materialType')"
        width="120"
        show-overflow-tooltip
      />
      <el-table-column
        prop="quantity"
        :label="$t('inquiries.quantity')"
        width="80"
        align="right"
      />
      <el-table-column
        prop="status"
        :label="$t('inquiries.status.label')"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">
            {{ $t(getStatusLabel(row.status)) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        :label="$t('inquiries.createdAt')"
        width="160"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('common.operation')"
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :icon="View"
            @click="viewInquiry(row)"
          >
            {{ $t('common.view') }}
          </el-button>
          <el-button
            v-if="canEditInquiry(row)"
            type="warning"
            size="small"
            :icon="Edit"
            @click="editInquiry(row)"
          >
            {{ $t('common.edit') }}
          </el-button>
          <el-dropdown
            v-if="hasMoreActions(row)"
            @command="handleCommand"
          >
            <el-button size="small" :icon="More" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-if="canPublishInquiry(row)"
                  :command="{ action: 'publish', inquiry: row }"
                >
                  {{ $t('inquiries.publish') }}
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="canCancelInquiry(row)"
                  :command="{ action: 'cancel', inquiry: row }"
                >
                  {{ $t('inquiries.cancel') }}
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="canDeleteInquiry(row)"
                  :command="{ action: 'delete', inquiry: row }"
                  divided
                >
                  {{ $t('common.delete') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div class="inquiries-pagination">
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

    <!-- Create/Edit Inquiry Dialog -->
    <InquiryFormDialog
      v-model:visible="showCreateDialog"
      :inquiry="null"
      @success="handleInquiryCreated"
    />

    <InquiryFormDialog
      v-model:visible="showEditDialog"
      :inquiry="editingInquiry"
      @success="handleInquiryUpdated"
    />

    <!-- Inquiry Detail Dialog -->
    <InquiryDetailDialog
      v-model:visible="showDetailDialog"
      :inquiry="viewingInquiry"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, View, Edit, More } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import type { Inquiry, InquiryStatus, InquiryListParams } from '@/types/inquiry';
import { InquiryService } from '@/services/inquiryService';
import { INQUIRY_STATUS_CONFIG } from '@/types/inquiry';
import InquiryFormDialog from '@/components/InquiryFormDialog.vue';
import InquiryDetailDialog from '@/components/InquiryDetailDialog.vue';

const { t } = useI18n();
const authStore = useAuthStore();

// State
const loading = ref(false);
const inquiries = ref<Inquiry[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// Filters
const searchQuery = ref('');
const statusFilter = ref<InquiryStatus | ''>('');

// Dialogs
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDetailDialog = ref(false);
const editingInquiry = ref<Inquiry | null>(null);
const viewingInquiry = ref<Inquiry | null>(null);

// Computed
const canCreateInquiry = computed(() => {
  return authStore.userRole === 'admin' || authStore.userRole === 'buyer';
});

const statusOptions = computed(() => [
  { value: 'draft', label: t('inquiries.status.draft') },
  { value: 'published', label: t('inquiries.status.published') },
  { value: 'replied', label: t('inquiries.status.replied') },
  { value: 'converted', label: t('inquiries.status.converted') },
  { value: 'cancelled', label: t('inquiries.status.cancelled') },
]);

// Methods
const loadInquiries = async () => {
  loading.value = true;
  try {
    const params: InquiryListParams = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }

    const response = await InquiryService.getInquiries(params);
    inquiries.value = response.items;
    total.value = response.pagination.total;
  } catch (error: any) {
    ElMessage.error(error.message || t('errors.serverError'));
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadInquiries();
};

const handleFilter = () => {
  currentPage.value = 1;
  loadInquiries();
};

const resetFilters = () => {
  searchQuery.value = '';
  statusFilter.value = '';
  currentPage.value = 1;
  loadInquiries();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadInquiries();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadInquiries();
};

const viewInquiry = (inquiry: Inquiry) => {
  viewingInquiry.value = inquiry;
  showDetailDialog.value = true;
};

const editInquiry = (inquiry: Inquiry) => {
  editingInquiry.value = inquiry;
  showEditDialog.value = true;
};

const canEditInquiry = (inquiry: Inquiry): boolean => {
  if (authStore.userRole === 'admin') return true;
  if (inquiry.createdBy !== authStore.userId) return false;
  return inquiry.status === 'draft' || inquiry.status === 'published';
};

const canPublishInquiry = (inquiry: Inquiry): boolean => {
  if (authStore.userRole === 'admin') return true;
  if (inquiry.createdBy !== authStore.userId) return false;
  return inquiry.status === 'draft';
};

const canCancelInquiry = (inquiry: Inquiry): boolean => {
  if (authStore.userRole === 'admin') return true;
  if (inquiry.createdBy !== authStore.userId) return false;
  return inquiry.status !== 'cancelled' && inquiry.status !== 'converted';
};

const canDeleteInquiry = (inquiry: Inquiry): boolean => {
  return authStore.userRole === 'admin';
};

const hasMoreActions = (inquiry: Inquiry): boolean => {
  return canPublishInquiry(inquiry) || canCancelInquiry(inquiry) || canDeleteInquiry(inquiry);
};

const handleCommand = async (command: { action: string; inquiry: Inquiry }) => {
  const { action, inquiry } = command;

  try {
    switch (action) {
      case 'publish':
        await InquiryService.publishInquiry(inquiry.id);
        ElMessage.success(t('inquiries.publishSuccess'));
        loadInquiries();
        break;

      case 'cancel':
        await ElMessageBox.confirm(
          t('inquiries.cancelConfirm', { inquiryNumber: inquiry.inquiryNumber }),
          t('inquiries.cancel'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning',
          }
        );
        await InquiryService.cancelInquiry(inquiry.id);
        ElMessage.success(t('inquiries.cancelSuccess'));
        loadInquiries();
        break;

      case 'delete':
        await ElMessageBox.confirm(
          t('inquiries.deleteConfirm', { inquiryNumber: inquiry.inquiryNumber }),
          t('inquiries.delete'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning',
          }
        );
        await InquiryService.deleteInquiry(inquiry.id);
        ElMessage.success(t('inquiries.deleteSuccess'));
        loadInquiries();
        break;
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('errors.serverError'));
    }
  }
};

const handleInquiryCreated = () => {
  showCreateDialog.value = false;
  loadInquiries();
};

const handleInquiryUpdated = () => {
  showEditDialog.value = false;
  editingInquiry.value = null;
  loadInquiries();
};

const getStatusTagType = (status: InquiryStatus) => {
  return INQUIRY_STATUS_CONFIG[status].type;
};

const getStatusLabel = (status: InquiryStatus) => {
  return INQUIRY_STATUS_CONFIG[status].label;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Lifecycle
onMounted(() => {
  loadInquiries();
});
</script>

<style scoped>
.inquiries-container {
  padding: 20px;
}

.inquiries-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.inquiries-filters {
  margin-bottom: 20px;
}

.inquiries-table {
  margin-bottom: 20px;
}

.inquiries-pagination {
  display: flex;
  justify-content: center;
}
</style>