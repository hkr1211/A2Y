import {
  ChatMessageRepository,
  ChatMessageWithSender,
} from '../repositories/ChatMessageRepository.js';
import { NotificationService } from './NotificationService.js';
import { JwtPayload } from '../shared/types.js';
import { logger } from '../utils/logger.js';

function toMessageResponse(row: ChatMessageWithSender) {
  return {
    id: row.id,
    content: row.content,
    sender: {
      id: row.sender_id,
      username: row.sender_username,
      role: row.sender_role,
    },
    createdAt: row.created_at,
  };
}

export class ChatService {
  constructor(
    private chatRepo: ChatMessageRepository,
    private notificationService?: NotificationService
  ) {}

  async getMessages(
    relatedType: string,
    relatedId: string,
    options: { since?: string; page?: number; pageSize?: number }
  ) {
    const { items, total } = await this.chatRepo.findByRelated(
      relatedType,
      relatedId,
      options
    );
    return {
      items: items.map(toMessageResponse),
      total,
    };
  }

  async sendMessage(
    relatedType: string,
    relatedId: string,
    content: string,
    user: JwtPayload
  ) {
    const message = await this.chatRepo.create({
      related_id: relatedId,
      related_type: relatedType,
      sender_id: user.userId,
      content,
    });

    logger.info(
      `[AUDIT] User ${user.username} sent chat message in ${relatedType} ${relatedId}`
    );

    return {
      id: message.id,
      content: message.content,
      sender: {
        id: user.userId,
        username: user.username,
        role: user.role,
      },
      createdAt: message.created_at,
    };
  }

  async markRead(
    relatedType: string,
    relatedId: string,
    userId: string
  ) {
    await this.chatRepo.updateReadStatus(userId, relatedType, relatedId);
    return { message: '已标记已读' };
  }

  async getUnreadCount(
    userId: string,
    relatedType: string,
    relatedId: string
  ) {
    return this.chatRepo.getUnreadCount(userId, relatedType, relatedId);
  }
}
