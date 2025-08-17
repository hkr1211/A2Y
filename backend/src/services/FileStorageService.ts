import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadConfig, FileValidationResult } from '../types/fileAttachment';

export class FileStorageService {
  private config: FileUploadConfig;

  constructor() {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
        'model/stl', // 3D files
        'model/obj',
        'application/sla'
      ],
      uploadPath: path.join(process.cwd(), 'uploads')
    };
  }

  async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.config.uploadPath);
    } catch {
      await fs.mkdir(this.config.uploadPath, { recursive: true });
    }
  }

  validateFile(file: { size: number; mimetype: string; originalname: string }): FileValidationResult {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `文件大小超过限制 (${this.config.maxFileSize / 1024 / 1024}MB)`
      };
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `不支持的文件格式: ${file.mimetype}`
      };
    }

    // Check filename for security
    if (this.containsUnsafeCharacters(file.originalname)) {
      return {
        isValid: false,
        error: '文件名包含不安全字符'
      };
    }

    return { isValid: true };
  }

  async saveFile(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<{ filename: string; path: string }> {
    await this.ensureUploadDirectory();

    const fileExtension = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.config.uploadPath, filename);

    await fs.writeFile(filePath, file.buffer);

    return {
      filename,
      path: filePath
    };
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<{ exists: boolean; size?: number }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size
      };
    } catch {
      return { exists: false };
    }
  }

  getFileUrl(filename: string): string {
    return `/api/files/${filename}`;
  }

  private containsUnsafeCharacters(filename: string): boolean {
    // Check for path traversal and other unsafe characters
    const unsafePattern = /[<>:"|?*\x00-\x1f]|\.\.|\//;
    return unsafePattern.test(filename);
  }

  getConfig(): FileUploadConfig {
    return { ...this.config };
  }
}