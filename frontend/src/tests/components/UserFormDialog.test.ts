import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import UserFormDialog from '@/components/UserFormDialog.vue';
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
  };
});

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const mockUser: User = {
  id: '1',
  username: 'testuser',
  role: 'buyer',
  company: 'arroz',
  language: 'zh',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('UserFormDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create dialog correctly', () => {
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    expect(wrapper.vm.isEditing).toBe(false);
    expect(wrapper.exists()).toBe(true);
  });

  it('renders edit dialog correctly', () => {
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: mockUser,
      },
    });
    
    expect(wrapper.vm.isEditing).toBe(true);
    expect(wrapper.exists()).toBe(true);
  });

  it('loads user data when editing', async () => {
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: mockUser,
      },
    });
    
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.formData.username).toBe('testuser');
    expect(wrapper.vm.formData.role).toBe('buyer');
    expect(wrapper.vm.formData.company).toBe('arroz');
    expect(wrapper.vm.formData.language).toBe('zh');
  });

  it('resets form when dialog closes', async () => {
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    // Set some form data
    wrapper.vm.formData.username = 'test';
    wrapper.vm.formData.password = 'password';
    
    // Mock formRef
    wrapper.vm.formRef = {
      resetFields: vi.fn(),
    };
    
    // Close dialog
    await wrapper.vm.resetForm();
    
    expect(wrapper.vm.formData.username).toBe('');
    expect(wrapper.vm.formData.password).toBe('');
  });

  it('validates required fields for create', async () => {
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    // Try to submit empty form
    await wrapper.vm.handleSubmit();
    
    // Should not call API without valid data
    expect(UserService.createUser).not.toHaveBeenCalled();
  });

  it('validates password confirmation', async () => {
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    wrapper.vm.formData.password = 'password123';
    wrapper.vm.formData.confirmPassword = 'different';
    
    // Trigger password confirmation validation
    const validator = wrapper.vm.formRules.confirmPassword[1].validator;
    let errorMessage = '';
    
    validator(null, 'different', (error: Error) => {
      if (error) errorMessage = error.message;
    });
    
    expect(errorMessage).toBe('users.passwordMismatch');
  });

  it('creates user successfully', async () => {
    const mockCreatedUser = { ...mockUser, id: '2', username: 'newuser' };
    vi.mocked(UserService.createUser).mockResolvedValue(mockCreatedUser);
    
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    // Fill form data
    wrapper.vm.formData.username = 'newuser';
    wrapper.vm.formData.password = 'password123';
    wrapper.vm.formData.confirmPassword = 'password123';
    wrapper.vm.formData.role = 'buyer';
    wrapper.vm.formData.company = 'arroz';
    wrapper.vm.formData.language = 'zh';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(UserService.createUser).toHaveBeenCalledWith({
      username: 'newuser',
      password: 'password123',
      role: 'buyer',
      company: 'arroz',
      language: 'zh',
    });
    expect(ElMessage.success).toHaveBeenCalledWith('users.createSuccess');
  });

  it('updates user successfully', async () => {
    const mockUpdatedUser = { ...mockUser, role: 'admin' };
    vi.mocked(UserService.updateUser).mockResolvedValue(mockUpdatedUser);
    
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: mockUser,
      },
    });
    
    // Update form data
    wrapper.vm.formData.role = 'admin';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(UserService.updateUser).toHaveBeenCalledWith('1', {
      role: 'admin',
      company: 'arroz',
      language: 'zh',
    });
    expect(ElMessage.success).toHaveBeenCalledWith('users.updateSuccess');
  });

  it('handles create error', async () => {
    vi.mocked(UserService.createUser).mockRejectedValue(new Error('Create failed'));
    
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    // Fill form data
    wrapper.vm.formData.username = 'newuser';
    wrapper.vm.formData.password = 'password123';
    wrapper.vm.formData.confirmPassword = 'password123';
    wrapper.vm.formData.role = 'buyer';
    wrapper.vm.formData.company = 'arroz';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(ElMessage.error).toHaveBeenCalledWith('Create failed');
  });

  it('handles update error', async () => {
    vi.mocked(UserService.updateUser).mockRejectedValue(new Error('Update failed'));
    
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: mockUser,
      },
    });
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(ElMessage.error).toHaveBeenCalledWith('Update failed');
  });

  it('emits success event after successful operation', async () => {
    vi.mocked(UserService.createUser).mockResolvedValue(mockUser);
    
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    // Fill form data
    wrapper.vm.formData.username = 'newuser';
    wrapper.vm.formData.password = 'password123';
    wrapper.vm.formData.confirmPassword = 'password123';
    wrapper.vm.formData.role = 'buyer';
    wrapper.vm.formData.company = 'arroz';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    await wrapper.vm.handleSubmit();
    
    expect(wrapper.emitted('success')).toBeTruthy();
  });

  it('shows loading state during submission', async () => {
    vi.mocked(UserService.createUser).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockUser), 100))
    );
    
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    // Fill form data
    wrapper.vm.formData.username = 'newuser';
    wrapper.vm.formData.password = 'password123';
    wrapper.vm.formData.confirmPassword = 'password123';
    wrapper.vm.formData.role = 'buyer';
    wrapper.vm.formData.company = 'arroz';
    
    // Mock form validation
    const mockFormRef = {
      validate: vi.fn().mockResolvedValue(true),
      resetFields: vi.fn(),
    };
    wrapper.vm.formRef = mockFormRef;
    
    // Initially not submitting
    expect(wrapper.vm.submitting).toBe(false);
    
    const submitPromise = wrapper.vm.handleSubmit();
    
    await submitPromise;
    
    // After completion, should not be submitting
    expect(wrapper.vm.submitting).toBe(false);
  });

  it('computes isEditing correctly', () => {
    const createWrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    const editWrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: mockUser,
      },
    });
    
    expect(createWrapper.vm.isEditing).toBe(false);
    expect(editWrapper.vm.isEditing).toBe(true);
  });

  it('updates form data when user prop changes', async () => {
    const wrapper = mount(UserFormDialog, {
      props: {
        visible: true,
        user: null,
      },
    });
    
    expect(wrapper.vm.formData.username).toBe('');
    
    await wrapper.setProps({ user: mockUser });
    
    expect(wrapper.vm.formData.username).toBe('testuser');
    expect(wrapper.vm.formData.role).toBe('buyer');
  });
});