import { Request, Response } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { FileAttachmentModel } from '../models/FileAttachment';
import { FileStorageService } from '../services/FileStorageService';
import { AuthenticatedRequest } from '../middleware/auth';

export class FileController {
  private static fileAttachmentModel: FileAttachmentModel;
  private static fileStorageService: FileStorageService;

  static initialize(db: Pool) {
    this.fileAttachmentModel = new FileAttachmentModel(db);
    this.fileStorageService = new FileStorageService();
  }

  // Configure multer for file upload
  static getUploadMiddleware() {
    const storage = multer.memoryStorage();
    
    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files per request
      },
      fileFilter: (req, file, cb) => {
        // Basic file type validation - detailed validation happens in controller
        const allowedMimeTypes = [
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
          'model/stl',
          'model/obj',
          'application/sla'
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`不支持的文件格式: ${file.mimetype}`));
        }
      }
    });
  }

  static async uploadFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const { relatedId, relatedType } = req.body;

      // Validate required fields
      if (!relatedId || !relatedType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '缺少必填字段: relatedId 和 relatedType'
          }
        });
        return;
      }

      // Validate relatedType
      if (!['inquiry', 'order'].includes(relatedType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RELATED_TYPE',
            message: 'relatedType 必须是 inquiry 或 order'
          }
        });
        return;
      }

      // Validate files exist
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES_UPLOADED',
            message: '没有上传任何文件'
          }
        });
        return;
      }

      const uploadedFiles = [];
      const errors = [];

      // Process each file
      for (const file of files) {
        try {
          // Validate file
          const validation = this.fileStorageService.validateFile({
            size: file.size,
            mimetype: file.mimetype,
            originalname: file.originalname
          });

          if (!validation.isValid) {
            errors.push({
              filename: file.originalname,
              error: validation.error
            });
            continue;
          }

          // Save file to storage
          const savedFile = await this.fileStorageService.saveFile({
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype
          });

          // Save file record to database
          const fileRecord = await this.fileAttachmentModel.create({
            filename: savedFile.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: savedFile.path,
            relatedId,
            relatedType,
            uploadedBy: req.user!.userId
          });

          uploadedFiles.push({
            id: fileRecord.id,
            filename: fileRecord.filename,
            originalName: fileRecord.originalName,
            size: fileRecord.size,
            mimeType: fileRecord.mimeType,
            url: this.fileStorageService.getFileUrl(fileRecord.filename),
            uploadedAt: fileRecord.uploadedAt
          });

        } catch (error) {
          console.error('File upload error for', file.originalname, ':', error);
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : '文件上传失败'
          });
        }
      }

      // Return response
      const response = {
        success: true,
        data: {
          uploadedFiles,
          errors: errors.length > 0 ? errors : undefined
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Upload files error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: '文件上传失败'
        }
      });
    }
  }

  static async getFilesByRelated(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { relatedId, relatedType } = req.params;

      // Validate relatedType
      if (!['inquiry', 'order'].includes(relatedType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RELATED_TYPE',
            message: 'relatedType 必须是 inquiry 或 order'
          }
        });
        return;
      }

      const files = await this.fileAttachmentModel.findByRelated(relatedId, relatedType as 'inquiry' | 'order');

      const filesWithUrls = files.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        url: this.fileStorageService.getFileUrl(file.filename),
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt
      }));

      res.status(200).json({
        success: true,
        data: filesWithUrls
      });

    } catch (error) {
      console.error('Get files by related error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FILES_ERROR',
          message: '获取文件列表失败'
        }
      });
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      // Get file record
      const file = await this.fileAttachmentModel.findById(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '文件不存在'
          }
        });
        return;
      }

      // Check permissions - only file uploader or admin can delete
      if (file.uploadedBy !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: '没有权限删除此文件'
          }
        });
        return;
      }

      // Delete file from storage
      const storageDeleted = await this.fileStorageService.deleteFile(file.path);
      if (!storageDeleted) {
        console.warn('Failed to delete file from storage:', file.path);
      }

      // Delete file record from database
      const dbDeleted = await this.fileAttachmentModel.delete(fileId);
      if (!dbDeleted) {
        res.status(500).json({
          success: false,
          error: {
            code: 'DELETE_ERROR',
            message: '删除文件记录失败'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '文件删除成功'
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: '删除文件失败'
        }
      });
    }
  }

  static async getFileInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      const file = await this.fileAttachmentModel.findById(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '文件不存在'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          url: this.fileStorageService.getFileUrl(file.filename),
          relatedId: file.relatedId,
          relatedType: file.relatedType,
          uploadedBy: file.uploadedBy,
          uploadedAt: file.uploadedAt
        }
      });

    } catch (error) {
      console.error('Get file info error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FILE_INFO_ERROR',
          message: '获取文件信息失败'
        }
      });
    }
  }

  static async serveFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      // Find file record in database
      const file = await this.fileAttachmentModel.findByFilename(filename);
      
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '文件不存在'
          }
        });
        return;
      }

      // Check if file exists on disk
      const fileStats = await this.fileStorageService.getFileStats(file.path);
      if (!fileStats.exists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND_ON_DISK',
            message: '文件在存储中不存在'
          }
        });
        return;
      }

      // Set appropriate headers
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', file.size);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);

      // Stream file to response
      const fileBuffer = await fs.readFile(file.path);
      res.send(fileBuffer);

    } catch (error) {
      console.error('Serve file error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVE_FILE_ERROR',
          message: '文件服务失败'
        }
      });
    }
  }

  static async downloadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      const file = await this.fileAttachmentModel.findById(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '文件不存在'
          }
        });
        return;
      }

      // Check if file exists on disk
      const fileStats = await this.fileStorageService.getFileStats(file.path);
      if (!fileStats.exists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND_ON_DISK',
            message: '文件在存储中不存在'
          }
        });
        return;
      }

      // Set download headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', file.size);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);

      // Stream file to response
      const fileBuffer = await fs.readFile(file.path);
      res.send(fileBuffer);

    } catch (error) {
      console.error('Download file error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_ERROR',
          message: '文件下载失败'
        }
      });
    }
  }
}