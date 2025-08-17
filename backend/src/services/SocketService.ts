import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatMessage } from '../types/chat';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  role?: string;
}

interface UserStatus {
  userId: string;
  username: string;
  role: string;
  socketId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export class SocketService {
  private io: Server;
  private connectedUsers: Map<string, UserStatus> = new Map();
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));
    
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.id} (${socket.username})`);
      
      if (socket.userId) {
        this.handleUserConnection(socket);
      }

      // Handle joining chat rooms
      socket.on('join-chat', (data: { relatedId: string; relatedType: 'inquiry' | 'order' }) => {
        this.handleJoinChat(socket, data);
      });

      // Handle leaving chat rooms
      socket.on('leave-chat', (data: { relatedId: string; relatedType: 'inquiry' | 'order' }) => {
        this.handleLeaveChat(socket, data);
      });

      // Handle sending messages
      socket.on('send-message', (data: ChatMessage) => {
        this.handleSendMessage(socket, data);
      });

      // Handle message read status
      socket.on('mark-read', (data: { relatedId: string; relatedType: 'inquiry' | 'order' }) => {
        this.handleMarkRead(socket, data);
      });

      // Handle typing indicators
      socket.on('typing-start', (data: { relatedId: string; relatedType: 'inquiry' | 'order' }) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing-stop', (data: { relatedId: string; relatedType: 'inquiry' | 'order' }) => {
        this.handleTypingStop(socket, data);
      });

      // Handle notification-specific events
      socket.on('notification-viewed', (data: { notificationId: string }) => {
        this.handleNotificationViewed(socket, data);
      });

      socket.on('notification-interaction', (data: { 
        type: 'viewing' | 'reading' | 'managing'; 
        section?: string 
      }) => {
        this.handleNotificationInteraction(socket, data);
      });

      socket.on('request-notification-history', (data: { 
        limit?: number; 
        offset?: number; 
        type?: string;
        isRead?: boolean;
      }) => {
        this.handleRequestNotificationHistory(socket, data);
      });

      socket.on('request-notification-statistics', () => {
        this.handleRequestNotificationStatistics(socket);
      });

      socket.on('bulk-mark-read', (data: { notificationIds: string[] }) => {
        this.handleBulkMarkRead(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleUserDisconnection(socket);
      });
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      socket.role = decoded.role;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  }

  private handleUserConnection(socket: AuthenticatedSocket): void {
    if (!socket.userId) return;

    const userStatus: UserStatus = {
      userId: socket.userId,
      username: socket.username!,
      role: socket.role!,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date()
    };

    this.connectedUsers.set(socket.userId, userStatus);
    this.userSockets.set(socket.userId, socket.id);

    // Notify other users about online status
    socket.broadcast.emit('user-online', {
      userId: socket.userId,
      username: socket.username,
      isOnline: true
    });

    // Send current online users to the newly connected user
    const onlineUsers = Array.from(this.connectedUsers.values())
      .filter(user => user.isOnline)
      .map(user => ({
        userId: user.userId,
        username: user.username,
        role: user.role,
        isOnline: user.isOnline
      }));

    socket.emit('online-users', onlineUsers);
  }

  private handleUserDisconnection(socket: AuthenticatedSocket): void {
    console.log(`User disconnected: ${socket.id} (${socket.username})`);
    
    if (!socket.userId) return;

    const userStatus = this.connectedUsers.get(socket.userId);
    if (userStatus) {
      userStatus.isOnline = false;
      userStatus.lastSeen = new Date();
    }

    this.userSockets.delete(socket.userId);

    // Notify other users about offline status
    socket.broadcast.emit('user-offline', {
      userId: socket.userId,
      username: socket.username,
      isOnline: false,
      lastSeen: new Date()
    });
  }

  private handleJoinChat(socket: AuthenticatedSocket, data: { relatedId: string; relatedType: 'inquiry' | 'order' }): void {
    const roomName = this.getRoomName(data.relatedId, data.relatedType);
    socket.join(roomName);
    
    console.log(`User ${socket.username} joined chat room: ${roomName}`);
    
    // Notify others in the room
    socket.to(roomName).emit('user-joined-chat', {
      userId: socket.userId,
      username: socket.username,
      relatedId: data.relatedId,
      relatedType: data.relatedType
    });
  }

  private handleLeaveChat(socket: AuthenticatedSocket, data: { relatedId: string; relatedType: 'inquiry' | 'order' }): void {
    const roomName = this.getRoomName(data.relatedId, data.relatedType);
    socket.leave(roomName);
    
    console.log(`User ${socket.username} left chat room: ${roomName}`);
    
    // Notify others in the room
    socket.to(roomName).emit('user-left-chat', {
      userId: socket.userId,
      username: socket.username,
      relatedId: data.relatedId,
      relatedType: data.relatedType
    });
  }

  private handleSendMessage(socket: AuthenticatedSocket, data: ChatMessage): void {
    const roomName = this.getRoomName(data.relatedId, data.relatedType);
    
    // Broadcast message to all users in the room except sender
    socket.to(roomName).emit('new-message', {
      ...data,
      senderUsername: socket.username,
      timestamp: new Date()
    });

    console.log(`Message sent in room ${roomName} by ${socket.username}`);
  }

  private handleMarkRead(socket: AuthenticatedSocket, data: { relatedId: string; relatedType: 'inquiry' | 'order' }): void {
    const roomName = this.getRoomName(data.relatedId, data.relatedType);
    
    // Notify others in the room that messages have been read
    socket.to(roomName).emit('messages-read', {
      userId: socket.userId,
      username: socket.username,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      readAt: new Date()
    });
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: { relatedId: string; relatedType: 'inquiry' | 'order' }): void {
    const roomName = this.getRoomName(data.relatedId, data.relatedType);
    
    socket.to(roomName).emit('user-typing', {
      userId: socket.userId,
      username: socket.username,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      isTyping: true
    });
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: { relatedId: string; relatedType: 'inquiry' | 'order' }): void {
    const roomName = this.getRoomName(data.relatedId, data.relatedType);
    
    socket.to(roomName).emit('user-typing', {
      userId: socket.userId,
      username: socket.username,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      isTyping: false
    });
  }

  private getRoomName(relatedId: string, relatedType: 'inquiry' | 'order'): string {
    return `${relatedType}-${relatedId}`;
  }

  // New notification-specific handlers
  private async handleNotificationViewed(socket: AuthenticatedSocket, data: { notificationId: string }): Promise<void> {
    if (!socket.userId) return;

    console.log(`User ${socket.username} viewed notification: ${data.notificationId}`);
    
    // You could track notification view analytics here
    // For now, just emit an acknowledgment
    socket.emit('notification-view-acknowledged', {
      notificationId: data.notificationId,
      viewedAt: new Date()
    });
  }

  private handleNotificationInteraction(socket: AuthenticatedSocket, data: { 
    type: 'viewing' | 'reading' | 'managing'; 
    section?: string 
  }): void {
    if (!socket.userId) return;

    this.sendNotificationInteraction(socket.userId, {
      ...data,
      timestamp: new Date()
    });
  }

  private async handleRequestNotificationHistory(socket: AuthenticatedSocket, data: { 
    limit?: number; 
    offset?: number; 
    type?: string;
    isRead?: boolean;
  }): Promise<void> {
    if (!socket.userId) return;

    try {
      // Import NotificationService dynamically to avoid circular dependencies
      const { NotificationService } = await import('./NotificationService');
      const { pool } = await import('../config/database');
      
      const notificationService = new NotificationService(pool);
      const result = await notificationService.getNotificationHistory(socket.userId, {
        limit: data.limit || 20,
        offset: data.offset || 0,
        type: data.type as any,
        isRead: data.isRead
      });

      socket.emit('notification-history-response', {
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching notification history:', error);
      socket.emit('notification-history-response', {
        success: false,
        error: 'Failed to fetch notification history'
      });
    }
  }

  private async handleRequestNotificationStatistics(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.userId) return;

    try {
      const { NotificationService } = await import('./NotificationService');
      const { pool } = await import('../config/database');
      
      const notificationService = new NotificationService(pool);
      const statistics = await notificationService.getNotificationStatistics(socket.userId);

      socket.emit('notification-statistics-response', {
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error fetching notification statistics:', error);
      socket.emit('notification-statistics-response', {
        success: false,
        error: 'Failed to fetch notification statistics'
      });
    }
  }

  private async handleBulkMarkRead(socket: AuthenticatedSocket, data: { notificationIds: string[] }): Promise<void> {
    if (!socket.userId) return;

    try {
      const { NotificationService } = await import('./NotificationService');
      const { pool } = await import('../config/database');
      
      const notificationService = new NotificationService(pool);
      let successCount = 0;

      // Mark each notification as read
      for (const notificationId of data.notificationIds) {
        const success = await notificationService.markAsRead(notificationId, socket.userId);
        if (success) successCount++;
      }

      socket.emit('bulk-mark-read-response', {
        success: true,
        data: {
          requested: data.notificationIds.length,
          successful: successCount
        }
      });

      // Send updated unread count
      const unreadCount = await notificationService.getUnreadCount(socket.userId);
      this.sendUnreadCountUpdate(socket.userId, unreadCount);

    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
      socket.emit('bulk-mark-read-response', {
        success: false,
        error: 'Failed to mark notifications as read'
      });
    }
  }

  // Public methods for external use
  public broadcastToRoom(relatedId: string, relatedType: 'inquiry' | 'order', event: string, data: any): void {
    const roomName = this.getRoomName(relatedId, relatedType);
    this.io.to(roomName).emit(event, data);
  }

  public sendToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public getOnlineUsers(): UserStatus[] {
    return Array.from(this.connectedUsers.values()).filter(user => user.isOnline);
  }

  public isUserOnline(userId: string): boolean {
    const user = this.connectedUsers.get(userId);
    return user ? user.isOnline : false;
  }

  public getUsersInRoom(relatedId: string, relatedType: 'inquiry' | 'order'): string[] {
    const roomName = this.getRoomName(relatedId, relatedType);
    const room = this.io.sockets.adapter.rooms.get(roomName);
    
    if (!room) return [];
    
    const userIds: string[] = [];
    for (const socketId of room) {
      const socket = this.io.sockets.sockets.get(socketId) as AuthenticatedSocket;
      if (socket && socket.userId) {
        userIds.push(socket.userId);
      }
    }
    
    return userIds;
  }

  // Notification methods
  public notifyNewMessage(relatedId: string, relatedType: 'inquiry' | 'order', message: ChatMessage): void {
    this.broadcastToRoom(relatedId, relatedType, 'new-message', message);
  }

  public notifyStatusUpdate(relatedId: string, relatedType: 'inquiry' | 'order', status: string, updatedBy: string): void {
    this.broadcastToRoom(relatedId, relatedType, 'status-updated', {
      relatedId,
      relatedType,
      status,
      updatedBy,
      updatedAt: new Date()
    });
  }

  public notifyNewQuotation(inquiryId: string, quotation: any): void {
    this.broadcastToRoom(inquiryId, 'inquiry', 'new-quotation', quotation);
  }

  public notifyOrderConfirmed(orderId: string, order: any): void {
    this.broadcastToRoom(orderId, 'order', 'order-confirmed', order);
  }

  // Real-time notification methods
  public sendNotificationToUser(userId: string, notification: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
      console.log(`Notification sent to user ${userId}: ${notification.type}`);
    } else {
      console.log(`User ${userId} is not online, notification will be stored for later`);
    }
  }

  public broadcastNotification(notification: any, excludeUserId?: string): void {
    const event = 'notification';
    const data = {
      ...notification,
      timestamp: new Date()
    };

    if (excludeUserId) {
      // Broadcast to all connected users except the excluded one
      for (const [userId, userStatus] of this.connectedUsers.entries()) {
        if (userId !== excludeUserId && userStatus.isOnline) {
          this.sendToUser(userId, event, data);
        }
      }
    } else {
      // Broadcast to all connected users
      this.io.emit(event, data);
    }
  }

  public sendNotificationUpdate(userId: string, updateData: { 
    notificationId: string; 
    isRead?: boolean; 
    action: 'read' | 'deleted' | 'updated' 
  }): void {
    this.sendToUser(userId, 'notification-update', {
      ...updateData,
      timestamp: new Date()
    });
  }

  public sendUnreadCountUpdate(userId: string, unreadCount: number): void {
    this.sendToUser(userId, 'unread-count-update', {
      count: unreadCount,
      timestamp: new Date()
    });
  }

  // Enhanced notification methods for real-time functionality
  public sendNotificationHistoryUpdate(userId: string, historyData: any): void {
    this.sendToUser(userId, 'notification-history-update', {
      ...historyData,
      timestamp: new Date()
    });
  }

  public sendNotificationStatisticsUpdate(userId: string, statistics: any): void {
    this.sendToUser(userId, 'notification-statistics-update', {
      ...statistics,
      timestamp: new Date()
    });
  }

  public broadcastSystemNotification(notification: any, targetRoles?: string[]): void {
    const event = 'system-notification';
    const data = {
      ...notification,
      timestamp: new Date()
    };

    if (targetRoles && targetRoles.length > 0) {
      // Broadcast to users with specific roles
      for (const [userId, userStatus] of this.connectedUsers.entries()) {
        if (userStatus.isOnline && targetRoles.includes(userStatus.role)) {
          this.sendToUser(userId, event, data);
        }
      }
    } else {
      // Broadcast to all connected users
      this.io.emit(event, data);
    }
  }

  public sendBulkNotificationUpdate(userIds: string[], notification: any): void {
    const event = 'bulk-notification';
    const data = {
      ...notification,
      timestamp: new Date()
    };

    userIds.forEach(userId => {
      this.sendToUser(userId, event, data);
    });
  }

  public sendNotificationCleanupUpdate(userId: string, cleanupInfo: { count: number; daysOld: number }): void {
    this.sendToUser(userId, 'notification-cleanup', {
      ...cleanupInfo,
      timestamp: new Date()
    });
  }

  // Real-time notification status updates
  public sendNotificationStatusBatch(userId: string, updates: Array<{
    notificationId: string;
    isRead?: boolean;
    action: 'read' | 'deleted' | 'updated';
  }>): void {
    this.sendToUser(userId, 'notification-batch-update', {
      updates,
      timestamp: new Date()
    });
  }

  // Enhanced typing and presence indicators for notifications
  public sendNotificationInteraction(userId: string, interaction: {
    type: 'viewing' | 'reading' | 'managing';
    section?: string;
    timestamp: Date;
  }): void {
    // Broadcast to other users that this user is interacting with notifications
    for (const [otherUserId, userStatus] of this.connectedUsers.entries()) {
      if (otherUserId !== userId && userStatus.isOnline) {
        this.sendToUser(otherUserId, 'user-notification-interaction', {
          userId,
          username: this.connectedUsers.get(userId)?.username,
          ...interaction
        });
      }
    }
  }

  // Real-time notification preferences update
  public sendNotificationPreferencesUpdate(userId: string, preferences: any): void {
    this.sendToUser(userId, 'notification-preferences-update', {
      preferences,
      timestamp: new Date()
    });
  }

  public notifyQuotationReceived(buyerUserId: string, notification: any): void {
    this.sendNotificationToUser(buyerUserId, {
      ...notification,
      type: 'quotation_received'
    });
  }

  public notifyOrderStatusChanged(buyerUserId: string, notification: any): void {
    this.sendNotificationToUser(buyerUserId, {
      ...notification,
      type: 'status_updated'
    });
  }

  public notifyMessageReceived(recipientUserId: string, notification: any): void {
    this.sendNotificationToUser(recipientUserId, {
      ...notification,
      type: 'message_received'
    });
  }
}