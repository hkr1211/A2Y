import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import Users from '@/views/Users.vue';
import { UserService } from '@/services/userService';
import type { User } from '@/types/user';

// Mock dependencies
vi.mock('@/services/userService');
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  };
});

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (params && key.includes('{username}')) {
        return key.replace('{username}', params.username);
      }
      return key;
    },
  }),
}));

// Mock UserFormDialog component
vi.mock('@/components/UserFormDialog.vue', () => ({
  default: {
    name: 'UserFormDialog',
    template: '<div data-testid="user-form-dialog"></div>',
    props: ['visible', 'user'],
    emits: ['update:visible', 'success'],
  },
}));

const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    role: 'admin',
    company: 'admin',
    language: 'zh',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    username: 'buyer1',
    role: 'buyer',
    company: 'arroz',
    language: 'ja',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockPaginatedResponse = {
  items: mockUsers,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
};

const createWrapper = () => {
  return mount(Users, {
    global: {
      stubs: {
        'el-table': true,
        'el-table-column': true,
        'el-button': true,
        'el-input': true,
        'el-select': true,
        'el-option': true,
        'el-tag': true,
        'el-pagination': true,
        'UserFormDialog': true,
      },
    },
  });
};

describe('Users.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UserService.getUsers).mockResolvedValue(mockPaginatedResponse);
  });

  it('renders user management page correctly', async () => {
    const wrapper = createWrapper();
    
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.vm.users).toEqual([]);
  });

  it('loads users on mount', async () => {
    createWrapper();
    
    expect(UserService.getUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('displays users in table', async () => {
    const wrapper = createWrapper();
    
    // Wait for users to load
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.users).toEqual(mockUsers);
  });

  it('handles search functionality', async () => {
    const wrapper = createWrapper();
    
    // Simulate search input change
    wrapper.vm.searchQuery = 'admin';
    await wrapper.vm.handleSearch();
    
    expect(UserService.getUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'admin',
    });
  });

  it('handles role filter', async () => {
    const wrapper = createWrapper();
    
    // Simulate role filter change
    wrapper.vm.roleFilter = 'admin';
    await wrapper.vm.handleFilter();
    
    expect(UserService.getUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      role: 'admin',
    });
  });

  it('handles company filter', async () => {
    const wrapper = createWrapper();
    
    // Simulate company filter change
    wrapper.vm.companyFilter = 'arroz';
    await wrapper.vm.handleFilter();
    
    expect(UserService.getUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      company: 'arroz',
    });
  });

  it('resets filters correctly', async () => {
    const wrapper = createWrapper();
    
    // Set some filters
    wrapper.vm.searchQuery = 'test';
    wrapper.vm.roleFilter = 'admin';
    wrapper.vm.companyFilter = 'arroz';
    
    // Reset filters
    await wrapper.vm.resetFilters();
    
    expect(wrapper.vm.searchQuery).toBe('');
    expect(wrapper.vm.roleFilter).toBe('');
    expect(wrapper.vm.companyFilter).toBe('');
    expect(UserService.getUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('handles pagination', async () => {
    const wrapper = createWrapper();
    
    // Simulate page change
    await wrapper.vm.handleCurrentChange(2);
    
    expect(wrapper.vm.currentPage).toBe(2);
    expect(UserService.getUsers).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
    });
  });

  it('handles page size change', async () => {
    const wrapper = createWrapper();
    
    // Simulate page size change
    await wrapper.vm.handleSizeChange(50);
    
    expect(wrapper.vm.pageSize).toBe(50);
    expect(wrapper.vm.currentPage).toBe(1);
    expect(UserService.getUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
    });
  });

  it('opens create dialog', async () => {
    const wrapper = createWrapper();
    
    wrapper.vm.showCreateDialog = true;
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.showCreateDialog).toBe(true);
  });

  it('opens edit dialog with user data', async () => {
    const wrapper = createWrapper();
    
    await wrapper.vm.editUser(mockUsers[0]);
    
    expect(wrapper.vm.showEditDialog).toBe(true);
    expect(wrapper.vm.editingUser).toEqual(mockUsers[0]);
  });

  it('handles user deletion with confirmation', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(UserService.deleteUser).mockResolvedValue();
    
    const wrapper = createWrapper();
    
    await wrapper.vm.deleteUser(mockUsers[0]);
    
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      'users.deleteConfirm',
      'users.delete',
      expect.any(Object)
    );
    expect(UserService.deleteUser).toHaveBeenCalledWith('1');
    expect(ElMessage.success).toHaveBeenCalledWith('users.deleteSuccess');
  });

  it('handles user deletion cancellation', async () => {
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel');
    
    const wrapper = createWrapper();
    
    await wrapper.vm.deleteUser(mockUsers[0]);
    
    expect(UserService.deleteUser).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });

  it('handles user deletion error', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm');
    vi.mocked(UserService.deleteUser).mockRejectedValue(new Error('Delete failed'));
    
    const wrapper = createWrapper();
    
    await wrapper.vm.deleteUser(mockUsers[0]);
    
    expect(ElMessage.error).toHaveBeenCalledWith('Delete failed');
  });

  it('handles user creation success', async () => {
    const wrapper = createWrapper();
    
    wrapper.vm.showCreateDialog = true;
    await wrapper.vm.handleUserCreated();
    
    expect(wrapper.vm.showCreateDialog).toBe(false);
    expect(UserService.getUsers).toHaveBeenCalled();
  });

  it('handles user update success', async () => {
    const wrapper = createWrapper();
    
    wrapper.vm.showEditDialog = true;
    wrapper.vm.editingUser = mockUsers[0];
    
    await wrapper.vm.handleUserUpdated();
    
    expect(wrapper.vm.showEditDialog).toBe(false);
    expect(wrapper.vm.editingUser).toBe(null);
    expect(UserService.getUsers).toHaveBeenCalled();
  });

  it('returns correct role tag type', () => {
    const wrapper = createWrapper();
    
    expect(wrapper.vm.getRoleTagType('admin')).toBe('danger');
    expect(wrapper.vm.getRoleTagType('buyer')).toBe('primary');
    expect(wrapper.vm.getRoleTagType('supplier')).toBe('success');
  });

  it('formats date correctly', () => {
    const wrapper = createWrapper();
    const dateString = '2024-01-01T00:00:00Z';
    
    const formatted = wrapper.vm.formatDate(dateString);
    
    expect(formatted).toBe(new Date(dateString).toLocaleString());
  });

  it('handles API error when loading users', async () => {
    vi.mocked(UserService.getUsers).mockRejectedValue(new Error('API Error'));
    
    createWrapper();
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(ElMessage.error).toHaveBeenCalledWith('API Error');
  });
});