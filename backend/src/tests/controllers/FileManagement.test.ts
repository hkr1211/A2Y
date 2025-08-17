import { FileStorageService } from '../../services/FileStorageService';
import { FileAttachmentModel } from '../../models/FileAttachment';

describe('File Management Integration', () => {
  describe('FileStorageService', () => {
    it('should validate supported file types', () => {
      const service = new FileStorageService();
      
      // Test PDF file
      const pdfResult = service.validateFile({
        size: 1024 * 1024, // 1MB
        mimetype: 'application/pdf',
        originalname: 'document.pdf'
      });
      expect(pdfResult.isValid).toBe(true);

      // Test image file
      const imageResult = service.validateFile({
        size: 2 * 1024 * 1024, // 2MB
        mimetype: 'image/jpeg',
        originalname: 'image.jpg'
      });
      expect(imageResult.isValid).toBe(true);

      // Test 3D file
      const stlResult = service.validateFile({
        size: 5 * 1024 * 1024, // 5MB
        mimetype: 'model/stl',
        originalname: 'model.stl'
      });
      expect(stlResult.isValid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const service = new FileStorageService();
      
      const result = service.validateFile({
        size: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
        mimetype: 'application/pdf',
        originalname: 'large-file.pdf'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('文件大小超过限制');
    });

    it('should reject unsupported file types', () => {
      const service = new FileStorageService();
      
      const result = service.validateFile({
        size: 1024,
        mimetype: 'application/x-executable',
        originalname: 'malicious.exe'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('不支持的文件格式');
    });

    it('should generate correct file URLs', () => {
      const service = new FileStorageService();
      const url = service.getFileUrl('test-file-123.pdf');
      expect(url).toBe('/api/files/test-file-123.pdf');
    });
  });

  describe('File Security', () => {
    it('should reject files with unsafe characters', () => {
      const service = new FileStorageService();
      
      const result = service.validateFile({
        size: 1024,
        mimetype: 'application/pdf',
        originalname: '../../../etc/passwd'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('文件名包含不安全字符');
    });

    it('should reject files with null bytes', () => {
      const service = new FileStorageService();
      
      const result = service.validateFile({
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'test\x00.pdf'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('文件名包含不安全字符');
    });
  });
});