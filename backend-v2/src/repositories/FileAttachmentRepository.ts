import pg from 'pg';

export interface FileAttachmentRow {
  id: string;
  original_name: string;
  storage_key: string;
  mime_type: string;
  size: number;
  related_id: string;
  related_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface FileAttachmentWithUploader extends FileAttachmentRow {
  uploader_username: string;
}

export class FileAttachmentRepository {
  constructor(private pool: pg.Pool) {}

  async create(data: {
    original_name: string;
    storage_key: string;
    mime_type: string;
    size: number;
    related_id: string;
    related_type: string;
    uploaded_by: string;
  }): Promise<FileAttachmentRow> {
    const result = await this.pool.query(
      `INSERT INTO file_attachments (original_name, storage_key, mime_type, size, related_id, related_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.original_name,
        data.storage_key,
        data.mime_type,
        data.size,
        data.related_id,
        data.related_type,
        data.uploaded_by,
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<FileAttachmentRow | null> {
    const result = await this.pool.query(
      'SELECT * FROM file_attachments WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByRelated(
    relatedType: string,
    relatedId: string
  ): Promise<FileAttachmentWithUploader[]> {
    const result = await this.pool.query(
      `SELECT fa.*, u.username AS uploader_username
       FROM file_attachments fa
       JOIN users u ON u.id = fa.uploaded_by
       WHERE fa.related_type = $1 AND fa.related_id = $2
       ORDER BY fa.created_at DESC`,
      [relatedType, relatedId]
    );
    return result.rows;
  }

  async countByRelated(
    relatedType: string,
    relatedId: string
  ): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM file_attachments WHERE related_type = $1 AND related_id = $2',
      [relatedType, relatedId]
    );
    return result.rows[0].count;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM file_attachments WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
