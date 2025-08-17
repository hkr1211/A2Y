<template>
  <div class="quotations-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">{{ $t('quotations.title') }}</h1>
        <p class="page-description">{{ $t('quotations.description') }}</p>
      </div>
    </div>

    <!-- Filters and Actions -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <div class="filter-left">
          <el-input
            v-model="searchQuery"
            :placeholder="$t('quotations.searchPlaceholder')"
            style="width: 300px"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="statusFilter"
            :placeholder="$t('quotations.statusFilter')"
            style="width: 150px"
            clearable
            @change="handleFilter"
          >
            <el-option
              v-for="(config, status) in QUOTATION_STATUS_CONFIG"
              :key="status"
              :label="$t(config.label)"
              :value="status"
            />
          </el-select>
        </div>

        <div class="filter-right">
          <el-button 
            type="primary" 
            :icon="Refresh" 
            @click="refreshData"
          >
            {{ $t('common.refresh') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Quotations Table -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="quotations"
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column
          prop="inquiryId"
          :label="$t('quotations.inquiryNumber')"
          width="150"
        >
          <template #default="{ row }">
            <el-button 
              type="primary" 
              link 
              @click="viewInquiry(row.inquiryId)"
            >
              {{ getInquiryNumber(row.inquiryId) }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column
          prop="unitPrice"
          :label="$t('quotations.unitPrice')"
          width="120"
          sortable="custom"
        >
          <template #default="{ row }">
            <span class="price-text">¥{{ row.unitPrice.toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="totalPrice"
          :label="$t('quotations.totalPrice')"
          width="120"
          sortable="custom"
        >
          <template #default="{ row }">
            <span class="price-text total-price">¥{{ row.totalPrice.toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="deliveryTime"
          :label="$t('quotations.deliveryTime')"
          width="120"
          sortable="custom"
        >
          <template #default="{ row }">
            {{ row.deliveryTime }} {{ $t('quotations.deliveryTimeUnit') }}
          </template>
        </el-table-column>

        <el-table-column
          prop="status"
          :label="$t('common.status')"
          width="100"
        >
          <template #default="{ row }">
            <el-tag 
              :type="QUOTATION_STATUS_CONFIG[row.status].type"
              size="small"
            >
              {{ $t(QUOTATION_STATUS_CONFIG[row.status].label) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="createdAt"
          :label="$t('common.createdAt')"
          width="160"
          sortable="custom"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('common.actions')"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button 
                type="primary" 
                link 
                size="small"
                @click="viewQuotation(row)"
              >
                {{ $t('common.view') }}
              </el-button>

              <el-button 
                v-if="canEdit(row)"
                type="primary" 
                link 
                size="small"
                @click="editQuotation(row)"
              >
                {{ $t('common.edit') }}
              </el-button>

              <el-button 
                v-if="canCancel(row)"
                type="danger" 
                link 
                size="small"
                @click="cancelQuotation(row)"
              >
                {{ $t('quotations.cancel') }}
              </el-button>

              <el-button 
                v-if="canDelete(row)"
                type="danger" 
                link 
                size="small"
                @click="deleteQuotation(row)"
              >
                {{ $t('common.delete') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- Quotation Form Dialog -->
    <QuotationFormDialog
      v-model:visible="formDialogVisible"
      :inquiry="selectedInquiry"
      :quotation="selectedQuotation"
      @success="handleFormSuccess"
    />

    <!-- Quotation Detail Dialog -->
    <QuotationDetailDialog
      v-model:visible="detailDialogVisible"
      :quotation-id="selectedQuotationId"
      @edit="handleEditFromDetail"
      @refresh="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import type { Quotation, QuotationListParams } from '@/types/quotation';
import type { Inquiry } from '@/types/inquiry';
import { QUOTATION_STATUS_CONFIG } from '@/types/quotation';
import { QuotationService } from '@/services/quotationService';
import { InquiryService } from '@/services/inquiryService';
import QuotationFormDialog from '@/components/QuotationFormDialog.vue';
import QuotationDetailDialog from '@/components/QuotationDetailDialog.vue';

const { t } = useI18n();
const authStore = useAuthStore();

// Data
const quotations = ref<Quotation[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// Filters
const searchQuery = ref('');
const statusFilter = ref('');

// Dialog states
const formDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const selectedQuotation = ref<Quotation | null>(null);
const selectedInquiry = ref<Inquiry | null>(null);
const selectedQuotationId = ref<string | null>(null);

// Cache for inquiry numbers
const inquiryCache = reactive<Record<string, string>>({});

// Computed properties
const isSupplier = computed(() => authStore.userRole === 'supplier');
const isAdmin = computed(() => authStore.userRole === 'admin');

// Permission checks
const canEdit = (quotation: Quotation) => {
  return isSupplier.value && 
         quotation.createdBy === authStore.user?.id &&
         quotation.status === 'active';
};

const canCancel = (quotation: Quotation) => {
  return isSupplier.value && 
         quotation.createdBy === authStore.user?.id &&
         quotation.status === 'active';
};

const canDelete = (quotation: Quotation) => {
  return isAdmin.value;
};

// Load quotations data
const loadQuotations = async () => {
  loading.value = true;
  try {
    const params: QuotationListParams = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
    };

    const response = await QuotationService.getUserQuotations(params);
    quotations.value = response.data;
    total.value = response.total;

    // Load inquiry numbers for display
    await loadInquiryNumbers();
  } catch (error: any) {
    console.error('Failed to load quotations:', error);
    ElMessage.error(error.message || t('quotations.loadError'));
  } finally {
    loading.value = false;
  }
};

// Load inquiry numbers for display
const loadInquiryNumbers = async () => {
  const inquiryIds = [...new Set(quotations.value.map(q => q.inquiryId))];
  
  for (const inquiryId of inquiryIds) {
    if (!inquiryCache[inquiryId]) {
      try {
        const inquiry = await InquiryService.getInquiry(inquiryId);
        inquiryCache[inquiryId] = inquiry.inquiryNumber;
      } catch (error) {
        inquiryCache[inquiryId] = inquiryId; // Fallback to ID
      }
    }
  }
};

// Get inquiry number from cache
const getInquiryNumber = (inquiryId: string) => {
  return inquiryCache[inquiryId] || inquiryId;
};

// Format date time
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Event handlers
const handleSearch = () => {
  currentPage.value = 1;
  loadQuotations();
};

const handleFilter = () => {
  currentPage.value = 1;
  loadQuotations();
};

const handleSortChange = ({ prop, order }: any) => {
  // Implement sorting logic if needed
  console.log('Sort change:', prop, order);
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadQuotations();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadQuotations();
};

const refreshData = () => {
  loadQuotations();
};

// View inquiry
const viewInquiry = async (inquiryId: string) => {
  try {
    const inquiry = await InquiryService.getInquiry(inquiryId);
    // This would typically navigate to inquiry detail
    // For now, we'll show the inquiry information
    ElMessage.info(`${t('quotations.viewInquiry')}: ${inquiry.inquiryNumber}`);
  } catch (error: any) {
    ElMessage.error(error.message || t('inquiries.loadError'));
  }
};

// View quotation detail
const viewQuotation = (quotation: Quotation) => {
  selectedQuotationId.value = quotation.id;
  detailDialogVisible.value = true;
};

// Edit quotation
const editQuotation = async (quotation: Quotation) => {
  try {
    const inquiry = await InquiryService.getInquiry(quotation.inquiryId);
    selectedQuotation.value = quotation;
    selectedInquiry.value = inquiry;
    formDialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || t('inquiries.loadError'));
  }
};

// Handle edit from detail dialog
const handleEditFromDetail = (quotation: Quotation, inquiry: Inquiry) => {
  selectedQuotation.value = quotation;
  selectedInquiry.value = inquiry;
  formDialogVisible.value = true;
};

// Cancel quotation
const cancelQuotation = async (quotation: Quotation) => {
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

    await QuotationService.cancelQuotation(quotation.id);
    ElMessage.success(t('quotations.cancelSuccess'));
    refreshData();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to cancel quotation:', error);
      ElMessage.error(error.message || t('quotations.cancelError'));
    }
  }
};

// Delete quotation
const deleteQuotation = async (quotation: Quotation) => {
  try {
    await ElMessageBox.confirm(
      t('quotations.deleteConfirmMessage'),
      t('quotations.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await QuotationService.deleteQuotation(quotation.id);
    ElMessage.success(t('quotations.deleteSuccess'));
    refreshData();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete quotation:', error);
      ElMessage.error(error.message || t('quotations.deleteError'));
    }
  }
};

// Handle form success
const handleFormSuccess = async () => {
  const formRef = (document.querySelector('.quotation-form-dialog') as any)?.form;
  if (!formRef) return;

  try {
    if (selectedQuotation.value) {
      // Update existing quotation
      await QuotationService.updateQuotation(selectedQuotation.value.id, formRef);
    } else {
      // Create new quotation
      await QuotationService.createQuotation(formRef);
    }
    
    refreshData();
  } catch (error: any) {
    throw error; // Re-throw to be handled by the form dialog
  }
};

// Initialize
onMounted(() => {
  loadQuotations();
});
</script>

<style scoped>
.quotations-page {
  padding: 24px;
  background-color: var(--el-bg-color-page);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-description {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-card {
  background: var(--el-bg-color);
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.price-text {
  font-weight: 600;
  color: var(--el-color-primary);
}

.total-price {
  color: var(--el-color-success);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

:deep(.el-table) {
  --el-table-border-color: var(--el-border-color-lighter);
}

:deep(.el-table th) {
  background-color: var(--el-fill-color-lighter);
  font-weight: 600;
}

:deep(.el-card__body) {
  padding: 20px;
}

@media (max-width: 768px) {
  .quotations-page {
    padding: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-left {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-left > * {
    width: 100% !important;
  }
}
</style>