import { jest } from '@jest/globals';
import { ChatService } from '../ChatService.js';

const mockChatRepo = {
  create: jest.fn(),
  findByRelated: jest.fn(),
  updateReadStatus: jest.fn(),
  getUnreadCount: jest.fn(),
} as any;

const buyerUser = {
  userId: 'user-buyer-1',
  username: 'tanaka',
  role: 'buyer' as const,
  company: 'arroz' as const,
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatService(mockChatRepo);
  });

  describe('getMessages', () => {
    it('should return messages with sender info', async () => {
      mockChatRepo.findByRelated.mockResolvedValue({
        items: [
          {
            id: 'msg-1',
            related_id: 'inq-1',
            related_type: 'inquiry',
            sender_id: 'user-buyer-1',
            sender_username: 'tanaka',
            sender_role: 'buyer',
            content: 'Hello',
            created_at: '2026-02-09T00:00:00.000Z',
          },
        ],
        total: 1,
      });

      const result = await service.getMessages('inquiry', 'inq-1', {});
      expect(result.items).toHaveLength(1);
      expect(result.items[0].sender.username).toBe('tanaka');
      expect(result.items[0].content).toBe('Hello');
    });

    it('should pass since parameter for polling', async () => {
      mockChatRepo.findByRelated.mockResolvedValue({ items: [], total: 0 });

      await service.getMessages('inquiry', 'inq-1', {
        since: '2026-02-09T00:00:00.000Z',
      });

      expect(mockChatRepo.findByRelated).toHaveBeenCalledWith(
        'inquiry',
        'inq-1',
        { since: '2026-02-09T00:00:00.000Z' }
      );
    });
  });

  describe('sendMessage', () => {
    it('should create a message and return it', async () => {
      mockChatRepo.create.mockResolvedValue({
        id: 'msg-1',
        related_id: 'inq-1',
        related_type: 'inquiry',
        sender_id: buyerUser.userId,
        content: 'Hello!',
        created_at: '2026-02-09T00:00:00.000Z',
      });

      const result = await service.sendMessage(
        'inquiry',
        'inq-1',
        'Hello!',
        buyerUser
      );

      expect(result.id).toBe('msg-1');
      expect(result.content).toBe('Hello!');
      expect(result.sender.username).toBe('tanaka');
      expect(mockChatRepo.create).toHaveBeenCalledWith({
        related_id: 'inq-1',
        related_type: 'inquiry',
        sender_id: buyerUser.userId,
        content: 'Hello!',
      });
    });
  });

  describe('markRead', () => {
    it('should update read status', async () => {
      mockChatRepo.updateReadStatus.mockResolvedValue(undefined);

      const result = await service.markRead(
        'inquiry',
        'inq-1',
        buyerUser.userId
      );
      expect(result.message).toBe('已标记已读');
      expect(mockChatRepo.updateReadStatus).toHaveBeenCalledWith(
        buyerUser.userId,
        'inquiry',
        'inq-1'
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockChatRepo.getUnreadCount.mockResolvedValue(5);

      const count = await service.getUnreadCount(
        buyerUser.userId,
        'inquiry',
        'inq-1'
      );
      expect(count).toBe(5);
    });
  });
});
