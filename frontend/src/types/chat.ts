export interface ChatMessage {
  id: string;
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  senderId: string;
  senderUsername?: string;
  content: string;
  translatedContent?: string;
  timestamp: Date;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatMessageRequest {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  content: string;
}

export interface ChatRoomInfo {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  participants: string[];
  unreadCount: number;
  lastMessage?: ChatMessage;
}

export interface TranslationRequest {
  messageId: string;
  targetLanguage: 'zh' | 'ja';
}

export interface TranslationResponse {
  messageId: string;
  originalContent: string;
  translatedContent: string;
  targetLanguage: 'zh' | 'ja';
  provider?: string;
  cached?: boolean;
}

export interface ChatListParams {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  page?: number;
  limit?: number;
}

export interface SocketMessage {
  type: 'message' | 'typing' | 'read' | 'user_status';
  data: any;
}

export interface TypingStatus {
  userId: string;
  username: string;
  isTyping: boolean;
  relatedId: string;
  relatedType: 'inquiry' | 'order';
}

export interface UserStatus {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen: Date;
}