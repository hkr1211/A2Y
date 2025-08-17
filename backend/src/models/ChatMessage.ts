import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  senderId: string;
  content: string;
  translatedContent?: string;
  timestamp: Date;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatMessageData {
  relatedId: string;
  relatedType: 'inquiry' | 'order';
  senderId: string;
  content: string;
  translatedContent?: string;
}

export interface UpdateChatMessageData {
  content?: string;
  translatedContent?: string;
  isRead?: boolean;
}

export class ChatMessageModel {
  constructor(private db: Pool) {}

  async create(data: CreateChatMessageData): Promise<ChatMessage> {
    const id = uuidv4();
    const query = `
      INSERT INTO chat_messages (
        id, related_id, related_type, sender_id, content, translated_content
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      id,
      data.relatedId,
      data.relatedType,
      data.senderId,
      data.content,
      data.translatedContent || null
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToChatMessage(result.rows[0]);
  }

  async findById(id: string): Promise<ChatMessage | null> {
    const query = 'SELECT * FROM chat_messages WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToChatMessage(result.rows[0]);
  }

  async findByRelated(relatedId: string, relatedType: 'inquiry' | 'order'): Promise<ChatMessage[]> {
    const query = `
      SELECT cm.*, u.username as sender_username
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.related_id = $1 AND cm.related_type = $2
      ORDER BY cm.timestamp ASC
    `;
    
    const result = await this.db.query(query, [relatedId, relatedType]);
    return result.rows.map(row => this.mapRowToChatMessage(row));
  }

  async update(id: string, data: UpdateChatMessageData): Promise<ChatMessage | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.content !== undefined) {
      fields.push(`content = $${paramCount++}`);
      values.push(data.content);
    }

    if (data.translatedContent !== undefined) {
      fields.push(`translated_content = $${paramCount++}`);
      values.push(data.translatedContent);
    }

    if (data.isRead !== undefined) {
      fields.push(`is_read = $${paramCount++}`);
      values.push(data.isRead);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE chat_messages 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToChatMessage(result.rows[0]);
  }

  async markAsRead(relatedId: string, relatedType: 'inquiry' | 'order', userId: string): Promise<void> {
    const query = `
      UPDATE chat_messages 
      SET is_read = TRUE
      WHERE related_id = $1 AND related_type = $2 AND sender_id != $3 AND is_read = FALSE
    `;
    
    await this.db.query(query, [relatedId, relatedType, userId]);
  }

  async getUnreadCount(relatedId: string, relatedType: 'inquiry' | 'order', userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE related_id = $1 AND related_type = $2 AND sender_id != $3 AND is_read = FALSE
    `;
    
    const result = await this.db.query(query, [relatedId, relatedType, userId]);
    return parseInt(result.rows[0].count);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM chat_messages WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  async deleteByRelated(relatedId: string, relatedType: 'inquiry' | 'order'): Promise<number> {
    const query = 'DELETE FROM chat_messages WHERE related_id = $1 AND related_type = $2';
    const result = await this.db.query(query, [relatedId, relatedType]);
    return result.rowCount;
  }

  private mapRowToChatMessage(row: any): ChatMessage {
    return {
      id: row.id,
      relatedId: row.related_id,
      relatedType: row.related_type,
      senderId: row.sender_id,
      content: row.content,
      translatedContent: row.translated_content,
      timestamp: new Date(row.timestamp),
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}