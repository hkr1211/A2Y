import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { DashboardService } from '@/services/dashboardService';
import type { DashboardData, UserStatistics, SystemHealth } from '@/services/dashboardService';
import type { ApiResponse } from '@/types/api';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios);

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockDashboardData: DashboardData = {
    userRole: 'admin',
    availableFeatures: ['user_management', 'inquiry_management'],
    statistics: {
      totalUsers: 10,
      totalInquiries: 25,
      pendingQuotations: 5,
      activeOrders: 8,
    },
    recentActivities: [
      {
        id: '1',
        type: 'user_created',
        description: 'New user created',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        relatedId: 'user1',
      },
    ],
  };

  const mockUserStats: UserStatistics = {
    total: 10,
    byRole: { admin: 1, buyer: 5, supplier: 4 },
    byCompany: { admin: 1, arroz: 5, yunjie: 4 },
    byLanguage: { zh: 6, ja: 4 },
    recentUsers: [
      {
        id: '1',
        username: 'testuser',
        role: 'buyer',
        company: 'arroz',
        createdAt: '2024-01-01T10:00:00Z',
      },
    ],
  };

  const mockSystemHealth: SystemHealth = {
    status: 'healthy',
    timestamp: '2024-01-01T10:00:00Z',
    services: {
      database: { status: 'healthy', userCount: 10 },
      redis: { status: 'not_implemented', message: 'Redis not implemented' },
      fileSystem: { status: 'not_implemented', message: 'File system not implemented' },
    },
    uptime: 3600,
    memory: { used: 50000000, total: 100000000, external: 5000000 },
  };

  describe('getDashboardData', () => {
    it('should fetch dashboard data successfully', async () => {
      const mockResponse: ApiResponse<DashboardData> = {
        success: true,
        data: mockDashboardData,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DashboardService.getDashboardData();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard');
      expect(result).toEqual({
        ...mockDashboardData,
        recentActivities: mockDashboardData.recentActivities.map(activity => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        })),
      });
    });

    it('should convert timestamp strings to Date objects', async () => {
      const mockDataWithStringTimestamps = {
        ...mockDashboardData,
        recentActivities: [
          {
            id: '1',
            type: 'user_created' as const,
            description: 'New user created',
            timestamp: '2024-01-01T10:00:00Z' as any, // String timestamp
            relatedId: 'user1',
          },
        ],
      };

      const mockResponse: ApiResponse<DashboardData> = {
        success: true,
        data: mockDataWithStringTimestamps,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DashboardService.getDashboardData();

      expect(result.recentActivities[0].timestamp).toBeInstanceOf(Date);
      expect(result.recentActivities[0].timestamp.toISOString()).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should handle API error response', async () => {
      const mockResponse: ApiResponse<DashboardData> = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getDashboardData()).rejects.toThrow('User not authenticated');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(DashboardService.getDashboardData()).rejects.toThrow('Network Error');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = {
        response: {
          data: {
            error: {
              message: 'Internal Server Error',
            },
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(httpError);

      await expect(DashboardService.getDashboardData()).rejects.toThrow('Internal Server Error');
    });

    it('should handle missing error message gracefully', async () => {
      const mockResponse: ApiResponse<DashboardData> = {
        success: false,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getDashboardData()).rejects.toThrow('Failed to fetch dashboard data');
    });

    it('should handle missing data gracefully', async () => {
      const mockResponse: ApiResponse<DashboardData> = {
        success: true,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getDashboardData()).rejects.toThrow('Failed to fetch dashboard data');
    });
  });

  describe('getUserStatistics', () => {
    it('should fetch user statistics successfully', async () => {
      const mockResponse: ApiResponse<UserStatistics> = {
        success: true,
        data: mockUserStats,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DashboardService.getUserStatistics();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/user-stats');
      expect(result).toEqual(mockUserStats);
    });

    it('should handle API error response', async () => {
      const mockResponse: ApiResponse<UserStatistics> = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getUserStatistics()).rejects.toThrow('Admin access required');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Connection timeout');
      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(DashboardService.getUserStatistics()).rejects.toThrow('Connection timeout');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = {
        response: {
          data: {
            error: {
              message: 'Forbidden',
            },
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(httpError);

      await expect(DashboardService.getUserStatistics()).rejects.toThrow('Forbidden');
    });

    it('should provide default error message when none provided', async () => {
      const mockResponse: ApiResponse<UserStatistics> = {
        success: false,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getUserStatistics()).rejects.toThrow('Failed to fetch user statistics');
    });
  });

  describe('getSystemHealth', () => {
    it('should fetch system health successfully', async () => {
      const mockResponse: ApiResponse<SystemHealth> = {
        success: true,
        data: mockSystemHealth,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DashboardService.getSystemHealth();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/system-health');
      expect(result).toEqual(mockSystemHealth);
    });

    it('should handle API error response', async () => {
      const mockResponse: ApiResponse<SystemHealth> = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getSystemHealth()).rejects.toThrow('Admin access required');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Service unavailable');
      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(DashboardService.getSystemHealth()).rejects.toThrow('Service unavailable');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = {
        response: {
          data: {
            error: {
              message: 'Service temporarily unavailable',
            },
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(httpError);

      await expect(DashboardService.getSystemHealth()).rejects.toThrow('Service temporarily unavailable');
    });

    it('should provide default error message when none provided', async () => {
      const mockResponse: ApiResponse<SystemHealth> = {
        success: false,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getSystemHealth()).rejects.toThrow('Failed to fetch system health');
    });

    it('should handle missing data gracefully', async () => {
      const mockResponse: ApiResponse<SystemHealth> = {
        success: true,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(DashboardService.getSystemHealth()).rejects.toThrow('Failed to fetch system health');
    });
  });

  describe('Error Logging', () => {
    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await DashboardService.getDashboardData();
      } catch (e) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('Dashboard service error:', error);
      
      consoleSpy.mockRestore();
    });

    it('should log user statistics errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Stats error');
      
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await DashboardService.getUserStatistics();
      } catch (e) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('User statistics service error:', error);
      
      consoleSpy.mockRestore();
    });

    it('should log system health errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Health error');
      
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await DashboardService.getSystemHealth();
      } catch (e) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('System health service error:', error);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty activities array', async () => {
      const mockDataWithEmptyActivities = {
        ...mockDashboardData,
        recentActivities: [],
      };

      const mockResponse: ApiResponse<DashboardData> = {
        success: true,
        data: mockDataWithEmptyActivities,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DashboardService.getDashboardData();

      expect(result.recentActivities).toEqual([]);
    });

    it('should handle null statistics', async () => {
      const mockDataWithNullStats = {
        ...mockDashboardData,
        statistics: {},
      };

      const mockResponse: ApiResponse<DashboardData> = {
        success: true,
        data: mockDataWithNullStats,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DashboardService.getDashboardData();

      expect(result.statistics).toEqual({});
    });

    it('should handle malformed timestamp strings', async () => {
      const mockDataWithBadTimestamp = {
        ...mockDashboardData,
        recentActivities: [
          {
            id: '1',
            type: 'user_created' as const,
            description: 'New user created',
            timestamp: 'invalid-date' as any,
            relatedId: 'user1',
          },
        ],
      };

      const mockResponse: ApiResponse<DashboardData> = {
        success: true,
        data: mockDataWithBadTimestamp,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DashboardService.getDashboardData();

      // Should create a Date object even with invalid string
      expect(result.recentActivities[0].timestamp).toBeInstanceOf(Date);
      expect(result.recentActivities[0].timestamp.toString()).toBe('Invalid Date');
    });
  });
});