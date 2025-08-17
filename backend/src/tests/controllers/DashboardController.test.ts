import { Request, Response } from 'express';
import { DashboardController } from '../../controllers/DashboardController';
import { UserModel } from '../../models/User';
import type { User } from '../../types/user';

// Mock UserModel
jest.mock('../../models/User');
const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('DashboardController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should return admin dashboard data successfully', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'admin',
          role: 'admin' as const,
          company: 'admin' as const,
          language: 'zh' as const,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          username: 'buyer1',
          role: 'buyer' as const,
          company: 'arroz' as const,
          language: 'ja' as const,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      (mockRequest as any).user = {
        userId: '1',
        role: 'admin'
      };

      MockedUserModel.findAll.mockResolvedValue(mockUsers);

      await DashboardController.getDashboardData(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.findAll).toHaveBeenCalledTimes(2); // Once for statistics, once for activities
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userRole: 'admin',
          availableFeatures: [
            'user_management',
            'inquiry_management',
            'quotation_management',
            'order_management',
            'system_settings',
            'reports',
            'file_management',
            'notification_management'
          ],
          statistics: {
            totalUsers: 2,
            totalInquiries: 0,
            pendingQuotations: 0,
            activeOrders: 0
          },
          recentActivities: expect.arrayContaining([
            expect.objectContaining({
              type: 'user_created',
              description: expect.stringContaining('buyer1'),
            }),
            expect.objectContaining({
              type: 'user_created',
              description: expect.stringContaining('admin'),
            })
          ])
        }
      });
    });

    it('should return buyer dashboard data successfully', async () => {
      (mockRequest as any).user = {
        userId: '2',
        role: 'buyer'
      };

      await DashboardController.getDashboardData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userRole: 'buyer',
          availableFeatures: [
            'inquiry_management',
            'quotation_view',
            'order_management',
            'file_management',
            'chat_communication',
            'profile_settings'
          ],
          statistics: {
            totalInquiries: 0,
            activeOrders: 0
          },
          recentActivities: [
            {
              id: 'welcome_2',
              type: 'user_created',
              description: 'Welcome to the Trade Inquiry Order System',
              timestamp: expect.any(Date),
              relatedId: '2'
            }
          ]
        }
      });
    });

    it('should return supplier dashboard data successfully', async () => {
      (mockRequest as any).user = {
        userId: '3',
        role: 'supplier'
      };

      await DashboardController.getDashboardData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userRole: 'supplier',
          availableFeatures: [
            'inquiry_view',
            'quotation_management',
            'order_tracking',
            'file_management',
            'chat_communication',
            'profile_settings'
          ],
          statistics: {
            pendingQuotations: 0,
            activeOrders: 0
          },
          recentActivities: [
            {
              id: 'welcome_3',
              type: 'user_created',
              description: 'Welcome to the Trade Inquiry Order System',
              timestamp: expect.any(Date),
              relatedId: '3'
            }
          ]
        }
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      (mockRequest as any).user = {};

      await DashboardController.getDashboardData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockRequest as any).user = {
        userId: '1',
        role: 'admin'
      };

      MockedUserModel.findAll.mockRejectedValue(new Error('Database error'));

      await DashboardController.getDashboardData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          userRole: 'admin',
          availableFeatures: expect.any(Array),
          statistics: {}, // Empty statistics due to error
          recentActivities: [] // Empty activities due to error
        }
      });
    });
  });

  describe('getUserStatistics', () => {
    it('should return user statistics successfully', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'admin',
          role: 'admin' as const,
          company: 'admin' as const,
          language: 'zh' as const,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          username: 'buyer1',
          role: 'buyer' as const,
          company: 'arroz' as const,
          language: 'ja' as const,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '3',
          username: 'supplier1',
          role: 'supplier' as const,
          company: 'yunjie' as const,
          language: 'zh' as const,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
        },
      ];

      MockedUserModel.findAll.mockResolvedValue(mockUsers);

      await DashboardController.getUserStatistics(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.findAll).toHaveBeenCalledTimes(1);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 3,
          byRole: {
            admin: 1,
            buyer: 1,
            supplier: 1
          },
          byCompany: {
            admin: 1,
            arroz: 1,
            yunjie: 1
          },
          byLanguage: {
            zh: 2,
            ja: 1
          },
          recentUsers: [
            {
              id: '3',
              username: 'supplier1',
              role: 'supplier',
              company: 'yunjie',
              createdAt: new Date('2024-01-03')
            },
            {
              id: '2',
              username: 'buyer1',
              role: 'buyer',
              company: 'arroz',
              createdAt: new Date('2024-01-02')
            },
            {
              id: '1',
              username: 'admin',
              role: 'admin',
              company: 'admin',
              createdAt: new Date('2024-01-01')
            }
          ]
        }
      });
    });

    it('should handle database errors', async () => {
      MockedUserModel.findAll.mockRejectedValue(new Error('Database error'));

      await DashboardController.getUserStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user statistics'
        }
      });
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy system status', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'admin',
          role: 'admin' as const,
          company: 'admin' as const,
          language: 'zh' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      MockedUserModel.findAll.mockResolvedValue(mockUsers);

      await DashboardController.getSystemHealth(mockRequest as Request, mockResponse as Response);

      expect(MockedUserModel.findAll).toHaveBeenCalledTimes(1);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String),
          services: {
            database: {
              status: 'healthy',
              userCount: 1
            },
            redis: {
              status: 'not_implemented',
              message: 'Redis health check not implemented yet'
            },
            fileSystem: {
              status: 'not_implemented',
              message: 'File system health check not implemented yet'
            }
          },
          uptime: expect.any(Number),
          memory: {
            used: expect.any(Number),
            total: expect.any(Number),
            external: expect.any(Number)
          }
        }
      });
    });

    it('should return degraded status when database is unhealthy', async () => {
      MockedUserModel.findAll.mockRejectedValue(new Error('Database connection failed'));

      await DashboardController.getSystemHealth(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          status: 'degraded',
          timestamp: expect.any(String),
          services: {
            database: {
              status: 'unhealthy',
              userCount: 0
            },
            redis: {
              status: 'not_implemented',
              message: 'Redis health check not implemented yet'
            },
            fileSystem: {
              status: 'not_implemented',
              message: 'File system health check not implemented yet'
            }
          },
          uptime: expect.any(Number),
          memory: {
            used: expect.any(Number),
            total: expect.any(Number),
            external: expect.any(Number)
          }
        }
      });
    });

    it('should handle unexpected errors', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Process error');
      });

      await DashboardController.getSystemHealth(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while checking system health'
        }
      });

      // Restore original function
      process.uptime = originalUptime;
    });
  });
});