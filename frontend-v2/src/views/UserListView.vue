<template>
  <div class="user-list">
    <div class="page-header">
      <h2>{{ $t('user.title') }}</h2>
      <el-button type="primary" @click="showCreateDialog">
        {{ $t('user.create') }}
      </el-button>
    </div>

    <el-card>
      <div class="filter-bar">
        <el-input
          v-model="search"
          :placeholder="$t('common.search')"
          clearable
          style="width: 240px"
          @clear="loadUsers"
          @keyup.enter="loadUsers"
        />
        <el-select
          v-model="roleFilter"
          :placeholder="$t('user.role')"
          clearable
          style="width: 140px"
          @change="loadUsers"
        >
          <el-option value="admin" label="Admin" />
          <el-option value="buyer" label="Buyer" />
          <el-option value="supplier" label="Supplier" />
        </el-select>
      </div>

      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="username" :label="$t('auth.username')" />
        <el-table-column prop="role" :label="$t('user.role')" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="company"
          :label="$t('user.company')"
          width="140"
        />
        <el-table-column
          prop="language"
          :label="$t('user.language')"
          width="100"
        />
        <el-table-column
          :label="$t('common.actions')"
          width="260"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button size="small" @click="showEditDialog(row)">
              {{ $t('common.edit') }}
            </el-button>
            <el-button size="small" @click="handleResetPassword(row)">
              {{ $t('user.resetPassword') }}
            </el-button>
            <el-popconfirm
              :title="$t('common.confirm') + '?'"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button size="small" type="danger">
                  {{ $t('common.delete') }}
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
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>

    <UserFormDialog
      v-model:visible="dialogVisible"
      :user="editingUser"
      @saved="loadUsers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePagination } from '@/composables/usePagination';
import { getUsers, deleteUser, resetPassword } from '@/services/user';
import UserFormDialog from '@/components/dialogs/UserFormDialog.vue';
import type { User } from '@/types';

const { loading, pagination, handlePageChange, handleSizeChange } =
  usePagination();

const users = ref<User[]>([]);
const search = ref('');
const roleFilter = ref('');
const dialogVisible = ref(false);
const editingUser = ref<User | null>(null);

async function loadUsers() {
  loading.value = true;
  try {
    const data = await getUsers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: search.value,
      role: roleFilter.value || undefined,
    });
    users.value = data.items;
    pagination.total = data.total;
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

function showCreateDialog() {
  editingUser.value = null;
  dialogVisible.value = true;
}

function showEditDialog(user: User) {
  editingUser.value = user;
  dialogVisible.value = true;
}

async function handleResetPassword(user: User) {
  try {
    const result = await ElMessageBox.prompt('请输入新密码', '重置密码', {
      inputPattern: /^.{6,}$/,
      inputErrorMessage: '密码至少6个字符',
    });
    const newPwd = typeof result === 'string' ? result : result.value;
    await resetPassword(user.id, newPwd);
    ElMessage.success('密码已重置');
  } catch {
    // User cancelled
  }
}

async function handleDelete(id: string) {
  try {
    await deleteUser(id);
    ElMessage.success('用户已删除');
    await loadUsers();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败');
  }
}

onMounted(loadUsers);
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
