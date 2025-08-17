export interface ChatMessage {
  id: string;
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  senderId: string;
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

export interface UpdateChatMessageRequest {
  content?: string;
  translatedContent?: string;
  isRead?: boolean;
}

export interface ChatMessageResponse extends ChatMessage {
  senderUsername?: string;
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

export interface BatchTranslationRequest {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  targetLanguage: 'zh' | 'ja';
}

export interface BatchTranslationResponse {
  translatedCount: number;
  totalMessages: number;
  messages: Array<{
    messageId: string;
    originalContent: string;
    translatedContent: string | null;
    cached: boolean;
    error?: string;
  }>;
}