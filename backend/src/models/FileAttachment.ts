import { Pool } from 'pg';
import { FileAttachment, CreateFileAttachmentData } from '../types/fileAttachment';

export class FileAttachmentModel {
  constructor(private db: Pool) {}

  async create(data: CreateFileAttachmentData): Promise<FileAttachment> {
    const query = `
      INSERT INTO file_attachments (
        filename, original_name, mime_type, size, path, 
        related_id, related_type, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      data.filename,
      data.originalName,
      data.mimeType,
      data.size,
      data.path,
      data.relatedId,
      data.relatedType,
      data.uploadedBy
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToFileAttachment(result.rows[0]);
  }

  async findById(id: string): Promise<FileAttachment | null> {
    const query = 'SELECT * FROM file_attachments WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFileAttachment(result.rows[0]);
  }

  async findByRelated(relatedId: string, relatedType: 'inquiry' | 'order'): Promise<FileAttachment[]> {
    const query = `
      SELECT * FROM file_attachments 
      WHERE related_id = $1 AND related_type = $2 
      ORDER BY uploaded_at DESC
    `;
    
    const result = await this.db.query(query, [relatedId, relatedType]);
    return result.rows.map(row => this.mapRowToFileAttachment(row));
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM file_attachments WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async findByUploader(uploadedBy: string): Promise<FileAttachment[]> {
    const query = `
      SELECT * FROM file_attachments 
      WHERE uploaded_by = $1 
      ORDER BY uploaded_at DESC
    `;
    
    const result = await this.db.query(query, [uploadedBy]);
    return result.rows.map(row => this.mapRowToFileAttachment(row));
  }

  async findByFilename(filename: string): Promise<FileAttachment | null> {
    const query = 'SELECT * FROM file_attachments WHERE filename = $1';
    const result = await this.db.query(query, [filename]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFileAttachment(result.rows[0]);
  }

  private mapRowToFileAttachment(row: any): FileAttachment {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      path: row.path,
      relatedId: row.related_id,
      relatedType: row.related_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: new Date(row.uploaded_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}