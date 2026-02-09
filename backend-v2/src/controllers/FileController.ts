import { Response } from 'express';
import { FileService } from '../services/FileService.js';
import { AuthRequest } from '../shared/types.js';
import { ok, created } from '../shared/response.js';
import { AppError } from '../shared/errors.js';

export class FileController {
  constructor(private fileService: FileService) {
    this.upload = this.upload.bind(this);
    this.getDownloadUrl = this.getDownloadUrl.bind(this);
    this.delete = this.delete.bind(this);
  }

  async upload(req: AuthRequest, res: Response) {
    const user = req.user!;
    const file = req.file;
    if (!file) {
      throw AppError.validation('请选择要上传的文件');
    }

    const { relatedId, relatedType } = req.body;

    const result = await this.fileService.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      relatedId,
      relatedType,
      user
    );

    res.status(201).json(created(result));
  }

  async getDownloadUrl(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const result = await this.fileService.getDownloadUrl(id);
    res.json(ok(result));
  }

  async delete(req: AuthRequest, res: Response) {
    const user = req.user!;
    const { id } = req.params;
    const result = await this.fileService.deleteFile(id, user);
    res.json(ok(result));
  }
}
