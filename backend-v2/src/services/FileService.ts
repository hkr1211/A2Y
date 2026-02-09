import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import {
  FileAttachmentRepository,
  FileAttachmentWithUploader,
} from '../repositories/FileAttachmentRepository.js';
import { AppError } from '../shared/errors.js';
import { JwtPayload } from '../shared/types.js';
import { logger } from '../utils/logger.js';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.xlsx',
  '.xls',
  '.docx',
  '.doc',
  '.step',
  '.stp',
  '.stl',
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function toAttachmentResponse(row: FileAttachmentWithUploader) {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    relatedId: row.related_id,
    relatedType: row.related_type,
    uploadedBy: {
      id: row.uploaded_by,
      username: row.uploader_username,
    },
    createdAt: row.created_at,
  };
}

export class FileService {
  private uploadDir: string;

  constructor(
    private fileRepo: FileAttachmentRepository,
    uploadDir?: string
  ) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'uploads');
  }

  async ensureUploadDir(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    relatedId: string,
    relatedType: string,
    user: JwtPayload
  ) {
    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw AppError.validation(
        `暂不支持该文件格式，允许的格式: ${[...ALLOWED_EXTENSIONS].join(', ')}`
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw AppError.validation('文件大小不能超过 20MB');
    }

    // Generate storage key
    const storageKey = crypto.randomUUID() + ext;

    // Save file to local storage
    await this.ensureUploadDir();
    const filePath = path.join(this.uploadDir, storageKey);
    await fs.writeFile(filePath, file.buffer);

    // Save metadata to DB
    const attachment = await this.fileRepo.create({
      original_name: file.originalname,
      storage_key: storageKey,
      mime_type: file.mimetype,
      size: file.size,
      related_id: relatedId,
      related_type: relatedType,
      uploaded_by: user.userId,
    });

    logger.info(
      `[AUDIT] User ${user.username} uploaded file ${file.originalname} for ${relatedType} ${relatedId}`
    );

    return {
      id: attachment.id,
      originalName: attachment.original_name,
      mimeType: attachment.mime_type,
      size: attachment.size,
      relatedId: attachment.related_id,
      relatedType: attachment.related_type,
      uploadedBy: {
        id: user.userId,
        username: user.username,
      },
      createdAt: attachment.created_at,
    };
  }

  async getDownloadUrl(fileId: string) {
    const file = await this.fileRepo.findById(fileId);
    if (!file) throw AppError.notFound('文件不存在');

    // For local storage, return the relative path
    // In production with OSS, this would generate a signed URL
    const url = `/uploads/${file.storage_key}`;

    return {
      url,
      originalName: file.original_name,
      mimeType: file.mime_type,
      expiresIn: 300,
    };
  }

  async deleteFile(fileId: string, user: JwtPayload) {
    const file = await this.fileRepo.findById(fileId);
    if (!file) throw AppError.notFound('文件不存在');

    // Only uploader or admin can delete
    if (file.uploaded_by !== user.userId && user.role !== 'admin') {
      throw AppError.forbidden('只有上传者或管理员可以删除文件');
    }

    // Delete from local storage
    const filePath = path.join(this.uploadDir, file.storage_key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist on disk, continue with DB deletion
    }

    await this.fileRepo.delete(fileId);

    logger.info(
      `[AUDIT] User ${user.username} deleted file ${file.original_name} from ${file.related_type} ${file.related_id}`
    );

    return { message: '附件已删除' };
  }

  async getByRelated(relatedType: string, relatedId: string) {
    const files = await this.fileRepo.findByRelated(relatedType, relatedId);
    return files.map(toAttachmentResponse);
  }
}
