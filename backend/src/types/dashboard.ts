export interface DashboardData {
  userRole: string;
  availableFeatures: string[];
  statistics: {
    totalInquiries?: number;
    pendingQuotations?: number;
    activeOrders?: number;
    totalUsers?: number; // Only visible to admin
  };
  recentActivities: Activity[];
}

export interface Activity {
  id: string;
  type: 'inquiry_created' | 'quotation_received' | 'order_confirmed' | 'status_updated';
  description: string;
  timestamp: Date;
  relatedId: string;
}