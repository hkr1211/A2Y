<template>
  <div class="trash-view">
    <div class="page-header">
      <h2>{{ $t('menu.trash') }}</h2>
    </div>

    <el-card>
      <div class="filter-bar">
        <el-select
          v-model="typeFilter"
          :placeholder="$t('trash.type')"
          clearable
          style="width: 140px"
          @change="loadTrash"
        >
          <el-option value="inquiry" :label="$t('trash.inquiry')" />
          <el-option value="order" :label="$t('trash.order')" />
          <el-option value="user" :label="$t('trash.user')" />
        </el-select>
      </div>

      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column :label="$t('trash.type')" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ $t(`trash.${row.type}`) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          :label="$t('trash.title')"
        />
        <el-table-column :label="$t('trash.deletedAt')" width="180">
          <template #default="{ row }">
            {{ formatDate(row.deletedAt) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click="handleRestore(row)"
            >
              {{ $t('trash.restore') }}
            </el-button>
            <el-popconfirm
              :title="$t('trash.confirmDelete')"
              @confirm="handlePermanentDelete(row)"
            >
              <template #reference>
                <el-button size="small" type="danger">
                  {{ $t('trash.permanentDelete') }}
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="pagination.total > 0"
        class="pagination"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { usePagination } from '@/composables/usePagination';
import {
  getTrashItems,
  restoreTrashItem,
  permanentDeleteTrashItem,
} from '@/services/trash';
import { formatDateTime } from '@/utils/date';
import type { TrashItem } from '@/services/trash';

const { t } = useI18n();

const { loading, pagination, handlePageChange } = usePagination();

const items = ref<TrashItem[]>([]);
const typeFilter = ref('');

async function loadTrash() {
  loading.value = true;
  try {
    const data = await getTrashItems({
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: typeFilter.value || undefined,
    });
    items.value = data.items;
    pagination.total = data.total;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : t('common.loadFailed'));
  } finally {
    loading.value = false;
  }
}

async function handleRestore(item: TrashItem) {
  try {
    await restoreTrashItem(item.type, item.id);
    ElMessage.success(t('trash.restoreSuccess'));
    loadTrash();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : t('trash.restoreFailed'));
  }
}

async function handlePermanentDelete(item: TrashItem) {
  try {
    await permanentDeleteTrashItem(item.type, item.id);
    ElMessage.success(t('trash.deleteSuccess'));
    loadTrash();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : t('common.deleteFailed'));
  }
}

function formatDate(dateStr: string) {
  return formatDateTime(dateStr);
}

watch(() => pagination.page, () => loadTrash());

onMounted(loadTrash);
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
