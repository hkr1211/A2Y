import { Response } from 'express';
import { Pool } from 'pg';
import { FileController } from '../../controllers/FileController';
import { FileAttachmentModel } from '../../models/FileAttachment';
import { FileStorageService } from '../../services/FileStorageService';
import { AuthenticatedRequest } from '../../middleware/auth';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
jest.mock('../../models/FileAttachment');
jest.mock('../../services/FileStorageService');
jest.mock('fs/promises');

const MockFileAttachmentModel = FileAttachmentModel as jest.MockedClass<typeof FileAttachmentModel>;
const MockFileStorageService = FileStorageService as jest.MockedClass<typeof FileStorageService>;

describe('FileController', () => {
  let mockDb: Pool;
  let mockFileAttachmentModel: jest.Mocked<FileAttachmentModel>;
  let mockFileStorageService: jest.Mocked<FileStorageService>;
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockDb = {} as Pool;
    mockFileAttachmentModel = new MockFileAttachmentModel(mockDb) as jest.Mocked<FileAttachmentModel>;
    mockFileStorageService = new MockFileStorageService() as jest.Mocked<FileStorageService>;
    
    // Initialize FileController with mocked dependencies
    FileController.initialize(mockDb);
    (FileController as any).fileAttachmentModel = mockFileAttachmentModel;
    (FileController as any).fileStorageService = mockFileStorageService;

    mockReq = {
      user: {
        id: 'user-123',
        username: 'testuser',
        role: 'buyer',
        company: 'arroz'
      },
      body: {},
      params: {},
      files: []
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('uploadFiles', () => {
    it('should upload files successfully', async () => {
      const mockFiles = [
        {
          buffer: Buffer.from('test content'),
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024
        }
      ] as Express.Multer.File[];

      mockReq.files = mockFiles;
      mockReq.body = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry'
      };

      mockFileStorageService.validateFile.mockReturnValue({ isValid: true });
      mockFileStorageService.saveFile.mockResolvedValue({
        filename: 'test-123.pdf',
        path: '/uploads/test-123.pdf'
      });
      mockFileStorageService.getFileUrl.mockReturnValue('/api/files/test-123.pdf');

      mockFileAttachmentModel.create.mockResolvedValue({
        id: 'file-123',
        filename: 'test-123.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test-123.pdf',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry',
        uploadedBy: 'user-123',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await FileController.uploadFiles(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockFileStorageService.validateFile).toHaveBeenCalled();
      expect(mockFileStorageService.saveFile).toHaveBeenCalled();
      expect(mockFileAttachmentModel.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          uploadedFiles: expect.arrayContaining([
            expect.objectContaining({
              id: 'file-123',
              filename: 'test-123.pdf',
              originalName: 'test.pdf'
            })
          ]),
          errors: undefined
        }
      });
    });

    it('should return error when no files uploaded', async () => {
      mockReq.files = [];
      mockReq.body = {
        relatedId: 'inquiry-123',
        relatedType: 'inquiry'
      };

      await FileController.uploadFiles(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_FILES_UPLOADED',
          message: '没有上传任何文件'
        }
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully when user is owner', async () => {
      mockReq.params = { fileId: 'file-123' };

      const mockFile = {
        id: 'file-123',
        filename: 'test-123.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test-123.pdf',
        relatedId: 'inquiry-123',
        relatedType: 'inquiry' as const,
        uploadedBy: 'user-123', // Same as req.user.id
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockFileAttachmentModel.findById.mockResolvedValue(mockFile);
      mockFileStorageService.deleteFile.mockResolvedValue(true);
      mockFileAttachmentModel.delete.mockResolvedValue(true);

      await FileController.deleteFile(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith('/uploads/test-123.pdf');
      expect(mockFileAttachmentModel.delete).toHaveBeenCalledWith('file-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '文件删除成功'
      });
    });
  });
});