export type NotificationType = 
  | 'quotation_received' 
  | 'order_confirmed' 
  | 'status_updated' 
  | 'message_received';

export type RelatedType = 'inquiry' | 'order';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId: string; // Related inquiry or order ID
  relatedType: RelatedType;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId: string;
  relatedType: RelatedType;
}