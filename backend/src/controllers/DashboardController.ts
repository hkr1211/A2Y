import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import type { UserRole } from '../types/user';

interface DashboardStatistics {
  totalUsers?: number;
  totalInquiries?: number;
  pendingQuotations?: number;
  activeOrders?: number;
}

interface Activity {
  id: string;
  type: 'user_created' | 'inquiry_created' | 'quotation_received' | 'order_confirmed' | 'status_updated';
  description: string;
  timestamp: Date;
  relatedId?: string;
}

interface DashboardData {
  userRole: UserRole;
  availableFeatures: string[];
  statistics: DashboardStatistics;
  recentActivities: Activity[];
}

export class DashboardController {
  /**
   * Get role-based features for the user
   */
  private static getRoleBasedFeatures(role: UserRole): string[] {
    switch (role) {
      case 'admin':
        return [
          'user_management',
          'inquiry_management',
          'quotation_management',
          'order_management',
          'system_settings',
          'reports',
          'file_management',
          'notification_management'
        ];
      case 'buyer':
        return [
          'inquiry_management',
          'quotation_view',
          'order_management',
          'file_management',
          'chat_communication',
          'profile_settings'
        ];
      case 'supplier':
        return [
          'inquiry_view',
          'quotation_management',
          'order_tracking',
          'file_management',
          'chat_communication',
          'profile_settings'
        ];
      default:
        return [];
    }
  }

  /**
   * Get statistics based on user role
   */
  private static async getRoleBasedStatistics(role: UserRole): Promise<DashboardStatistics> {
    const statistics: DashboardStatistics = {};

    try {
      // For admin users, show all statistics
      if (role === 'admin') {
        const users = await UserModel.findAll();
        statistics.totalUsers = users.length;
        
        // TODO: Add inquiry, quotation, and order statistics when those models are implemented
        statistics.totalInquiries = 0;
        statistics.pendingQuotations = 0;
        statistics.activeOrders = 0;
      }
      
      // For buyer users, show their own inquiries and orders
      else if (role === 'buyer') {
        // TODO: Add buyer-specific statistics when inquiry and order models are implemented
        statistics.totalInquiries = 0;
        statistics.activeOrders = 0;
      }
      
      // For supplier users, show quotations and orders they're involved in
      else if (role === 'supplier') {
        // TODO: Add supplier-specific statistics when quotation and order models are implemented
        statistics.pendingQuotations = 0;
        statistics.activeOrders = 0;
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Return empty statistics on error
    }

    return statistics;
  }

  /**
   * Get recent activities based on user role
   */
  private static async getRoleBasedActivities(role: UserRole, userId: string): Promise<Activity[]> {
    const activities: Activity[] = [];

    try {
      // For admin users, show system-wide activities
      if (role === 'admin') {
        // TODO: Add system-wide activity tracking when other modules are implemented
        // For now, show user creation activities
        const users = await UserModel.findAll();
        const recentUsers = users
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        recentUsers.forEach((user, index) => {
          activities.push({
            id: `user_${user.id}_${index}`,
            type: 'user_created',
            description: `New ${user.role} user "${user.username}" was created`,
            timestamp: user.createdAt,
            relatedId: user.id
          });
        });
      }
      
      // For buyer and supplier users, show their own activities
      else {
        // TODO: Add user-specific activity tracking when other modules are implemented
        // For now, show a placeholder activity
        activities.push({
          id: `welcome_${userId}`,
          type: 'user_created',
          description: 'Welcome to the Trade Inquiry Order System',
          timestamp: new Date(),
          relatedId: userId
        });
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Return empty activities on error
    }

    return activities;
  }

  /**
   * Get dashboard data for the current user
   * @route GET /api/dashboard
   * @access Private
   */
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role as UserRole;

      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      // Get role-based features
      const availableFeatures = DashboardController.getRoleBasedFeatures(userRole);

      // Get role-based statistics
      const statistics = await DashboardController.getRoleBasedStatistics(userRole);

      // Get role-based recent activities
      const recentActivities = await DashboardController.getRoleBasedActivities(userRole, userId);

      const dashboardData: DashboardData = {
        userRole,
        availableFeatures,
        statistics,
        recentActivities
      };

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching dashboard data'
        }
      });
    }
  }

  /**
   * Get user statistics (admin only)
   * @route GET /api/dashboard/user-stats
   * @access Private (Admin only)
   */
  static async getUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserModel.findAll();
      
      // Calculate user statistics by role and company
      const roleStats = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const companyStats = users.reduce((acc, user) => {
        acc[user.company] = (acc[user.company] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const languageStats = users.reduce((acc, user) => {
        acc[user.language] = (acc[user.language] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        success: true,
        data: {
          total: users.length,
          byRole: roleStats,
          byCompany: companyStats,
          byLanguage: languageStats,
          recentUsers: users
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(user => ({
              id: user.id,
              username: user.username,
              role: user.role,
              company: user.company,
              createdAt: user.createdAt
            }))
        }
      });
    } catch (error) {
      console.error('User statistics error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user statistics'
        }
      });
    }
  }

  /**
   * Get system health status
   * @route GET /api/dashboard/system-health
   * @access Private (Admin only)
   */
  static async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      // Check database connectivity
      let databaseStatus = 'healthy';
      let userCount = 0;
      
      try {
        const users = await UserModel.findAll();
        userCount = users.length;
      } catch (error) {
        databaseStatus = 'unhealthy';
        console.error('Database health check failed:', error);
      }

      // TODO: Add more health checks when other services are implemented
      // - Redis connectivity
      // - File system access
      // - External API connectivity (translation service)

      const systemHealth = {
        status: databaseStatus === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: databaseStatus,
            userCount
          },
          redis: {
            status: 'not_implemented', // TODO: Implement Redis health check
            message: 'Redis health check not implemented yet'
          },
          fileSystem: {
            status: 'not_implemented', // TODO: Implement file system health check
            message: 'File system health check not implemented yet'
          }
        },
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        }
      };

      res.status(200).json({
        success: true,
        data: systemHealth
      });
    } catch (error) {
      console.error('System health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while checking system health'
        }
      });
    }
  }
}