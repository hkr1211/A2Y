<template>
  <div class="audit-log-view">
    <div class="page-header">
      <h2>{{ $t('menu.audit') }}</h2>
    </div>

    <el-card>
      <div class="filter-bar">
        <el-select
          v-model="targetTypeFilter"
          :placeholder="$t('audit.targetType')"
          clearable
          style="width: 140px"
          @change="loadLogs"
        >
          <el-option value="inquiry" :label="$t('audit.targetInquiry')" />
          <el-option value="order" :label="$t('audit.targetOrder')" />
          <el-option value="quotation" :label="$t('audit.targetQuotation')" />
          <el-option value="user" :label="$t('audit.targetUser')" />
          <el-option value="file" :label="$t('audit.targetFile')" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          :start-placeholder="$t('audit.startDate')"
          :end-placeholder="$t('audit.endDate')"
          value-format="YYYY-MM-DD"
          @change="loadLogs"
        />
        <el-button @click="loadLogs">{{ $t('common.search') }}</el-button>
      </div>

      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column :label="$t('audit.operator')" width="120">
          <template #default="{ row }">
            {{ row.user.username }}
          </template>
        </el-table-column>
        <el-table-column
          prop="action"
          :label="$t('audit.action')"
          width="120"
        />
        <el-table-column
          prop="targetType"
          :label="$t('audit.targetType')"
          width="100"
        />
        <el-table-column
          prop="summary"
          :label="$t('audit.summary')"
        />
        <el-table-column :label="$t('audit.time')" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="pagination.total > 0"
        class="pagination"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { usePagination } from '@/composables/usePagination';
import { getAuditLogs } from '@/services/auditLog';
import { formatDateTime } from '@/utils/date';
import type { AuditLogItem } from '@/services/auditLog';

const { t } = useI18n();

const { loading, pagination, handlePageChange, handleSizeChange } =
  usePagination();

const logs = ref<AuditLogItem[]>([]);
const targetTypeFilter = ref('');
const dateRange = ref<string[]>([]);

async function loadLogs() {
  loading.value = true;
  try {
    const data = await getAuditLogs({
      page: pagination.page,
      pageSize: pagination.pageSize,
      targetType: targetTypeFilter.value || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    });
    logs.value = data.items;
    pagination.total = data.total;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : t('common.loadFailed'));
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string) {
  return formatDateTime(dateStr);
}

watch(() => pagination.page, () => loadLogs());
watch(() => pagination.pageSize, () => loadLogs());

onMounted(loadLogs);
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
