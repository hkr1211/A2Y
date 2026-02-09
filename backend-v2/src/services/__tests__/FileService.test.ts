import { jest } from '@jest/globals';
import { FileService } from '../FileService.js';

const mockFileRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByRelated: jest.fn(),
  countByRelated: jest.fn(),
  delete: jest.fn(),
} as any;

// Mock fs to avoid actual file operations
jest.unstable_mockModule('fs/promises', () => ({
  default: {
    mkdir: jest.fn().mockResolvedValue(undefined as never),
    writeFile: jest.fn().mockResolvedValue(undefined as never),
    unlink: jest.fn().mockResolvedValue(undefined as never),
  },
  mkdir: jest.fn().mockResolvedValue(undefined as never),
  writeFile: jest.fn().mockResolvedValue(undefined as never),
  unlink: jest.fn().mockResolvedValue(undefined as never),
}));

const buyerUser = {
  userId: 'user-buyer-1',
  username: 'tanaka',
  role: 'buyer' as const,
  company: 'arroz' as const,
};

const adminUser = {
  userId: 'user-admin-1',
  username: 'admin',
  role: 'admin' as const,
  company: 'admin' as const,
};

const supplierUser = {
  userId: 'user-supplier-1',
  username: 'zhangsan',
  role: 'supplier' as const,
  company: 'yunjie' as const,
};

describe('FileService', () => {
  let service: FileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FileService(mockFileRepo, '/tmp/test-uploads');
  });

  describe('upload', () => {
    const validFile = {
      originalname: 'design.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    };

    it('should upload a valid file', async () => {
      mockFileRepo.create.mockResolvedValue({
        id: 'file-1',
        original_name: 'design.pdf',
        storage_key: 'abc.pdf',
        mime_type: 'application/pdf',
        size: 1024,
        related_id: 'inq-1',
        related_type: 'inquiry',
        uploaded_by: buyerUser.userId,
        created_at: '2026-02-09T00:00:00.000Z',
      });

      const result = await service.upload(validFile, 'inq-1', 'inquiry', buyerUser);

      expect(result.id).toBe('file-1');
      expect(result.originalName).toBe('design.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(1024);
      expect(result.relatedId).toBe('inq-1');
      expect(result.uploadedBy.id).toBe(buyerUser.userId);
      expect(mockFileRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should reject unsupported file types', async () => {
      const badFile = { ...validFile, originalname: 'virus.exe' };
      await expect(
        service.upload(badFile, 'inq-1', 'inquiry', buyerUser)
      ).rejects.toThrow('暂不支持该文件格式');
    });

    it('should reject files exceeding 20MB', async () => {
      const bigFile = { ...validFile, size: 21 * 1024 * 1024 };
      await expect(
        service.upload(bigFile, 'inq-1', 'inquiry', buyerUser)
      ).rejects.toThrow('文件大小不能超过 20MB');
    });

    it('should accept .jpg files', async () => {
      mockFileRepo.create.mockResolvedValue({
        id: 'file-2',
        original_name: 'photo.jpg',
        storage_key: 'def.jpg',
        mime_type: 'image/jpeg',
        size: 2048,
        related_id: 'ord-1',
        related_type: 'order',
        uploaded_by: buyerUser.userId,
        created_at: '2026-02-09T00:00:00.000Z',
      });

      const jpgFile = { ...validFile, originalname: 'photo.jpg', mimetype: 'image/jpeg' };
      const result = await service.upload(jpgFile, 'ord-1', 'order', buyerUser);
      expect(result.originalName).toBe('photo.jpg');
    });

    it('should accept .step files', async () => {
      mockFileRepo.create.mockResolvedValue({
        id: 'file-3',
        original_name: 'model.step',
        storage_key: 'ghi.step',
        mime_type: 'application/octet-stream',
        size: 4096,
        related_id: 'inq-2',
        related_type: 'inquiry',
        uploaded_by: buyerUser.userId,
        created_at: '2026-02-09T00:00:00.000Z',
      });

      const stepFile = { ...validFile, originalname: 'model.step', mimetype: 'application/octet-stream' };
      const result = await service.upload(stepFile, 'inq-2', 'inquiry', buyerUser);
      expect(result.originalName).toBe('model.step');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return download URL for existing file', async () => {
      mockFileRepo.findById.mockResolvedValue({
        id: 'file-1',
        original_name: 'design.pdf',
        storage_key: 'abc.pdf',
        mime_type: 'application/pdf',
        size: 1024,
      });

      const result = await service.getDownloadUrl('file-1');

      expect(result.url).toBe('/uploads/abc.pdf');
      expect(result.originalName).toBe('design.pdf');
      expect(result.expiresIn).toBe(300);
    });

    it('should throw 404 for non-existent file', async () => {
      mockFileRepo.findById.mockResolvedValue(null);
      await expect(service.getDownloadUrl('bad-id')).rejects.toThrow('文件不存在');
    });
  });

  describe('deleteFile', () => {
    const fileRow = {
      id: 'file-1',
      original_name: 'design.pdf',
      storage_key: 'abc.pdf',
      mime_type: 'application/pdf',
      size: 1024,
      related_id: 'inq-1',
      related_type: 'inquiry',
      uploaded_by: buyerUser.userId,
      created_at: '2026-02-09T00:00:00.000Z',
    };

    it('should allow uploader to delete', async () => {
      mockFileRepo.findById.mockResolvedValue(fileRow);
      mockFileRepo.delete.mockResolvedValue(true);

      const result = await service.deleteFile('file-1', buyerUser);
      expect(result.message).toBe('附件已删除');
      expect(mockFileRepo.delete).toHaveBeenCalledWith('file-1');
    });

    it('should allow admin to delete', async () => {
      mockFileRepo.findById.mockResolvedValue(fileRow);
      mockFileRepo.delete.mockResolvedValue(true);

      const result = await service.deleteFile('file-1', adminUser);
      expect(result.message).toBe('附件已删除');
    });

    it('should reject deletion by non-uploader non-admin', async () => {
      mockFileRepo.findById.mockResolvedValue(fileRow);

      await expect(
        service.deleteFile('file-1', supplierUser)
      ).rejects.toThrow('只有上传者或管理员可以删除文件');
    });

    it('should throw 404 for non-existent file', async () => {
      mockFileRepo.findById.mockResolvedValue(null);
      await expect(
        service.deleteFile('bad-id', buyerUser)
      ).rejects.toThrow('文件不存在');
    });
  });

  describe('getByRelated', () => {
    it('should return attachments for an inquiry', async () => {
      mockFileRepo.findByRelated.mockResolvedValue([
        {
          id: 'file-1',
          original_name: 'design.pdf',
          storage_key: 'abc.pdf',
          mime_type: 'application/pdf',
          size: 1024,
          related_id: 'inq-1',
          related_type: 'inquiry',
          uploaded_by: buyerUser.userId,
          uploader_username: 'tanaka',
          created_at: '2026-02-09T00:00:00.000Z',
        },
      ]);

      const result = await service.getByRelated('inquiry', 'inq-1');
      expect(result).toHaveLength(1);
      expect(result[0].originalName).toBe('design.pdf');
      expect(result[0].uploadedBy.username).toBe('tanaka');
    });

    it('should return empty array when no attachments', async () => {
      mockFileRepo.findByRelated.mockResolvedValue([]);
      const result = await service.getByRelated('order', 'ord-1');
      expect(result).toHaveLength(0);
    });
  });
});
