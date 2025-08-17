import { Pool } from 'pg';
import { ChatMessageModel, CreateChatMessageData, UpdateChatMessageData } from '../../models/ChatMessage';
import { UserModel } from '../../models/User';

// Mock database pool
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

describe('ChatMessageModel', () => {
  let chatMessageModel: ChatMessageModel;
  let userModel: UserModel;

  beforeEach(() => {
    chatMessageModel = new ChatMessageModel(mockDb);
    userModel = new UserModel(mockDb);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new chat message successfully', async () => {
      const mockChatMessageData: CreateChatMessageData = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        senderId: 'user-123',
        content: 'Hello, this is a test message'
      };

      const mockDbResult = {
        rows: [{
          id: 'message-123',
          related_id: 'inquiry-123',
          related_type: 'inquiry',
          sender_id: 'user-123',
          content: 'Hello, this is a test message',
          translated_content: null,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.create(mockChatMessageData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        expect.arrayContaining([
          expect.any(String), // id
          'inquiry-123',
          'inquiry',
          'user-123',
          'Hello, this is a test message',
          null
        ])
      );

      expect(result).toEqual({
        id: 'message-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        senderId: 'user-123',
        content: 'Hello, this is a test message',
        translatedContent: null,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        isRead: false,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z')
      });
    });

    it('should create a chat message with translated content', async () => {
      const mockChatMessageData: CreateChatMessageData = {
        relatedId: 'order-456',
        relatedType: 'order',
        senderId: 'user-456',
        content: 'こんにちは',
        translatedContent: 'Hello'
      };

      const mockDbResult = {
        rows: [{
          id: 'message-456',
          related_id: 'order-456',
          related_type: 'order',
          sender_id: 'user-456',
          content: 'こんにちは',
          translated_content: 'Hello',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.create(mockChatMessageData);

      expect(result.translatedContent).toBe('Hello');
    });
  });

  describe('findById', () => {
    it('should find a chat message by id', async () => {
      const mockDbResult = {
        rows: [{
          id: 'message-123',
          related_id: 'inquiry-123',
          related_type: 'inquiry',
          sender_id: 'user-123',
          content: 'Test message',
          translated_content: null,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-01T10:00:00Z')
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.findById('message-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM chat_messages WHERE id = $1',
        ['message-123']
      );

      expect(result).toEqual({
        id: 'message-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        senderId: 'user-123',
        content: 'Test message',
        translatedContent: null,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        isRead: false,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z')
      });
    });

    it('should return null when chat message not found', async () => {
      const mockDbResult = { rows: [] };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByRelated', () => {
    it('should find all messages for an inquiry', async () => {
      const mockDbResult = {
        rows: [
          {
            id: 'message-1',
            related_id: 'inquiry-123',
            related_type: 'inquiry',
            sender_id: 'user-1',
            content: 'First message',
            translated_content: null,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            is_read: true,
            created_at: new Date('2024-01-01T10:00:00Z'),
            updated_at: new Date('2024-01-01T10:00:00Z'),
            sender_username: 'buyer1'
          },
          {
            id: 'message-2',
            related_id: 'inquiry-123',
            related_type: 'inquiry',
            sender_id: 'user-2',
            content: 'Second message',
            translated_content: null,
            timestamp: new Date('2024-01-01T11:00:00Z'),
            is_read: false,
            created_at: new Date('2024-01-01T11:00:00Z'),
            updated_at: new Date('2024-01-01T11:00:00Z'),
            sender_username: 'supplier1'
          }
        ]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.findByRelated('inquiry-123', 'inquiry');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT cm.*, u.username as sender_username'),
        ['inquiry-123', 'inquiry']
      );

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('First message');
      expect(result[1].content).toBe('Second message');
    });

    it('should find all messages for an order', async () => {
      const mockDbResult = { rows: [] };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.findByRelated('order-456', 'order');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT cm.*, u.username as sender_username'),
        ['order-456', 'order']
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update chat message content', async () => {
      const updateData: UpdateChatMessageData = {
        content: 'Updated message content'
      };

      const mockDbResult = {
        rows: [{
          id: 'message-123',
          related_id: 'inquiry-123',
          related_type: 'inquiry',
          sender_id: 'user-123',
          content: 'Updated message content',
          translated_content: null,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          is_read: false,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-01T10:30:00Z')
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.update('message-123', updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE chat_messages'),
        ['Updated message content', 'message-123']
      );

      expect(result?.content).toBe('Updated message content');
    });

    it('should update message read status', async () => {
      const updateData: UpdateChatMessageData = {
        isRead: true
      };

      const mockDbResult = {
        rows: [{
          id: 'message-123',
          related_id: 'inquiry-123',
          related_type: 'inquiry',
          sender_id: 'user-123',
          content: 'Test message',
          translated_content: null,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          is_read: true,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-01T10:30:00Z')
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.update('message-123', updateData);

      expect(result?.isRead).toBe(true);
    });

    it('should return null when message not found', async () => {
      const updateData: UpdateChatMessageData = {
        content: 'Updated content'
      };

      const mockDbResult = { rows: [] };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.update('nonexistent-id', updateData);

      expect(result).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark all unread messages as read for a user', async () => {
      const mockDbResult = { rowCount: 3 };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      await chatMessageModel.markAsRead('inquiry-123', 'inquiry', 'user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE chat_messages'),
        ['inquiry-123', 'inquiry', 'user-123']
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread message count for a user', async () => {
      const mockDbResult = { rows: [{ count: '5' }] };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.getUnreadCount('inquiry-123', 'inquiry', 'user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        ['inquiry-123', 'inquiry', 'user-123']
      );

      expect(result).toBe(5);
    });
  });

  describe('delete', () => {
    it('should delete a chat message', async () => {
      const mockDbResult = { rowCount: 1 };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.delete('message-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM chat_messages WHERE id = $1',
        ['message-123']
      );

      expect(result).toBe(true);
    });

    it('should return false when message not found', async () => {
      const mockDbResult = { rowCount: 0 };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('deleteByRelated', () => {
    it('should delete all messages for an inquiry', async () => {
      const mockDbResult = { rowCount: 5 };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.deleteByRelated('inquiry-123', 'inquiry');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM chat_messages WHERE related_id = $1 AND related_type = $2',
        ['inquiry-123', 'inquiry']
      );

      expect(result).toBe(5);
    });

    it('should delete all messages for an order', async () => {
      const mockDbResult = { rowCount: 0 };
      (mockDb.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await chatMessageModel.deleteByRelated('order-456', 'order');

      expect(result).toBe(0);
    });
  });
});