<template>
  <div class="users-container">
    <div class="users-header">
      <h1>{{ $t('users.title') }}</h1>
      <el-button
        type="primary"
        :icon="Plus"
        @click="showCreateDialog = true"
      >
        {{ $t('users.create') }}
      </el-button>
    </div>

    <!-- Search and filters -->
    <div class="users-filters">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            :placeholder="$t('common.search')"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="roleFilter"
            :placeholder="$t('users.role')"
            clearable
            @change="handleFilter"
          >
            <el-option
              v-for="role in roleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="companyFilter"
            :placeholder="$t('users.company')"
            clearable
            @change="handleFilter"
          >
            <el-option
              v-for="company in companyOptions"
              :key="company.value"
              :label="company.label"
              :value="company.value"
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

    <!-- Users table -->
    <el-table
      v-loading="loading"
      :data="users"
      stripe
      class="users-table"
    >
      <el-table-column
        prop="username"
        :label="$t('users.username')"
        min-width="120"
      />
      <el-table-column
        prop="role"
        :label="$t('users.role')"
        width="120"
      >
        <template #default="{ row }">
          <el-tag :type="getRoleTagType(row.role)">
            {{ $t(`users.roles.${row.role}`) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="company"
        :label="$t('users.company')"
        width="120"
      >
        <template #default="{ row }">
          {{ $t(`users.companies.${row.company}`) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="language"
        :label="$t('users.language')"
        width="100"
      >
        <template #default="{ row }">
          {{ $t(`users.languages.${row.language}`) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        :label="$t('users.createdAt')"
        width="180"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('common.operation')"
        width="150"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :icon="Edit"
            @click="editUser(row)"
          >
            {{ $t('common.edit') }}
          </el-button>
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            @click="deleteUser(row)"
          >
            {{ $t('common.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div class="users-pagination">
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

    <!-- Create/Edit User Dialog -->
    <UserFormDialog
      v-model:visible="showCreateDialog"
      :user="null"
      @success="handleUserCreated"
    />

    <UserFormDialog
      v-model:visible="showEditDialog"
      :user="editingUser"
      @success="handleUserUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import type { User, UserRole, Company } from '@/types/user';
import { UserService, type UserListParams } from '@/services/userService';
import UserFormDialog from '@/components/UserFormDialog.vue';

const { t } = useI18n();

// State
const loading = ref(false);
const users = ref<User[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// Filters
const searchQuery = ref('');
const roleFilter = ref<UserRole | ''>('');
const companyFilter = ref<Company | ''>('');

// Dialogs
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const editingUser = ref<User | null>(null);

// Options for filters
const roleOptions = computed(() => [
  { value: 'admin', label: t('users.roles.admin') },
  { value: 'buyer', label: t('users.roles.buyer') },
  { value: 'supplier', label: t('users.roles.supplier') },
]);

const companyOptions = computed(() => [
  { value: 'admin', label: t('users.companies.admin') },
  { value: 'arroz', label: t('users.companies.arroz') },
  { value: 'yunjie', label: t('users.companies.yunjie') },
]);

// Methods
const loadUsers = async () => {
  loading.value = true;
  try {
    const params: UserListParams = {
      page: currentPage.value,
      limit: pageSize.value,
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }
    if (roleFilter.value) {
      params.role = roleFilter.value;
    }
    if (companyFilter.value) {
      params.company = companyFilter.value;
    }

    const response = await UserService.getUsers(params);
    users.value = response.items;
    total.value = response.pagination.total;
  } catch (error: any) {
    ElMessage.error(error.message || t('errors.serverError'));
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadUsers();
};

const handleFilter = () => {
  currentPage.value = 1;
  loadUsers();
};

const resetFilters = () => {
  searchQuery.value = '';
  roleFilter.value = '';
  companyFilter.value = '';
  currentPage.value = 1;
  loadUsers();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadUsers();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadUsers();
};

const editUser = (user: User) => {
  editingUser.value = user;
  showEditDialog.value = true;
};

const deleteUser = async (user: User) => {
  try {
    await ElMessageBox.confirm(
      t('users.deleteConfirm', { username: user.username }),
      t('users.delete'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );

    await UserService.deleteUser(user.id);
    ElMessage.success(t('users.deleteSuccess'));
    loadUsers();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || t('users.deleteError'));
    }
  }
};

const handleUserCreated = () => {
  showCreateDialog.value = false;
  loadUsers();
};

const handleUserUpdated = () => {
  showEditDialog.value = false;
  editingUser.value = null;
  loadUsers();
};

const getRoleTagType = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'danger';
    case 'buyer':
      return 'primary';
    case 'supplier':
      return 'success';
    default:
      return '';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Lifecycle
onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.users-container {
  padding: 20px;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.users-filters {
  margin-bottom: 20px;
}

.users-table {
  margin-bottom: 20px;
}

.users-pagination {
  display: flex;
  justify-content: center;
}
</style>