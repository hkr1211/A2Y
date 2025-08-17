import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import type { ChatMessage, SocketMessage, TypingStatus, UserStatus } from '@/types/chat';

export class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Initialize socket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const authStore = useAuthStore();
    const token = authStore.token;

    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    this.socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Join a chat room
   */
  joinChatRoom(relatedId: string, relatedType: 'inquiry' | 'order'): void {
    if (this.socket?.connected) {
      this.socket.emit('join-chat', { relatedId, relatedType });
    }
  }

  /**
   * Leave a chat room
   */
  leaveChatRoom(relatedId: string, relatedType: 'inquiry' | 'order'): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-chat', { relatedId, relatedType });
    }
  }

  /**
   * Send a message
   */
  sendMessage(message: ChatMessage): void {
    if (this.socket?.connected) {
      this.socket.emit('send-message', message);
    }
  }

  /**
   * Send typing status
   */
  sendTypingStatus(status: TypingStatus): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', status);
    }
  }

  /**
   * Mark messages as read
   */
  markAsRead(relatedId: string, relatedType: 'inquiry' | 'order'): void {
    if (this.socket?.connected) {
      this.socket.emit('mark-read', { relatedId, relatedType });
    }
  }

  /**
   * Listen for new messages
   */
  onMessage(callback: (message: ChatMessage) => void): void {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  /**
   * Listen for typing status
   */
  onTyping(callback: (status: TypingStatus) => void): void {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  /**
   * Listen for user status changes
   */
  onUserStatus(callback: (status: UserStatus) => void): void {
    if (this.socket) {
      this.socket.on('user-status', callback);
    }
  }

  /**
   * Listen for message read status
   */
  onMessageRead(callback: (data: { relatedId: string; relatedType: string; userId: string }) => void): void {
    if (this.socket) {
      this.socket.on('message-read', callback);
    }
  }

  /**
   * Remove event listeners
   */
  off(event: string, callback?: Function): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Check if socket is connected
   */
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
}

// Create singleton instance
export const socketService = new SocketService();