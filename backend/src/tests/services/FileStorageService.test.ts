import fs from 'fs/promises';
import path from 'path';
import { FileStorageService } from '../../services/FileStorageService';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

describe('FileStorageService', () => {
  let fileStorageService: FileStorageService;

  beforeEach(() => {
    fileStorageService = new FileStorageService();
    jest.clearAllMocks();
  });

  describe('ensureUploadDirectory', () => {
    it('should create upload directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);

      await fileStorageService.ensureUploadDirectory();

      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true }
      );
    });

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await fileStorageService.ensureUploadDirectory();

      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('validateFile', () => {
    it('should validate a valid PDF file', () => {
      const file = {
        size: 1024 * 1024, // 1MB
        mimetype: 'application/pdf',
        originalname: 'test-document.pdf'
      };

      const result = fileStorageService.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid image file', () => {
      const file = {
        size: 2 * 1024 * 1024, // 2MB
        mimetype: 'image/jpeg',
        originalname: 'test-image.jpg'
      };

      const result = fileStorageService.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file that exceeds size limit', () => {
      const file = {
        size: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
        mimetype: 'application/pdf',
        originalname: 'large-file.pdf'
      };

      const result = fileStorageService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('文件大小超过限制');
    });

    it('should reject unsupported file type', () => {
      const file = {
        size: 1024,
        mimetype: 'application/x-executable',
        originalname: 'malicious.exe'
      };

      const result = fileStorageService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('不支持的文件格式');
    });

    it('should reject file with unsafe characters in filename', () => {
      const file = {
        size: 1024,
        mimetype: 'application/pdf',
        originalname: '../../../etc/passwd'
      };

      const result = fileStorageService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('文件名包含不安全字符');
    });

    it('should reject file with null bytes in filename', () => {
      const file = {
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'test\x00.pdf'
      };

      const result = fileStorageService.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('文件名包含不安全字符');
    });
  });

  describe('saveFile', () => {
    it('should save file successfully', async () => {
      const file = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf'
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await fileStorageService.saveFile(file);

      expect(result.filename).toBe('mock-uuid-123.pdf');
      expect(result.path).toContain('mock-uuid-123.pdf');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('mock-uuid-123.pdf'),
        file.buffer
      );
    });

    it('should create upload directory before saving file', async () => {
      const file = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf'
      };

      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await fileStorageService.saveFile(file);

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await fileStorageService.deleteFile('/path/to/file.pdf');

      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith('/path/to/file.pdf');
    });

    it('should handle file deletion error gracefully', async () => {
      mockFs.unlink.mockRejectedValue(new Error('File not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await fileStorageService.deleteFile('/path/to/nonexistent.pdf');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting file:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getFileStats', () => {
    it('should return file stats when file exists', async () => {
      const mockStats = { size: 1024 };
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await fileStorageService.getFileStats('/path/to/file.pdf');

      expect(result.exists).toBe(true);
      expect(result.size).toBe(1024);
    });

    it('should return exists false when file does not exist', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      const result = await fileStorageService.getFileStats('/path/to/nonexistent.pdf');

      expect(result.exists).toBe(false);
      expect(result.size).toBeUndefined();
    });
  });

  describe('getFileUrl', () => {
    it('should generate correct file URL', () => {
      const url = fileStorageService.getFileUrl('test-file-123.pdf');

      expect(url).toBe('/api/files/test-file-123.pdf');
    });
  });

  describe('getConfig', () => {
    it('should return file upload configuration', () => {
      const config = fileStorageService.getConfig();

      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toContain('application/pdf');
      expect(config.allowedMimeTypes).toContain('image/jpeg');
      expect(config.allowedMimeTypes).toContain('model/stl');
      expect(config.uploadPath).toContain('uploads');
    });
  });
});