import { Response } from 'express';
import { ChatService } from '../services/ChatService.js';
import { AuthRequest } from '../shared/types.js';
import { ok, created } from '../shared/response.js';

export class ChatController {
  constructor(private chatService: ChatService) {
    this.getMessages = this.getMessages.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.markRead = this.markRead.bind(this);
  }

  async getMessages(req: AuthRequest, res: Response) {
    const { relatedType, relatedId } = req.params;
    const { since, page, pageSize } = req.query as unknown as {
      since?: string;
      page?: number;
      pageSize?: number;
    };

    const result = await this.chatService.getMessages(
      relatedType,
      relatedId,
      { since, page, pageSize }
    );
    res.json(ok(result));
  }

  async sendMessage(req: AuthRequest, res: Response) {
    const user = req.user!;
    const { relatedType, relatedId } = req.params;
    const { content } = req.body;

    const message = await this.chatService.sendMessage(
      relatedType,
      relatedId,
      content,
      user
    );
    res.status(201).json(created(message));
  }

  async markRead(req: AuthRequest, res: Response) {
    const user = req.user!;
    const { relatedType, relatedId } = req.params;
    const result = await this.chatService.markRead(
      relatedType,
      relatedId,
      user.userId
    );
    res.json(ok(result));
  }
}
