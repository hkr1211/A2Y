import { jest } from '@jest/globals';
import { AuditLogService } from '../AuditLogService.js';

const mockAuditRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
} as any;

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogService(mockAuditRepo);
  });

  describe('list', () => {
    it('should return paginated audit logs', async () => {
      mockAuditRepo.findAll.mockResolvedValue({
        items: [
          {
            id: 'log-1',
            user_id: 'user-1',
            username: 'admin',
            action: 'create',
            target_type: 'inquiry',
            target_id: 'inq-1',
            summary: 'Created inquiry INQ-001',
            ip_address: '127.0.0.1',
            created_at: '2026-02-09T00:00:00.000Z',
          },
        ],
        total: 1,
      });

      const result = await service.list({ page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].user.username).toBe('admin');
      expect(result.items[0].action).toBe('create');
      expect(result.items[0].targetType).toBe('inquiry');
    });

    it('should pass filter params to repository', async () => {
      mockAuditRepo.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.list({
        page: 1,
        pageSize: 20,
        userId: 'user-1',
        action: 'create',
        targetType: 'inquiry',
      });

      expect(mockAuditRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        userId: 'user-1',
        action: 'create',
        targetType: 'inquiry',
      });
    });
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      mockAuditRepo.create.mockResolvedValue({ id: 'log-1' });

      await service.log({
        userId: 'user-1',
        action: 'create',
        targetType: 'inquiry',
        targetId: 'inq-1',
        summary: 'Created inquiry',
      });

      expect(mockAuditRepo.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        action: 'create',
        target_type: 'inquiry',
        target_id: 'inq-1',
        summary: 'Created inquiry',
        ip_address: undefined,
      });
    });
  });
});
