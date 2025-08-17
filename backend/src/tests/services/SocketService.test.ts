import { Server } from 'socket.io';
import { createServer } from 'http';
import { SocketService } from '../../services/SocketService';
import jwt from 'jsonwebtoken';

// Mock jwt
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('SocketService', () => {
  let httpServer: any;
  let io: Server;
  let socketService: SocketService;

  beforeEach(() => {
    httpServer = createServer();
    io = new Server(httpServer);
    socketService = new SocketService(io);
  });

  afterEach(() => {
    io.close();
    httpServer.close();
  });

  describe('constructor', () => {
    it('should initialize with Socket.IO server', () => {
      expect(socketService).toBeDefined();
      expect(socketService).toBeInstanceOf(SocketService);
    });
  });

  describe('authentication', () => {
    it('should authenticate valid token', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'valid-token' },
          headers: {}
        }
      } as any;

      const mockDecoded = {
        userId: 'user-123',
        username: 'testuser',
        role: 'buyer'
      };

      mockJwt.verify.mockReturnValue(mockDecoded);

      const next = jest.fn();
      await (socketService as any).authenticateSocket(mockSocket, next);

      expect(mockSocket.userId).toBe('user-123');
      expect(mockSocket.username).toBe('testuser');
      expect(mockSocket.role).toBe('buyer');
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid token', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {}
        }
      } as any;

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const next = jest.fn();
      await (socketService as any).authenticateSocket(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject missing token', async () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {}
        }
      } as any;

      const next = jest.fn();
      await (socketService as any).authenticateSocket(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('room management', () => {
    it('should generate correct room name', () => {
      const roomName = (socketService as any).getRoomName('inquiry-123', 'inquiry');
      expect(roomName).toBe('inquiry-inquiry-123');
    });

    it('should generate correct room name for order', () => {
      const roomName = (socketService as any).getRoomName('order-456', 'order');
      expect(roomName).toBe('order-order-456');
    });
  });

  describe('user status management', () => {
    it('should track online users', () => {
      const onlineUsers = socketService.getOnlineUsers();
      expect(Array.isArray(onlineUsers)).toBe(true);
      expect(onlineUsers).toHaveLength(0);
    });

    it('should check if user is online', () => {
      const isOnline = socketService.isUserOnline('user-123');
      expect(isOnline).toBe(false);
    });
  });

  describe('broadcasting', () => {
    it('should broadcast to room', () => {
      const mockTo = jest.fn().mockReturnValue({ emit: jest.fn() });
      io.to = mockTo;

      socketService.broadcastToRoom('inquiry-123', 'inquiry', 'test-event', { data: 'test' });

      expect(mockTo).toHaveBeenCalledWith('inquiry-inquiry-123');
    });

    it('should send to specific user', () => {
      const mockTo = jest.fn().mockReturnValue({ emit: jest.fn() });
      io.to = mockTo;

      // First add a user to the service
      (socketService as any).userSockets.set('user-123', 'socket-123');

      socketService.sendToUser('user-123', 'test-event', { data: 'test' });

      expect(mockTo).toHaveBeenCalledWith('socket-123');
    });
  });

  describe('notification methods', () => {
    beforeEach(() => {
      const mockTo = jest.fn().mockReturnValue({ emit: jest.fn() });
      io.to = mockTo;
    });

    it('should notify new message', () => {
      const message = {
        id: 'msg-123',
        content: 'Test message',
        senderId: 'user-123',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      socketService.notifyNewMessage('inquiry-123', 'inquiry', message);
      expect(io.to).toHaveBeenCalledWith('inquiry-inquiry-123');
    });

    it('should notify status update', () => {
      socketService.notifyStatusUpdate('order-123', 'order', 'confirmed', 'user-456');
      expect(io.to).toHaveBeenCalledWith('order-order-123');
    });

    it('should notify new quotation', () => {
      const quotation = {
        id: 'quote-123',
        inquiryId: 'inquiry-123',
        unitPrice: 100,
        totalPrice: 1000
      };

      socketService.notifyNewQuotation('inquiry-123', quotation);
      expect(io.to).toHaveBeenCalledWith('inquiry-inquiry-123');
    });

    it('should notify order confirmed', () => {
      const order = {
        id: 'order-123',
        orderNumber: 'ORD-001',
        status: 'confirmed'
      };

      socketService.notifyOrderConfirmed('order-123', order);
      expect(io.to).toHaveBeenCalledWith('order-order-123');
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors gracefully', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'malformed-token' },
          headers: {}
        }
      } as any;

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Token malformed');
      });

      const next = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await (socketService as any).authenticateSocket(mockSocket, next);

      expect(consoleSpy).toHaveBeenCalledWith('Socket authentication error:', expect.any(Error));
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});