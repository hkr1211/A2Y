import axios from 'axios';
import type { ApiResponse } from '@/types/api';

export interface DashboardStatistics {
  totalUsers?: number;
  totalInquiries?: number;
  pendingQuotations?: number;
  activeOrders?: number;
}

export interface Activity {
  id: string;
  type: 'user_created' | 'inquiry_created' | 'quotation_received' | 'order_confirmed' | 'status_updated';
  description: string;
  timestamp: Date;
  relatedId?: string;
}

export interface DashboardData {
  userRole: string;
  availableFeatures: string[];
  statistics: DashboardStatistics;
  recentActivities: Activity[];
}

export interface UserStatistics {
  total: number;
  byRole: Record<string, number>;
  byCompany: Record<string, number>;
  byLanguage: Record<string, number>;
  recentUsers: Array<{
    id: string;
    username: string;
    role: string;
    company: string;
    createdAt: string;
  }>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: string;
      userCount: number;
    };
    redis: {
      status: string;
      message: string;
    };
    fileSystem: {
      status: string;
      message: string;
    };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    external: number;
  };
}

export class DashboardService {
  /**
   * Get dashboard data for the current user
   */
  static async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await axios.get<ApiResponse<DashboardData>>('/api/dashboard');
      
      if (response.data.success && response.data.data) {
        // Convert timestamp strings to Date objects
        const data = response.data.data;
        data.recentActivities = data.recentActivities.map(activity => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
        
        return data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch dashboard data');
      }
    } catch (error: any) {
      console.error('Dashboard service error:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to fetch dashboard data');
    }
  }

  /**
   * Get user statistics (admin only)
   */
  static async getUserStatistics(): Promise<UserStatistics> {
    try {
      const response = await axios.get<ApiResponse<UserStatistics>>('/api/dashboard/user-stats');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch user statistics');
      }
    } catch (error: any) {
      console.error('User statistics service error:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to fetch user statistics');
    }
  }

  /**
   * Get system health status (admin only)
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await axios.get<ApiResponse<SystemHealth>>('/api/dashboard/system-health');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch system health');
      }
    } catch (error: any) {
      console.error('System health service error:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to fetch system health');
    }
  }
}