import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test configuration for Vue Test Utils
config.global.mocks = {
  $t: (key: string, params?: any) => {
    const translations: Record<string, string> = {
      'users.title': 'User Management',
      'users.create': 'Create User',
      'users.edit': 'Edit User',
      'users.delete': 'Delete User',
      'users.deleteConfirm': 'Are you sure to delete user "{username}"?',
      'users.deleteSuccess': 'User deleted successfully',
      'users.deleteError': 'Failed to delete user',
      'users.username': 'Username',
      'users.password': 'Password',
      'users.confirmPassword': 'Confirm Password',
      'users.role': 'Role',
      'users.company': 'Company',
      'users.language': 'Language',
      'users.createdAt': 'Created At',
      'users.updatedAt': 'Updated At',
      'users.createSuccess': 'User created successfully',
      'users.updateSuccess': 'User updated successfully',
      'users.createError': 'Failed to create user',
      'users.updateError': 'Failed to update user',
      'users.usernameRequired': 'Username is required',
      'users.usernameLength': 'Username length should be 3-50 characters',
      'users.passwordRequired': 'Password is required',
      'users.passwordLength': 'Password should be at least 6 characters',
      'users.confirmPasswordRequired': 'Please confirm password',
      'users.passwordMismatch': 'Passwords do not match',
      'users.roleRequired': 'Please select user role',
      'users.companyRequired': 'Please select company',
      'users.roles.admin': 'Admin',
      'users.roles.buyer': 'Buyer',
      'users.roles.supplier': 'Supplier',
      'users.companies.admin': 'Admin',
      'users.companies.arroz': 'Arroz',
      'users.companies.yunjie': 'Yunjie',
      'users.languages.zh': 'Chinese',
      'users.languages.ja': 'Japanese',
      'common.search': 'Search',
      'common.reset': 'Reset',
      'common.edit': 'Edit',
      'common.delete': 'Delete',
      'common.confirm': 'Confirm',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.operation': 'Operation',
      'errors.serverError': 'Server error',
    };
    
    if (params && key.includes('{username}')) {
      return translations[key]?.replace('{username}', params.username) || key;
    }
    
    return translations[key] || key;
  },
};